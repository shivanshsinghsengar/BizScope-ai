# 🚀 BizScope AI

Free AI-powered market analysis and competitor research tool for Indian entrepreneurs.

**Live:** https://biz-scope-ai.vercel.app

---

## Structure

```
BizScopeAI/
├── backend/          Node.js + Express API (deployed on Render)
│   ├── server.js     Main server — all API routes
│   ├── routes_new_features.js  Scorecard, Revenue, Compare Cities
│   └── .env          API keys (never commit)
└── frontend/         Next.js app (deployed on Vercel)
    ├── pages/        All page routes
    ├── components/   Reusable UI components
    ├── context/      Auth + Theme context
    ├── hooks/        Custom hooks (useAnalysis)
    ├── utils/        API helper
    └── public/       Static files
```

---

## Local Development

**Backend:**
```bash
cd backend
npm install
# .env is already configured
npm run dev        # runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
# .env.local already points to localhost:5000
npm run dev        # runs on http://localhost:3000
```

---

## Environment Variables

**backend/.env** — all keys stored here, never exposed to browser
**frontend/.env.local** — only `NEXT_PUBLIC_API_URL` (backend URL)

---

## Deployment

- Frontend → Vercel (auto-deploy on push to main)
- Backend → Render (auto-deploy on push to main)
- Database → Neon (serverless PostgreSQL, free tier)
