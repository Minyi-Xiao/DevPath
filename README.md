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
