# Pipilika — ThePipilika.com

Full bakery system: online shop, custom cake designer, customer panel, seller POS, inventory, suppliers, double-entry accounts, reports, chat + WhatsApp, block-based site editor, SEO and analytics. Versioned API (`/api/v1`) ready for the Flutter app.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS · PostgreSQL + Prisma · zod · JWT cookie sessions (Bearer for mobile).

## Run locally

```bash
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET
npm install
npx prisma migrate deploy     # create tables
npm run db:seed               # demo data (wipes the database!)
npm run dev                   # http://localhost:3000
```

Demo logins (password `Pipilika@2026`): `owner@thepipilika.com`, `seller@thepipilika.com`, `accounts@thepipilika.com` at `/staff-login`.
Customer: `/login` with `01711111111` (with `OTP_DEV_SHOW=true` the code is shown on screen).

Tests: `npm test` (pricing engine, coupons, ledger, OTP normalisation). Type check: `npx tsc --noEmit`.

## Main areas

| URL | What |
|---|---|
| `/`, `/shop`, `/product/[slug]`, `/cart`, `/checkout` | Storefront with modifiers, live coupon, delivery zones |
| `/custom-cake` | Cake designer: optional photo, gallery design, text-only, theme topper, shapes (preset / number / letter / freehand), weight, flavour, board, live price, print PNG/PDF |
| `/o/[token]` | Secure order page: timeline, approve quote, pay (bKash/Nagad/Bangla QR/bank) with proof |
| `/account` | Orders, designs, wishlist, addresses, notifications, profile, delete account |
| `/admin` | Dashboard, orders + custom quotes, payment verification, products, cake pricing matrix, gallery, coupons & zones, customers CRM, chats, inventory, purchases & suppliers, expenses, ledger / trial balance / cash closing / P&L, reports (CSV + PDF), reviews, site editor, settings & SEO, staff & roles, audit log |
| `/pos` | Counter sale (cash/bKash/…, discount, change, due) and custom-cake order with advance + share link |
| `/api/v1/*` | JSON API used by web and the mobile app |

Permissions are role-based (`src/lib/permissions.ts`); every admin API and page checks them.

## Payments

Manual-verification flow is built in (customer sends money, enters TrxID/proof, staff verifies → ledger posts). Card/bKash gateway checkout can be plugged in later; method instructions and the Bangla QR image are editable in **Admin → Settings → Payments**.

## Integrations (all optional, see `.env.example`)

SMTP email + HTTP SMS gateway for OTP (codes print to the server log when empty), hCaptcha, remove.bg, S3/R2 storage, WhatsApp Cloud API, GA4 / GTM / Meta Pixel (Admin → Settings).

## Deploy

See **DEPLOY_BANGLA.md** (Railway) or **HOSTINGER_BANGLA.md** (Hostinger Node.js hosting + Neon Postgres), both in Bangla. `npm run build` applies migrations and loads starter data only when the database is empty. Short version:

- **Railway (recommended):** new project → deploy from GitHub repo (uses `Dockerfile` + `railway.json`) → add PostgreSQL → add a Volume mounted at `/data` → set env vars → open a shell and run `npm run db:seed` once (optional demo data) → add custom domain.
- **Render:** `render.yaml` blueprint (web + Postgres + disk).
- **Vercel:** works for the app, but uploads need `STORAGE_DRIVER=s3` (no persistent disk) and an external Postgres (Neon/Supabase/Railway).

Production env: `DATABASE_URL`, `AUTH_SECRET` (long random), `NEXT_PUBLIC_SITE_URL=https://thepipilika.com`, `OTP_DEV_SHOW=false`, plus SMS/SMTP keys so customers receive OTP codes.

**Before going live:** change all demo passwords (Admin → Staff & roles), replace demo products/images, set real payment numbers and QR, and do not run the seed on a live database (it deletes data).
