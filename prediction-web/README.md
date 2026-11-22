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

## Daily sports tips

A public tips page (`/tips`, also `/app/tips` in the dashboard) lists model picks for **football, basketball,
American football, volleyball and MMA**, grouped by league, for yesterday, today and tomorrow. Every tip is
settled against the final result, and the page shows the 30-day hit rate.

| Sport | Model (Django, `sports/services/ratings/`) | Tip | Extra markets |
| --- | --- | --- | --- |
| Football | Dixon–Coles attack/defence ratings | 1 / X / 2 + score | Over/under 2.5, both teams to score |
| Basketball, American football | Offence/defence points ratings | Winner + score | Over/under the league's typical total |
| Volleyball | Per-set team ratings (best of five) | Winner + set score | Over/under 3.5 sets |
| MMA | Fighter Elo | Winner | — |

Every model is fitted per competition on this season and last (recent games weighted more). Walk-forward
backtest on the 2024 seasons (each game predicted only from earlier results):

| | Tips correct | High-confidence tips correct |
| --- | --- | --- |
| Premier League / La Liga | 52% / 51% | 68% / 73% |
| NBA | 65% | 83% |
| NFL | 64% | 67% |
| SuperLega volleyball | 76% | 82% |
| UFC | 60% | — |

| Job | Schedule (UTC) | What it does |
| --- | --- | --- |
| sports-tips | 05:00 and 15:00 | Tips for today and tomorrow; refreshes unstarted tips, never changes started ones |
| tips-settle | hourly at :20 | Settles finished events: won / lost / void (postponed, ties on winner tips) |

**Admin console → Sports tips:** turn sports on or off, pick leagues (search by name), choose which plans see
every tip (the others, guests included, get a free preview per sport per day; finished matches are always
visible), set what counts as a "Top tip", run either job, see the hit rate, and correct a result by hand.
Staff need the `tips.manage` permission.

**Data plan.** One API-Sports key (`API_FOOTBALL_KEY`) works for all five sports, but each sport is a separate
subscription. Free plans only return yesterday–tomorrow and seasons up to 2024, so they can't rate teams for
the current season: generation then reports `plan_restricted` per league in the run log. A paid plan is needed
for each sport you switch on.

## Booking codes

Staff with the `codes.manage` permission post bookmaker booking codes from **Admin console → Booking codes**:
platform, code, total odds, a note, and the selections. Selections are picked from upcoming tips (1X2, winner,
double chance, over/under, both teams to score) or typed in by hand. A code expires at its first kick-off
(or a time staff set when no selection has one) and can't be changed after that, apart from the note and odds.

- **Customers** (`/app/codes`): live codes with one-tap copy and a link to the bookmaker, plus a Results tab
  for the last 14 days. Plans switched off in settings see a locked card (odds and number of selections only);
  codes unlock for everyone once the first match starts, so the track record is public.
- **Settlement:** selections linked to tips settle from the tip's final score in the hourly `tips-settle` job,
  using accumulator rules (one lost selection loses the code; void selections drop out). Hand-typed selections
  are marked by staff, and staff can override any code's result.
- **Settings:** the betting platform list (name, website, colour, on/off), which plans see live codes, and
  an on/off switch for the feature. The page also shows the hit rate and copy counts by platform and by staff.

## Picks contest

Customers enter **one slip a day** at `/app/contest`, picking the result (1/X/2 in football, winner elsewhere)
for matches on that day's tips list.

- **Slip size:** between the minimum and maximum set in the console (default 10–20). On quiet days the
  minimum drops to the number of matches on the day's list. Only matches that haven't started can be picked,
  and a slip is final once entered.
- **Scoring:** 1 point per correct pick; a slip with no wrong picks has its points multiplied (default ×2).
  Postponed matches and ties are void: they don't score and don't spoil a perfect slip. Slips settle in the
  hourly `tips-settle` job.
- **Leaderboard:** monthly (UTC). Ties go to more perfect slips, then more correct picks, then whoever got
  there first. Customers see first name and surname initial only.
- **Who can enter:** paid plans always; a console switch decides for free (Starter) users.
- **Rewards (Admin console → Picks contest):** once a month ends, staff with `contest.manage` give any player
  a **cash prize** (recorded, paid by transfer, then marked paid), a **free Elite plan** (granted immediately),
  or an **advert spot**. An advert starts as a draft; staff add an image, text, link and dates, then approve it.
  Live adverts show on the home, tips and contest pages, labelled "Sponsored", and come down at their end date.
- **Training data:** the console exports picks as CSV (one row per pick, with the model's pick and the result).
  Customers appear only as a stable pseudonymous code.

## Model quality (step 4)

**Markets: likely ranges.** A walk-forward test (2020–2025, 23 instruments, each year predicted from earlier
years only) found no model that calls next-day or next-week direction better than "always guess the usual
direction": stocks 52.5% vs 52.8%, forex 50.1% vs 50.9%, commodities 52.0% vs 52.5%, crypto 52.0% vs 51.4%.
Move *size* is predictable, so every market prediction now includes 50/80/95% likely ranges for each forecast
day (`markets/services/ranges.py`: RiskMetrics volatility plus the instrument's own fat-tailed history).
The 80% range held 78–80% of the time across asset classes. Each result shows that instrument's own 3-year
record and warns when it's below 70% (e.g. USD/NGN, 49%, because of devaluations). The direction hit rate is
shown next to how often the price simply rose, and the page flags when the LSTM target falls outside the range.

**Sports: calibration and backtests.** `python manage.py backtest_sports --data DIR [--fetch sport:league:season,...]`
runs the walk-forward test and prints accuracy, log loss, a calibration table and results by confidence label;
`--fit-calibration` suggests the per-sport calibration powers in `sports/services/ratings/__init__.py`.
On the 2024 seasons the raw models were already close to honest (football calibration error 2.1 points,
NBA 1.4). Tuning the football decay and shrinkage moved accuracy by under 1 point, which is within noise.
"Top tip" (high confidence) results after calibration:

| | Matches | All tips | Top tips |
| --- | --- | --- | --- |
| Football (EPL, La Liga, Serie A, Bundesliga, Ligue 1) | 1,756 | 51.7% | 69.2% |
| NBA | 1,377 | 65.2% | 82.2% |
| NFL | 318 | 64.2% | 76.0% |
| SuperLega volleyball | 178 | 75.8% | 82.1% |
| UFC | 513 | 59.5% | none: MMA showed no edge by confidence, so it's rarely rated above low |

**Bookmaker odds.** Each tip can carry the bookmakers' consensus: the median price across bookmakers
(API-Sports `/odds`, one request per match, cached 2 hours), turned into chances with the margin removed.
- *Combined:* published chances = market share × bookmakers + (1 − share) × model (default share 60%, set in
  Admin → Sports tips).
- *Bookmakers only:* when the model can't rate a competition (e.g. the free plan doesn't cover this season),
  the tip uses the consensus alone and is labelled "Bookmakers". This makes the tips page work on the free plan.
- *Value:* flagged when our model rates an outcome at least 5 points above the bookmakers (prices up to 10.0).
- *Track record at real prices:* settled tips record profit or loss per 1-unit stake at the consensus price, and the
  tips page and admin show the return on stake. Admin → Sports tips → "Model vs bookmakers" measures which market
  share would have scored best on settled tips (trust it after ~300 matches).
- *Quota:* "Odds requests per sport per day" (default 40) caps calls per run; free plans allow 100 a day per sport.
  On the free plan, odds came back for football, basketball and American football; none for the volleyball match tested.

**Next gains need more data:** bookmaker odds as a model input (paid API-Sports plans), and the contest's crowd
picks once a few months have been collected (the admin CSV export has the model pick next to each customer pick).

## Roadmap

All six planned phases are done, plus daily tips, booking codes and the picks contest. Next: better models
(tuning the bookmaker share from settled tips, and the contest's crowd picks once a few months are collected).
