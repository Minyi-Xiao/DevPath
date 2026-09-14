# DevPath

AI-assisted developer training platform. Upload a PDF, review generated knowledge cards, save them to a topic, then practice with multiple-choice questions.

## Project structure

```text
DevPath/
├── client/          # React + Vite frontend
├── server/          # Express + TypeScript API
├── package.json     # workspace scripts
├── README.md
├── .gitignore
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

- Set `NODE_ENV=production`
- Set `CLIENT_URL` to the real frontend origin
- Set `AUTH_COOKIE_SECURE=true` (and `AUTH_COOKIE_SAMESITE=none` only if the API and UI are on different sites)
- Run `npx prisma migrate deploy` against the production database
- Keep `UPLOAD_DIR` on persistent disk
- Confirm `OPENAI_API_KEY` is present; upload/analysis/practice generation are rate-limited per user
