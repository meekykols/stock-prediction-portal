# Prediction Web

Subscription platform for AI predictions on stocks, forex, commodities, crypto and football.

| Folder | What it is | Status |
| --- | --- | --- |
| `backend/` | Express + MongoDB (Mongoose) API, Socket.IO, scheduler | Phase 1 ✅ |
| `frontend/` | Customer site + dashboard (React, Tailwind v4, daisyUI 5, Redux Toolkit) | Phase 2 ✅ |
| `admin/` | Staff console (React, Tailwind v4, daisyUI 5, Redux Toolkit), permission-based | Phase 5 ✅ |
| `django-backend/` | Stateless ML microservice (market LSTM, sports Poisson model), called only by Express | Phase 3 ✅ |

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

# 3. Admin console → http://localhost:5174 (sign in with the create-admin account)
cd ../admin
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

Markets supported (all daily data from Yahoo Finance):

| Market | What users type | Fetched as |
| --- | --- | --- |
| Stocks | `AAPL`, `MTNN.LG`, `^GSPC` | as typed |
| Forex | `EUR/USD`, `eurusd`, `EURUSD=X` | `EURUSD=X` |
| Commodities | `Gold`, `Crude oil`, `GC=F` (curated list of 12) | futures, e.g. `GC=F` |
| Crypto | `BTC`, `btc-usd`, `BTC/USD` | `BTC-USD` (forecasts include weekends) |

```
Browser ──► Express /api/v1/predictions/* ──► Django /v1/* (X-Service-Key)
              │  checks plan quota              │  markets: Yahoo Finance + LSTM (Keras on JAX)
              │  saves result in MongoDB        │  sports: API-Football + Poisson goals model
```

- `POST /api/v1/predictions/markets` `{ assetClass, symbol, horizon }` and `POST /api/v1/predictions/sports` `{ fixtureId }`
- `GET /api/v1/markets/catalog`: suggested symbols per market
- `GET /api/v1/predictions`, `/predictions/:id`, `/predictions/usage`, `/sports/fixtures?date=YYYY-MM-DD`
- Daily quotas come from the plan (`limits.marketPredictionsPerDay`, shared by all four markets, and
  `limits.sportsPredictionsPerDay`; `-1` = unlimited) and reset at 00:00 UTC.
  Repeating the same ticker/fixture on the same day returns the saved result without using quota.
- Market results include price history with 100/200-day averages, a backtest on the last 30% of data,
  a recursive multi-day forecast, and metrics (R², RMSE, MAE, MAPE, directional accuracy).
- The model in `django-backend/ml_models/stock_lstm.keras` was trained on AAPL only
  (`Resources/stock_prediction_using_LSTM.ipynb`) and is applied to every market after per-series scaling.
  Its next-day direction accuracy is around 50% across stocks, forex, commodities and crypto,
  so the UI shows that figure prominently.

## Billing (Phase 4, Paystack)

Uses Paystack **Subscriptions**, so Paystack runs the recurring charges.

1. `POST /api/v1/billing/checkout { plan }`: creates the Paystack plan on first use, records a pending
   payment and returns Paystack's hosted checkout URL.
2. Paystack redirects to `<APP_URL>/app/billing/callback?reference=…`; the page calls
   `GET /api/v1/billing/verify/:reference`, which confirms the charge with Paystack (amount and
   currency are checked) and opens the subscription.
3. `POST /api/webhooks/paystack` (HMAC-SHA512 signature checked) handles `charge.success` (first payment
   and renewals), `subscription.create`, `subscription.not_renew`, `subscription.disable` and
   `invoice.payment_failed`. The callback and webhook paths are both idempotent.

Self-service: `GET /billing/summary`, `GET /billing/payments`, `POST /billing/cancel` (turns off
auto-renew, access continues to the period end), `POST /billing/resume`, `GET /billing/manage-card`.

- Switching plans starts the new plan immediately and cancels the old one at Paystack (no proration).
- Auto-renewing subscriptions keep access for 24 h past their end date while a renewal settles.
- Changing a plan's price/interval in the admin API makes checkout create a new Paystack plan;
  existing subscribers stay on their original price.
- Stale unpaid checkouts are marked abandoned hourly.

**Setup:** add `PAYSTACK_SECRET_KEY` and `APP_URL` to `backend/.env`, register
`https://<api-domain>/api/webhooks/paystack` as the webhook URL in the Paystack dashboard, then optionally
run `npm run paystack:sync` to create the Paystack plans up front. For local webhook testing, expose the
API with a tunnel (e.g. ngrok) and use that URL. `npm test` runs the billing unit tests.

## Admin console (Phase 5)

Pages: Dashboard (MRR, 30-day revenue and sign-ups, active plans, predictions today, service health),
Customers and customer detail (suspend, grant a complimentary plan, cancel subscriptions, payments),
Subscriptions, Payments, Plans (create/edit/archive, limits), Predictions, Messages, Staff and Site settings.

- `admin/src/routers/routes.jsx` is the single list that drives routes, the sidebar and permission checks.
  Staff only see sections their permissions allow; the API enforces the same permissions.
- Superadmins (created with `npm run create-admin`) manage staff accounts and permissions. Other staff
  cannot change staff accounts, including their own permissions.
- **Grant plan** gives a customer a paid plan free for N days (no renewal, no charge). Customers with an
  active Paystack subscription must be cancelled first.
- **Cancel subscription**: *At period end* turns off renewal at Paystack; *End access now* also removes
  access immediately. Refunds are issued from the Paystack dashboard.
- MRR counts auto-renewing Paystack subscriptions only, normalised to one month.

## Live chat and signals (Phase 6)

**Live chat.** Customers on plans with `limits.liveChat` (Pro, Elite) get a chat widget in the dashboard;
others see an upgrade prompt. Staff with the `chat.respond` permission answer from **Support chat** in the
admin console, with an unread badge, assignment, close/reopen and typing indicators.
Messages go through the REST API (`/api/v1/chat`, `/api/admin/chat/...`) for auth, validation and rate
limits; Socket.IO pushes them live. Socket rooms: `user:<id>`, `staff:chat` (chat staff) and `premium`.

**Signals.** Scheduled model runs published to a feed that Pro/Elite customers can open (free users see
titles with the outlook removed server-side). Signals don't count toward daily prediction quotas.

| Job | Schedule (UTC) | What it does |
| --- | --- | --- |
| market-signals | 21:30 daily | All four markets on weekdays, crypto only at weekends |
| sports-signals | 06:00 daily | Analyses today's upcoming fixtures (needs `API_FOOTBALL_KEY`) |
| expire / abandon | every 15 min / hourly | Lapses subscriptions, closes stale checkouts |

Manage the watchlist, run jobs manually and see run history under **Signals** in the admin console.
Premium customers get a live notification when new signals are published.
Run the scheduler on one instance only: set `RUN_SCHEDULER=false` on the others.

In production, if the API is on a different domain from the apps, set `VITE_SOCKET_URL` to the API origin
in `frontend/.env` and `admin/.env`, and allow WebSocket upgrades at your proxy for `/socket.io`.

## Roadmap

All six planned phases are done. Possible next steps: email notifications (receipts, chat replies),
retraining the market model for direction accuracy (ideally per asset class), a trained sports model, and deployment.
