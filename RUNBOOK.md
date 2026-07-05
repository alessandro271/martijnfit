# Martijnfit — Setup & Deploy Runbook

A complete, copy-paste-friendly guide to take Martijnfit from this repo to a live
website you and Martijn can use. Written for a non-expert — follow the sections
**in order**; each step says exactly where to click.

Set aside about **30–45 minutes**. You'll use these free accounts (most you may
already have): **GitHub**, **Vercel**, **Supabase**, **Strava**, plus a
pay-per-use **Anthropic** key. **No Google Cloud setup is needed** — login is by
email magic-link. (Google Calendar is an *optional* add-on, see Appendix A.)

> Tip: keep a note open called **"Martijnfit secrets"**. Every time this guide
> says "copy this value", paste it there with a label. You'll need them together
> in Step 4.

---

## 0. Overview — how the app is wired

| Piece | What it does | Who hosts it |
|-------|--------------|--------------|
| **The app** (this repo) | The website — UI, pages, server logic | **Vercel** |
| **Database + login** | Stores activities/profile; emails login links | **Supabase** (Postgres + Auth) |
| **Strava** | Pulls your real workouts in to fill the heatmap | Your Strava account |
| **Claude (Anthropic)** | The AI coach | Anthropic API |
| **Google Calendar** | *Optional, later* — reads busy times to plan around | Appendix A |

**How they connect:** Vercel runs the app. The app uses Supabase for data + login
(Supabase emails Martijn a one-click login link). The app talks to Strava and
Anthropic with secret keys you'll create. All keys live in **environment
variables** (Step 4).

### Demo mode (reassuring)

With **no environment variables set**, the app runs in **DEMO mode**: fake sample
data, no login, nothing saved — by design. So `npm run dev` works right now before
any setup, and a misconfigured key falls back to demo instead of crashing. "Going
live" just means filling in the environment variables.

### The order we'll build it

1. **Supabase** (database + email login) — get 3 keys, run the schema, set URLs.
2. **Strava** — get 2 keys.
3. **Anthropic** — get 1 key.
4. Collect env vars.
5. Deploy to Vercel + wire the live URL back.
6. First run.

---

## 1. Supabase — database & email login

### 1.1 Create the project
1. Go to **https://supabase.com** → **Sign in** (with GitHub is easiest) → **New project**.
2. Pick/create an organization (Free plan).
3. Fill in:
   - **Name:** `martijnfit`
   - **Database Password:** click **Generate a password**, copy it to your note ("Supabase DB password") and keep it.
   - **Region:** the one closest to you (e.g. *Central EU (Frankfurt)*).
4. **Create new project.** Wait ~2 minutes.

### 1.2 Create the tables (run the schema)
1. Left sidebar → **SQL Editor** → **+ New query**.
2. Open **`supabase/schema.sql`** from this repo, select all (Cmd+A), copy.
3. Paste into the editor → **Run** (Cmd+Enter).
4. You should see **"Success. No rows returned"** — correct, it just made tables.

> The schema is **idempotent** — 100% safe to re-run any time; it won't delete
> data. It also installs a trigger that auto-creates a profile the first time
> anyone signs in, so you never manage users by hand.

### 1.3 Copy your three Supabase keys
1. Left sidebar → **Project Settings** (gear) → **API**.
2. Copy into your note:

   | Label | Where | Looks like |
   |---|---|---|
   | **Supabase URL** | "Project URL" | `https://abcdxyz.supabase.co` |
   | **Supabase anon key** | API keys → `anon` `public` | long `eyJ...` |
   | **Supabase service_role key** | API keys → `service_role` `secret` (reveal) | another long `eyJ...` |

> **The `service_role` key bypasses all security.** It lives ONLY in server env
> vars — never in client code, never committed, never shared.

### 1.4 Confirm email login is on
1. Left sidebar → **Authentication** → **Sign In / Providers** (older UI: **Providers**).
2. Make sure **Email** is **enabled** (it is by default). That's all — no Google, no passwords; the app uses one-click **magic links**.

### 1.5 Set the Auth URLs (where users may land)
Still under **Authentication** → **URL Configuration**:
1. **Site URL:** set to `http://localhost:3000` for now. **You'll change it to your Vercel URL after Step 5.**
2. **Redirect URLs** → **Add URL** — add both:
   - `http://localhost:3000/auth/callback`
   - `https://martijnfit.vercel.app/auth/callback` *(placeholder — fix to your real Vercel URL after Step 5)*
3. **Save.**

> Any URL the login link tries to return to must be on this allow-list, or login
> silently fails. The path is your app's own **`/auth/callback`** page.

---

## 2. Strava — pull in real workouts

1. Be logged in to **your Strava account**, then go to **https://www.strava.com/settings/api**.
2. Fill the **"My API Application"** form:
   - **Application Name:** `Martijnfit`
   - **Category:** `Training`
   - **Website:** `https://martijnfit.vercel.app` (or `http://localhost:3000`)
   - **Authorization Callback Domain:** `localhost` *(start with localhost; you'll switch to your Vercel domain in Step 5.5)*
3. Agree + **Create**. Copy into your note:
   - **Strava Client ID** (small number)
   - **Strava Client Secret** (long hex — click "Show")

> **Strava wants a DOMAIN, not a URL.** In "Authorization Callback Domain" type
> just the host — `martijnfit.vercel.app` or `localhost` — **no `https://`, no
> path, no port**. Only one domain is allowed, so use `localhost` for dev and
> switch to your Vercel domain after deploy (Step 5.5).

---

## 3. Anthropic — the AI coach (Claude)

1. Go to **https://console.anthropic.com**, sign in.
2. **Settings → Billing** → add a card and buy a little credit (e.g. **$5**).
3. **Settings → API Keys → Create Key**, name it `martijnfit`.
4. **Copy the key now** (`sk-ant-...`) into your note — it's shown once.

> **Cost:** billed **per message** (Claude Sonnet, ~a fraction of a cent each).
> For two people, a few cents to ~$1/month. Set a monthly spend cap in Billing if
> you like.

---

## 4. Collect your environment variables

The **complete list** the app uses (mirrors `.env.example`):

| Variable | From | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Step 1.3 — Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Step 1.3 — anon key | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 1.3 — service_role key | **SECRET (server only)** |
| `NEXT_PUBLIC_SITE_URL` | Local `http://localhost:3000`; Prod = your Vercel URL (Step 5) | public |
| `STRAVA_CLIENT_ID` | Step 2 | public-ish |
| `STRAVA_CLIENT_SECRET` | Step 2 | **SECRET** |
| `ANTHROPIC_API_KEY` | Step 3 | **SECRET** |

That's **7 variables**. (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` exist in
`.env.example` but are **optional** — leave them blank unless you do Appendix A.)

> `NEXT_PUBLIC_` values are safe in the browser. Everything without that prefix is
> server-only and must stay secret.

### 4a. Local development (optional)
```bash
cp .env.example .env.local      # then fill in real values; keep NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
`.env.local` is git-ignored — it will never be committed.

---

## 5. Deploy to Vercel

The repo is already on **GitHub (public)**.

### 5.1 Import
1. **https://vercel.com** → **Log in with GitHub** → **Add New… → Project**.
2. Find **`martijnfit`** → **Import**. (If missing, **Adjust GitHub App Permissions** to grant access.)

### 5.2 Framework
Vercel auto-detects **Next.js**. Leave all build settings at defaults. **Don't click Deploy yet** — add env vars first.

### 5.3 Env vars
Expand **Environment Variables** and add the **7 rows** from Step 4. For the first
deploy, set a best-guess `NEXT_PUBLIC_SITE_URL = https://martijnfit.vercel.app`
(you'll fix it in 5.5). Apply to **All Environments**.

### 5.4 Deploy
Click **Deploy** (~1–2 min). You'll get a URL like **`https://martijnfit.vercel.app`**
(possibly with a random suffix). **Copy your real "Live URL"** to your note.

### 5.5 Wire the real URL back (critical)
1. **Vercel → Settings → Environment Variables** → edit **`NEXT_PUBLIC_SITE_URL`** to your real Live URL (no trailing slash). Save.
2. **Supabase → Authentication → URL Configuration:** set **Site URL** = Live URL; ensure **Redirect URLs** includes `<LIVE_URL>/auth/callback` (keep the localhost one too). Save.
3. **Strava → https://www.strava.com/settings/api** → **Authorization Callback Domain** = your Vercel **domain only** (e.g. `martijnfit.vercel.app`). Save.

### 5.6 Redeploy
`NEXT_PUBLIC_SITE_URL` is baked at build time, so trigger a fresh build:
**Vercel → Deployments → ⋯ on the top one → Redeploy.** Now you're truly live.

---

## 6. First run — try it end to end

Open your **Live URL**.

1. On the login screen, type **your email** → **Email me a login link**.
2. Check your inbox (and spam) → open the email → click the link. **Open it on the same device/browser** you requested it from.
3. You land in the app → go through **onboarding** (name, sports, habits).
4. **Profile → Connections → Connect Strava** → authorize. The app **backfills your history**, so give it a few seconds.
5. Open the **Tracker** — the heatmap fills with your **real Strava activities**. The **AI coach** (bottom-right) responds via Claude.

### Adding Martijn
No invite/admin step. Martijn opens the **Live URL**, enters **his** email, clicks
his link, and he's in — with his own private profile (row-level security keeps his
data and yours separate). The database trigger creates his profile automatically.

---

## 7. Gotchas checklist

- **Login email didn't arrive:** check **spam**; Supabase's built-in emailer is rate-limited (~a few/hour on free) — wait a minute and retry. For heavier use, add your own SMTP in Supabase → Auth → Emails.
- **Clicked the link but got bounced to login:** open the link on the **same device/browser** you requested it from; and confirm Supabase **Redirect URLs** + **Site URL** include your live `/auth/callback`, that `NEXT_PUBLIC_SITE_URL` equals the live URL, and that you **redeployed** after changing it (5.6).
- **Strava connect fails / "invalid redirect":** the **Authorization Callback Domain** must be the **bare domain** (`martijnfit.vercel.app` or `localhost`) — no `https://`, no path.
- **`service_role` key:** secret that bypasses all DB security — server env vars only; never client/committed/shared.
- **Re-running the schema:** safe and idempotent; re-paste `supabase/schema.sql` if unsure.
- **Everything shows fake data, no login:** that's **DEMO mode** — Supabase env vars weren't found. Check `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set and you redeployed/restarted.
- **Changed an env var, nothing changed:** Vercel bakes env vars at **build time** — **Redeploy** (5.6). Locally, restart `npm run dev`.
- **Coach errors / "insufficient credit":** add credit in Anthropic → Billing.

---

## 8. Local development

```bash
npm install
cp .env.example .env.local      # fill in real values (Step 4a)
npm run dev                     # http://localhost:3000
```
For login locally, Supabase **Redirect URLs** must include
`http://localhost:3000/auth/callback` (1.5); for Strava, callback domain `localhost` (Step 2).

> **Framework note (Next.js 16):** auth runs on every request via **`src/proxy.ts`**
> — Next 16 renamed the old "middleware" to **proxy**. Don't be surprised there's
> no `middleware.ts`. With no Supabase env vars it does nothing (demo mode).

---

## Appendix A — Add Google Calendar later (optional)

Calendar-aware planning is off by default (the planner uses smart default hints).
To turn on real busy-times from Google Calendar, later:

1. **Google Cloud** (**https://console.cloud.google.com**) → new project `Martijnfit`.
2. **APIs & Services → OAuth consent screen** → **External**, keep it in **Testing** mode, and add **your + Martijn's Gmail as Test users** (this avoids Google's verification review for the sensitive Calendar scope).
3. **Enable the Google Calendar API**; under **Data Access** add scope **`calendar.readonly`**.
4. **Credentials → Create OAuth client → Web application.** Redirect URI = your Supabase callback: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
5. **Supabase → Authentication → Providers → Google** → enable + paste the Client ID/Secret.
6. Set env vars `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Vercel + `.env.local`), redeploy.
7. Switch login to Google (or add a "Connect Calendar" button) — ping me and I'll flip the ~10 lines. The calendar API route (`/api/calendar/busy`) is already built and dormant; it activates once a Google token exists.

> On first Google login you'll see "Google hasn't verified this app" → **Advanced → Go to Martijnfit (unsafe)**. Expected for a Testing-mode app.

---

## ✅ You're live — final checklist

- [ ] Supabase project created; `supabase/schema.sql` run (got "Success").
- [ ] Copied **Supabase URL**, **anon key**, **service_role key**.
- [ ] Supabase **Email** provider enabled; **Site URL** + **Redirect URLs** set (live + localhost `/auth/callback`).
- [ ] Strava app created; **Callback Domain = your Vercel domain** (bare domain).
- [ ] Anthropic key created; billing/credit added.
- [ ] All **7 env vars** added in Vercel.
- [ ] Deployed; **`NEXT_PUBLIC_SITE_URL`** set to the real URL; **redeployed**.
- [ ] Signed in via email link, finished onboarding, connected Strava, heatmap filled.
- [ ] Martijn signed in with his email.

🎉 That's it — Martijnfit is in production.
