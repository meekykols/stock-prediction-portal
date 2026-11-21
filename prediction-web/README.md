# Prediction Web

Subscription platform for AI stock and sports predictions.

| Folder | What it is | Status |
| --- | --- | --- |
| `backend/` | Express + MongoDB (Mongoose) API, Socket.IO, scheduler | Phase 1 ✅ |
| `frontend/` | Customer site + dashboard (React, Tailwind v4, daisyUI 5, Redux Toolkit) | Phase 2 ✅ |
| `admin/` | Staff console | Phase 5 |
| `django-backend/` | ML microservice (stock LSTM, sports models), called only by Express | Phase 3 |

## Run locally

Requires Node 20+ and MongoDB running locally (or an Atlas URI).

```bash
# 1. Backend  → http://localhost:5050
cd backend
npm install
cp .env.example .env        # then set JWT secrets (see comment in the file)
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

## Roadmap

3. Django ML service: JSON chart data instead of PNGs, internal API key, sports endpoint (API-Football)
4. Paystack checkout, webhooks, plan-based limits
5. Admin console
6. Live chat (Socket.IO) and scheduled prediction runs
