# Prediction Web

Subscription platform for AI stock and sports predictions.

| Folder | What it is | Status |
| --- | --- | --- |
| `backend/` | Express + MongoDB (Mongoose) API, Socket.IO, scheduler | Phase 1 ✅ |
| `frontend/` | Customer site + dashboard (React, Tailwind v4, daisyUI 5, Redux Toolkit) | Phase 2 ✅ |
| `admin/` | Staff console | Phase 5 |
| `django-backend/` | Stateless ML microservice (stock LSTM, sports Poisson model), called only by Express | Phase 3 ✅ |

## Run locally

Requires Node 20+, Python 3.13 and MongoDB running locally (or an Atlas URI).

```bash
# 0. ML service → http://127.0.0.1:8000
cd django-backend
python3.13 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env        # set SECRET_KEY, ML_SERVICE_API_KEY, API_FOOTBALL_KEY
.venv/bin/python manage.py test tests
.venv/bin/python manage.py runserver 127.0.0.1:8000

# 1. Backend  → http://localhost:5050
cd backend
npm install
cp .env.example .env        # set JWT secrets, and ML_SERVICE_API_KEY to the same value as django-backend/.env
npm run seed                # default plans + site config
npm run create-admin -- --email you@example.com --first Ada --last Obi
npm run dev

# 2. Frontend → http://localhost:5173 (proxies /api to :5050)
cd ../frontend
npm install
npm run dev
```

> The API uses port **5050** because macOS reserves 5000 for AirPlay Receiver.

## Site config

Site name, logo, contact details, socials, currency, SEO, legal disclaimer, an
announcement bar and maintenance mode all live in one `SiteConfig` document.

- Public read: `GET /api/v1/site-config`
- Staff edit: `PUT /api/admin/site-config` (permission `settings.manage`), logo upload at
  `POST /api/admin/site-config/images/:field` (Cloudinary)
- Frontend: `useSiteConfig()` hook, used by the navbar, footer, contact page, auth
  screens, dashboard sidebar, page titles, meta description and favicon.

## Auth

- Short-lived access token (15 min) in memory, refresh token in an httpOnly cookie
  scoped to `/api/v1/auth` (customers) or `/api/admin/auth` (staff).
- Refresh tokens rotate on every use; replaying an old one revokes all sessions.
- Customer and staff tokens use different JWT audiences, so a customer token can never
  call `/api/admin`.

## API overview

Customer (`/api/v1`): `site-config`, `plans`, `contact`, `auth/{register,login,refresh,logout,me}`,
`account/{profile,password,avatar,subscriptions}`.

Admin (`/api/admin`): `auth/*`, `site-config`, `plans` (CRUD, archive), `users`, `staff`, `messages`.

## Predictions (Phase 3)

```
Browser ──► Express /api/v1/predictions/* ──► Django /v1/* (X-Service-Key)
              │  checks plan quota              │  stocks: Yahoo Finance + LSTM (Keras on JAX)
              │  saves result in MongoDB        │  sports: API-Football + Poisson goals model
```

- `POST /api/v1/predictions/stocks` `{ ticker, horizon }` and `POST /api/v1/predictions/sports` `{ fixtureId }`
- `GET /api/v1/predictions`, `/predictions/:id`, `/predictions/usage`, `/sports/fixtures?date=YYYY-MM-DD`
- Daily quotas come from the plan (`limits.stockPredictionsPerDay`, `-1` = unlimited) and reset at 00:00 UTC.
  Repeating the same ticker/fixture on the same day returns the saved result without using quota.
- Stock results include price history with 100/200-day averages, a backtest on the last 30% of data,
  a recursive multi-day forecast, and metrics (R², RMSE, MAE, MAPE, directional accuracy).
- The stock model in `django-backend/ml_models/stock_lstm.keras` was trained on AAPL only
  (`Resources/stock_prediction_using_LSTM.ipynb`). Its next-day direction accuracy is around 50%,
  so the UI shows that figure prominently.

## Roadmap

4. Paystack checkout, webhooks, plan-based limits
5. Admin console
6. Live chat (Socket.IO) and scheduled prediction runs
