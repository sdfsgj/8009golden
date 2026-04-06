# MediGuide Demo

A lightweight `Next.js` classroom prototype for:

- symptom understanding
- drug efficacy explanation
- safety-aware triage reminders
- fixed medical disclaimers

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Set `SILICONFLOW_API_KEY` in `.env.local` if you want to use the `/api/ask` route.
Never commit `.env.local` or any real API key to GitHub. The repo is configured to ignore local env files.

## Knowledge files

The app reads local JSON files from:

- `data/knowledge/symptoms.json`
- `data/knowledge/drugs.json`
- `data/knowledge/triage_rules.json`
- `data/knowledge/disclaimers.json`

## Deploy

1. Push this folder to a GitHub repository.
2. Import the repo into Vercel.
3. In Vercel Project Settings, add `SILICONFLOW_API_KEY` and optionally `SILICONFLOW_BASE_URL` and `SILICONFLOW_MODEL`.
   Recommended base URL: `https://api.siliconflow.com/v1`
4. Keep the default Next.js build settings.

If you do not configure `SILICONFLOW_API_KEY`, the local classifier demo will still work, but the model enhancement button will return an error until the server env var is set.
