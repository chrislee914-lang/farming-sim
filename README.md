# Aria — ChatGPT-style AI chat (OpenAI)

A ChatGPT-like chat app powered by OpenAI for answers and visible reasoning.

## Setup

1. Copy `.env.example` to `.env`
2. Set `OPENAI_API_KEY=sk-...`
3. Optional: set `OPENAI_MODEL=gpt-4o-mini` (or another chat model)

```bash
npm install
npm run dev
```

- Web UI: `http://localhost:5173`
- API: `http://localhost:3001`

The API key stays on the server and is never exposed to the browser.

## Scripts

- `npm run dev` — API + Vite together
- `npm run build` — production frontend build
- `npm start` — API only
