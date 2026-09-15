# DevPath

AI-assisted developer training platform. Upload a PDF, review generated knowledge cards, save them to a topic, then practice with multiple-choice questions.

## Project structure

```text
DevPath/
├── client/                 # React + Vite frontend
├── server/                 # Express + TypeScript API
├── infra/aws/              # CloudFormation and deploy scripts
├── Dockerfile              # production image (UI + API)
├── docker-compose.yml      # local production-like run
├── docker-compose.aws.yml  # EC2 stack (app + Postgres + Caddy)
├── package.json
├── README.md
└── LICENSE
```

## Architecture

**Frontend:** page → React Query hook → API module → Axios

**Backend:** route → controller → service

## Requirements

- Node.js 18.18+
- npm 10+
- PostgreSQL

## Setup

```bash
npm install
```

Copy the example environment files if you do not already have local `.env` files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Apply database migrations from `server/`:

```bash
npm run prisma:migrate -w server
```

## Scripts

From the repository root:

```bash
npm run dev          # start client and server together
npm run dev:client   # frontend only (http://localhost:5173)
npm run dev:server   # API only (http://localhost:3000)
npm run build        # typecheck/build both workspaces
```

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `client/.env` | Frontend API base URL (`http://localhost:3000/api`) |
| `NODE_ENV` | `server/.env` | Use `production` when deploying |
| `PORT` | `server/.env` | API port |
| `CLIENT_URL` | `server/.env` | Allowed CORS origin. Production only allows this origin |
| `JWT_SECRET` | `server/.env` | At least 32 characters |
| `AUTH_COOKIE_SECURE` | `server/.env` | Set `true` behind HTTPS |
| `RATE_LIMIT_ENABLED` | `server/.env` | Defaults on in production. Set `true`/`false` to override |
| `UPLOAD_DIR` | `server/.env` | PDF storage directory (resolved to an absolute path) |
| `OPENAI_API_KEY` | `server/.env` | Required for document analysis and practice-question generation |
| `OPENAI_MODEL` | `server/.env` | Chat model. Default: `gpt-4o-mini` |
| `OPENAI_BASE_URL` | `server/.env` | OpenAI-compatible base URL. Default: `https://api.openai.com/v1` |
| `SITE_ACCESS_PASSWORD` | `server/.env` | Shared site lock. Empty disables it. Production turns it on when set |
| `SITE_GATE_ENABLED` | `server/.env` | Set `true` to preview the lock screen locally |

## Document analysis with OpenAI

Document analysis and practice-question generation run only on the Express server. The frontend never calls OpenAI.

Local setup:

1. Create an API key at https://platform.openai.com/api-keys
2. Put the key in `server/.env`. Do not commit it.

```env
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

## Production checklist

The production image serves the Vite build and the API from the same origin (`/api`). Auth cookies stay first-party (`SameSite=Lax`).

- Set `NODE_ENV=production`
- Set `CLIENT_URL` to the public site origin, or rely on `RENDER_EXTERNAL_URL` / `RAILWAY_PUBLIC_DOMAIN`. On AWS, `deploy.ps1` writes `CLIENT_URL` from the Elastic IP unless you set a domain.
- Set `AUTH_COOKIE_SECURE=true` on HTTPS (and `AUTH_COOKIE_SAMESITE=none` only if the API and UI are on different sites)
- Run `npx prisma migrate deploy` against the production database (the Docker image does this on start)
- Keep `UPLOAD_DIR` on persistent disk
- Confirm `OPENAI_API_KEY` is present; upload/analysis/practice generation are rate-limited per user
- Set `SITE_ACCESS_PASSWORD` so the public URL shows a lock screen before any API (including register) can be used

### Docker

`server/.env` must contain `JWT_SECRET` (32+ characters) and `OPENAI_API_KEY`. Compose overrides `DATABASE_URL` to the bundled Postgres service.

```bash
docker compose up --build
```

App: http://localhost:8080 (port 8080 so it can run next to `npm run dev`)

### AWS (Docker + EC2)

The production image is pushed to ECR and run on one EC2 host with Docker Compose (app + Postgres + Caddy). Estimated cost is about US$15–20/month for `t3.small` in `ap-southeast-2`. Docker Desktop must be running on this machine for the image build.

One-time AWS login:

```powershell
aws configure
```

Use an IAM user that can manage CloudFormation, EC2, ECR, and IAM (for a personal account, `AdministratorAccess` is the simplest). Default region: `ap-southeast-2`.

Create the stack (key pair, ECR, EC2, Elastic IP):

```powershell
.\infra\aws\bootstrap.ps1 -KeyName devpath
```

Copy `infra/aws/env.example` to `infra/aws/.env` if needed, then set at least:

```env
OPENAI_API_KEY=...
SITE_ACCESS_PASSWORD=...
```

`JWT_SECRET` and `POSTGRES_PASSWORD` can be left empty; `deploy.ps1` generates them. Then build, push, and start:

```powershell
.\infra\aws\deploy.ps1
```

The script uses EC2 Instance Connect, so `-KeyPath` is optional. After a successful deploy, open `http://<elastic-ip>`. Visitors must enter `SITE_ACCESS_PASSWORD` before they can register or use the app. `/api/health` stays public.

To attach a domain later, point an A record at the Elastic IP and set in `infra/aws/.env`:

```env
CLIENT_URL=https://your.domain
SITE_ADDRESS=your.domain
AUTH_COOKIE_SECURE=true
```

Then rerun `deploy.ps1`. Caddy will request a Let's Encrypt certificate.

Tear the stack down when you do not need it (stops billing):

```powershell
.\infra\aws\destroy.ps1
```

### Render / Railway

- Render: use `render.yaml` (Web + Postgres + disk at `/data`). Set `OPENAI_API_KEY` in the dashboard.
- Railway: use `railway.toml`. Add a Postgres plugin, a volume mounted at `/data`, and the same env vars as the checklist.
