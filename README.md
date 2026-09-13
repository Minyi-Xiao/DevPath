# DevPath

AI-assisted developer training platform.

This repository currently contains only the project foundation: a React frontend and an Express API in an npm workspaces monorepo. Product features will be added incrementally.

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

The only implemented endpoint is `GET /api/health`, used to confirm that the frontend and backend can talk to each other.

## Requirements

- Node.js 18.18+
- npm 10+

## Setup

```bash
npm install
```

Copy the example environment files if you do not already have local `.env` files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
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
| `PORT` | `server/.env` | API port |
| `CLIENT_URL` | `server/.env` | Allowed CORS origin |
| `OPENAI_API_KEY` | `server/.env` | Required for document analysis and practice-question generation |
| `OPENAI_MODEL` | `server/.env` | Chat model. Default: `gpt-4o-mini` |
| `OPENAI_BASE_URL` | `server/.env` | OpenAI-compatible base URL. Default: `https://api.openai.com/v1` |

## Document analysis with OpenAI

Document analysis runs only on the Express server. The frontend never calls OpenAI.

Local setup:

1. Create an API key at https://platform.openai.com/api-keys
2. Put the key in `server/.env`. Do not commit it.

```env
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```
