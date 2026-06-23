# Martijnfit — Setup & Deploy Runbook

This is a complete, copy-paste-friendly guide to take Martijnfit from this code
repository to a live website that you and Martijn can use. It is written for a
non-expert. Follow the sections **in order**. Each step says exactly where to
click.

Set aside about **60–90 minutes** the first time. You will create five free
accounts (most you may already have): GitHub, Vercel, Supabase, Google Cloud,
Strava, plus a paid-per-use Anthropic key.

> Tip: keep a plain text note open (Apple Notes is fine) called **"Martijnfit
> secrets"**. Every time this guide says "copy this value", paste it into that
> note with a label. You will need them all together in Step 5.

---

## 0. Overview — how the app is wired

Martijnfit is a fitness tracker. The pieces:

| Piece | What it does | Who hosts it |
|-------|--------------|--------------|
| **The app** (this repo) | The website itself — the UI, pages, server logic | **Vercel** |
| **Database + login** | Stores your activities/profile; handles "Sign in with Google" | **Supabase** (Postgres + Auth) |
| **Strava** | Pulls your real workouts in to fill the heatmap | Integration (your Strava account) |
| **Google Calendar** | Reads "busy" times to help plan | Integration (your Google account) |
| **Claude (Anthropic)** | The AI coach that talks to you | Integration (Anthropic API) |

**How they connect:** Vercel runs the app. The app talks to Supabase for data
and login. Supabase handles the actual Google login handshake. The app talks
directly to Strava, Google Calendar, and Anthropic using secret keys you'll
create. All those keys are stored as **environment variables** (Step 5).

### Demo mode (important and reassuring)

If **no environment variables are set**, the app runs in **DEMO mode**: it shows
fake sample data, no login is required, and nothing is saved. This is by design
— the code is written to *compile and run without any keys*. That means:

- You can run `npm run dev` right now and see the app, before doing any of this.
- If you ever misconfigure a key, the worst case is the app falls back to demo
  behavior instead of crashing.
- "Going live for real" simply means: fill in all the environment variables.

The app decides this automatically (it checks whether the Supabase URL/key
exist). You don't toggle anything.

### The order we'll build it

1. Supabase (database + auth) — get 3 keys.
2. Google Cloud (the Google login + Calendar permission) — get 2 keys. **This is the fiddliest step; go slowly.**
3. Strava — get 2 keys.
4. Anthropic — get 1 key.
5. Collect all keys into a list.
6. Deploy to Vercel and paste the keys.
7. Wire the live URL back into Supabase / Google / Strava.
8. First run + gotchas.

---

## 1. Supabase — database & authentication

Supabase gives you a Postgres database and the "Sign in with Google" machinery.

### 1.1 Create the project

1. Go to **https://supabase.com** and click **Start your project** / **Sign in**
   (sign in with GitHub is easiest).
2. Click **New project**.
3. Pick your organization (create one if asked — any name, Free plan).
4. Fill in:
   - **Name:** `martijnfit`
   - **Database Password:** click **Generate a password**, then **copy it into
     your secrets note** (labelled "Supabase DB password"). You won't need it
     for the app, but keep it.
   - **Region:** choose the one closest to you (e.g. *Central EU (Frankfurt)*).
5. Click **Create new project**. Wait ~2 minutes while it provisions.

### 1.2 Create the database tables (run the schema)

The repo includes the full database definition at `supabase/schema.sql`. You'll
paste it into Supabase once.

1. In the Supabase left sidebar, click **SQL Editor**.
2. Click **+ New query** (or "New snippet").
3. Open the file **`supabase/schema.sql`** from this repo in a text editor,
   **select all** (Cmd+A), **copy** (Cmd+C).
4. **Paste** it into the SQL editor box in Supabase.
5. Click **Run** (bottom right, or Cmd+Enter).
6. You should see **"Success. No rows returned"**. That's correct — it just
   created tables.

> The schema is **idempotent** — meaning **it is 100% safe to run again** any
> time. If you're ever unsure whether tables exist, just re-paste and Run. It
> won't delete your data. It also installs a trigger that automatically creates
> a profile row the first time anyone signs in, so you don't have to manage
> users by hand.

### 1.3 Copy your three Supabase keys

1. In the left sidebar, click the **gear / Project Settings**.
2. Click **API** (sometimes under "Configuration" → "Data API" / "API Keys" in
   newer dashboards).
3. Copy these three values into your secrets note:

   | Label in note | Where on the page | Looks like |
   |---|---|---|
   | **Supabase URL** | "Project URL" | `https://abcdxyz.supabase.co` |
   | **Supabase anon key** | "Project API keys" → `anon` `public` | a long `eyJ...` string |
   | **Supabase service_role key** | "Project API keys" → `service_role` `secret` (click reveal) | another long `eyJ...` string |

> The part `abcdxyz` in the URL is your **Project Ref**. Write it down separately
> too — you'll need it in Step 2 for the Google redirect URL.

> **The `service_role` key is a master key that bypasses all security.** Never
> put it in client code, never paste it in chat, never commit it. It only ever
> lives in environment variables on the server. We'll treat it accordingly.

We'll come back to Supabase to **enable Google login** in Step 2.6 (we need
Google credentials first).

---

## 2. Google Cloud — "Sign in with Google" + Calendar access

This is the trickiest step. Read each sub-step. The single most important trick
is in **2.2**: keeping the app in **Testing mode** so Google does **not** make
you go through weeks-long app verification for the Calendar permission.

### 2.1 Create a Google Cloud project

1. Go to **https://console.cloud.google.com**. Sign in with **your** Google
   account (Alessandro's — the one that will "own" the app).
2. At the very top, click the **project dropdown** (says "Select a project") →
   **New Project**.
3. **Name:** `Martijnfit`. Leave organization as is. Click **Create**.
4. Wait a few seconds, then make sure the top dropdown now shows **Martijnfit**
   (select it if not).

### 2.2 OAuth consent screen — keep it in TESTING mode (the key trick)

1. Left menu (hamburger ☰) → **APIs & Services** → **OAuth consent screen**.
   (In the newer console this may appear under **APIs & Services → Branding** /
   **Audience**.)
2. If asked **User Type**, choose **External**, click **Create**.
3. Fill the minimum:
   - **App name:** `Martijnfit`
   - **User support email:** your email.
   - **Developer contact email:** your email.
   - Leave logo/domains blank. Click **Save and Continue** through the screens.
4. **DO NOT click "Publish app".** Leave **Publishing status: Testing**.
5. Find the **Test users** section (a tab called **Audience** → **Test users**,
   or a step in the wizard) and click **+ Add users**. Add **both**:
   - Alessandro's Google email (e.g. `alessandromauro29@gmail.com`)
   - Martijn's Google email
   Click **Save**.

> **Why this matters (read this):** The Google Calendar permission is a
> "sensitive scope". Normally Google forces a published app through a long
> **verification review** before users can grant it. But an app left in
> **Testing** mode skips all that — it just only works for the **test users**
> you explicitly list (up to 100). Since this app is only for you and Martijn,
> Testing mode is the **easiest path** and completely fine. The only visible
> effect: on first login Google shows a "Google hasn't verified this app"
> screen; you click **Advanced → Go to Martijnfit (unsafe)** to continue. That's
> expected and safe — it's *your* app.

> If you ever add a third person, just add their email to **Test users** here.

### 2.3 Enable the Google Calendar API

1. Left menu → **APIs & Services** → **Library**.
2. Search **`Google Calendar API`**, click it, click **Enable**.

### 2.4 Add the Calendar scope (read-only)

1. Back to **OAuth consent screen** → **Data Access** (or **Scopes** step) →
   **Add or Remove Scopes**.
2. In the filter, search for **`calendar.readonly`**.
3. Tick **`.../auth/calendar.readonly`** ("See and download any calendar you can
   access using your Google Calendar"). Click **Update**, then **Save**.

   (The basic `email`, `profile`, `openid` scopes are added automatically for
   login — you don't need to add those manually.)

### 2.5 Create the OAuth Client ID (the credentials)

1. Left menu → **APIs & Services** → **Credentials**.
2. Click **+ Create Credentials** → **OAuth client ID**.
3. **Application type:** **Web application**.
4. **Name:** `Martijnfit Web`.
5. Under **Authorized redirect URIs**, click **+ Add URI** and paste **exactly
   this**, replacing `<PROJECT-REF>` with your Supabase Project Ref from Step
   1.3:

   ```
   https://<PROJECT-REF>.supabase.co/auth/v1/callback
   ```

   Example: `https://abcdxyz.supabase.co/auth/v1/callback`

   > This must be the **Supabase callback**, NOT your Vercel site. Supabase
   > handles the Google handshake on your behalf, then forwards the user back to
   > your app. Getting this wrong is the #1 cause of "redirect_uri_mismatch"
   > errors. Copy it character-for-character. No trailing slash.

6. Click **Create**.
7. A popup shows **Client ID** and **Client secret**. Copy **both** into your
   secrets note:
   - **Google Client ID** (ends in `.apps.googleusercontent.com`)
   - **Google Client Secret** (`GOCSPX-...`)

### 2.6 Tell Supabase about Google (enable the provider)

1. Back in **Supabase** → left sidebar **Authentication** → **Sign In / Providers**
   (older UI: **Providers**).
2. Find **Google**, click to expand, toggle **Enable**.
3. Paste your **Google Client ID** and **Google Client Secret** (from 2.5).
4. **Leave the "Callback URL (for OAuth)" that Supabase shows you as-is** — it
   should already be `https://<PROJECT-REF>.supabase.co/auth/v1/callback`, the
   same URL you put into Google in 2.5. (If it differs, go fix the Google side
   to match this exact value.)
5. Click **Save**.

### 2.7 Set Supabase Auth URLs (where users are allowed to land)

Still in Supabase → **Authentication** → **URL Configuration**:

1. **Site URL:** for now set it to `http://localhost:3000`. **After you deploy
   (Step 6) you will change this to your real Vercel URL.**
2. **Redirect URLs** → **Add URL** — add **both** of these now:
   - `http://localhost:3000/auth/callback`
   - `https://martijnfit.vercel.app/auth/callback` *(placeholder — replace with
     your real Vercel URL after Step 6; you can add it now and edit later)*
3. Click **Save**.

> The path is **`/auth/callback`** (your app's own login-return page) — different
> from the Supabase `/auth/v1/callback` you gave Google. Both are needed; they
> do different jobs. Any URL the app tries to send a user back to must be on this
> allow-list, or login silently fails.

---

## 3. Strava — pull in real workouts

1. Make sure you're logged in to **your Strava account** in the browser.
2. Go to **https://www.strava.com/settings/api**.
3. Fill in the **"My API Application"** form:
   - **Application Name:** `Martijnfit`
   - **Category:** `Training` (or anything reasonable).
   - **Club:** leave blank.
   - **Website:** `https://martijnfit.vercel.app` (your future Vercel URL is
     fine; or `http://localhost:3000`).
   - **Authorization Callback Domain:** `localhost`
     *(start with localhost so local dev works; you'll add the Vercel domain in
     Step 7).*
4. Agree to the terms, click **Create**.
5. Copy into your secrets note:
   - **Strava Client ID** (a small number, e.g. `12345`)
   - **Strava Client Secret** (a long hex string — click "Show" if hidden)

> **Strava is special: it only wants a DOMAIN, not a full URL.** In the
> "Authorization Callback Domain" box you type just the **host** —
> `martijnfit.vercel.app` or `localhost` — with **no `https://`, no `/path`, no
> port**. Strava then allows callbacks to anything on that domain. You can only
> set **one** domain, so during development use `localhost`, and after deploying
> change it to your Vercel domain (Step 7). If you want both at once, you'd need
> a second Strava app — not necessary for this project.

---

## 4. Anthropic — the AI coach (Claude)

1. Go to **https://console.anthropic.com** and sign in / sign up.
2. Add a payment method: **Settings** → **Billing** → add a card, and buy a
   small amount of credit (e.g. **$5**) to start.
3. Go to **Settings** → **API Keys** → **Create Key**. Name it `martijnfit`.
4. **Copy the key immediately** (`sk-ant-...`) into your secrets note — Anthropic
   only shows it once.

> **Cost:** the coach uses Claude and is billed **per message**, not monthly. The
> model used (Claude Sonnet) is cheap — roughly a fraction of a cent per
> exchange. For two users, expect a few cents to maybe a dollar a month. $5 of
> credit will last a long time. You can set a **monthly spend limit** in Billing
> for peace of mind.

---

## 5. Collect all your environment variables

You should now have, in your secrets note, every value below. This is the
**complete list** the app uses (it mirrors `.env.example` in the repo). Here is
each one and where it came from:

| Variable | Where it came from | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Step 1.3 — Supabase Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Step 1.3 — Supabase `anon` key | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 1.3 — Supabase `service_role` key | **SECRET (server only)** |
| `NEXT_PUBLIC_SITE_URL` | Your site address. Local: `http://localhost:3000`. Prod: your Vercel URL (Step 6) | public |
| `GOOGLE_CLIENT_ID` | Step 2.5 | public-ish |
| `GOOGLE_CLIENT_SECRET` | Step 2.5 | **SECRET** |
| `STRAVA_CLIENT_ID` | Step 3 | public-ish |
| `STRAVA_CLIENT_SECRET` | Step 3 | **SECRET** |
| `ANTHROPIC_API_KEY` | Step 4 | **SECRET** |

> `NEXT_PUBLIC_` is a Next.js convention: those values are safe to expose in the
> browser. Everything **without** that prefix is server-only and must stay
> secret.

### 5a. For LOCAL development (optional, do this if you want to run it on your Mac)

1. In the project folder, copy the template:
   ```bash
   cp .env.example .env.local
   ```
2. Open **`.env.local`** in a text editor and replace each placeholder with the
   real value from your secrets note. For local dev keep:
   ```
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
3. Save. **`.env.local` is git-ignored — it will never be committed.** Good.

### 5b. For PRODUCTION — you'll paste these into Vercel in Step 6.4.

Don't do it yet; just have the list ready.

---

## 6. Deploy to Vercel

The repo is already on **GitHub (public)**. Vercel will import it and build it.

### 6.1 Import the project

1. Go to **https://vercel.com** and **Sign up / Log in with GitHub**.
2. Click **Add New…** → **Project**.
3. Find **`martijnfit`** in the list of your GitHub repos → click **Import**.
   (If you don't see it, click **Adjust GitHub App Permissions** and grant
   Vercel access to the repo.)

### 6.2 Framework settings

Vercel auto-detects **Next.js**. Leave **all** build settings at their defaults:

- Framework Preset: **Next.js**
- Build Command: default
- Output Directory: default
- Install Command: default

Do **not** click Deploy yet — add env vars first (next step).

### 6.3 Add environment variables

On the import screen, expand **Environment Variables**. For **each** row in the
table from Step 5, add a **Name** and **Value**. For the very first deploy you
don't know your final URL yet, so set:

```
NEXT_PUBLIC_SITE_URL = https://martijnfit.vercel.app
```

(a best guess — you'll correct it in Step 6.5). Add all nine variables. Make sure
each is applied to **Production**, **Preview**, and **Development** (the default
"All Environments" is fine).

> If you ever need to edit these later: **Vercel → your project → Settings →
> Environment Variables.**

### 6.4 Deploy

Click **Deploy**. Wait ~1–2 minutes for the build. When it finishes you'll get a
live URL like **`https://martijnfit.vercel.app`** (or with a random suffix like
`martijnfit-abc123.vercel.app`). **Copy your real URL** into your secrets note —
call it **"Live URL"**.

### 6.5 Wire the real URL back everywhere (critical)

Now that you know the real Live URL, update these four places so login and
integrations work:

1. **Vercel** → Settings → Environment Variables → edit **`NEXT_PUBLIC_SITE_URL`**
   to your **real Live URL** (no trailing slash). Save.
2. **Supabase** → Authentication → **URL Configuration**:
   - **Site URL** = your real Live URL.
   - **Redirect URLs** — make sure `<LIVE_URL>/auth/callback` is in the list
     (add it if your real URL differed from the placeholder). Keep
     `http://localhost:3000/auth/callback` too. Save.
3. **Google Cloud** → Credentials → your OAuth client → **redirect URI stays the
   Supabase callback** `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
   **Do not change it** to the Vercel URL — this one is intentionally Supabase's.
4. **Strava** → https://www.strava.com/settings/api → set **Authorization
   Callback Domain** to your Vercel **domain only**, e.g. `martijnfit.vercel.app`
   (no `https://`, no path). Save.

### 6.6 Redeploy

Because you changed `NEXT_PUBLIC_SITE_URL`, trigger a fresh build so the new
value is baked in:

- **Vercel → your project → Deployments → ⋯ (top deployment) → Redeploy.**

Wait for it to finish. **Now you're truly live.**

---

## 7. First run — try it end to end

Open your **Live URL** in a browser.

1. You'll see a login screen. Click **Continue with Google**.
2. Choose your Google account. You'll hit the **"Google hasn't verified this
   app"** screen → click **Advanced** → **Go to Martijnfit (unsafe)**. (Expected
   — it's your own Testing-mode app.)
3. **Approve the permissions**, including **Calendar (read-only)**.
4. You land back in the app and go through **onboarding** (name, sports, etc.).
5. Go to **Profile → Connections** (or wherever "Connect Strava" appears) and
   click **Connect Strava** → authorize. The app **backfills your activity
   history**, so this can take a few seconds.
6. Open the **Tracker / heatmap** — it should now fill in with your **real Strava
   activities**. The AI **coach** is available and will respond using Claude.

### Adding Martijn

There's no "invite" or admin step. Martijn just:

1. Must be listed as a **Test user** in Google (Step 2.2) — add his email if you
   haven't.
2. Opens the **Live URL**, clicks **Continue with Google**, and signs in with
   **his** Google account.

That automatically creates his Supabase user and his own private profile (the
database trigger from Step 1.2 handles it). His data is isolated from yours by
row-level security — neither of you can see the other's rows.

---

## 8. Gotchas checklist (read if anything misbehaves)

- **"Google hasn't verified this app" screen:** expected. Click *Advanced → Go to
  Martijnfit (unsafe)*. Caused intentionally by keeping the app in **Testing**
  mode (which is what lets you skip Google verification for the Calendar scope).
- **"Error 403: access_denied" on Google login:** the signing-in email is **not
  in Test users**. Add it in Step 2.2 and retry.
- **`redirect_uri_mismatch` from Google:** the redirect URI in Google (Step 2.5)
  must be **exactly** `https://<PROJECT-REF>.supabase.co/auth/v1/callback` —
  your Supabase project, no trailing slash. Not the Vercel URL.
- **Strava connect fails / "invalid redirect":** the **Authorization Callback
  Domain** must be the **bare domain only** (`martijnfit.vercel.app` or
  `localhost`) — no `https://`, no path, no port. Strava is the odd one out that
  wants a *domain*, while everyone else wants a *full URL*.
- **Logged in but bounced back to login / cookies error:** almost always a
  **redirect URL mismatch** or stale `NEXT_PUBLIC_SITE_URL`. Confirm Supabase
  **Site URL** and **Redirect URLs** include your live `/auth/callback`, that
  `NEXT_PUBLIC_SITE_URL` equals the live URL, and that you **redeployed** after
  changing it (Step 6.6).
- **`service_role` key:** it's a **secret that bypasses all database security**.
  It belongs **only** in server environment variables (Vercel + `.env.local`).
  Never in client code, never committed, never shared.
- **Re-running the schema:** totally safe and idempotent. If you suspect tables
  are missing, re-paste `supabase/schema.sql` and Run. It won't wipe data.
- **Everything shows fake/sample data and no login appears:** that's **DEMO
  mode** — the app didn't find the Supabase env vars. Check that
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (in
  Vercel for prod, or `.env.local` for dev) and that you redeployed/restarted.
- **Changed an env var but nothing changed:** Vercel bakes env vars at **build
  time**. After editing any var you must **Redeploy** (Step 6.6). Locally, stop
  and restart `npm run dev`.
- **Anthropic coach errors / "insufficient credit":** add credit in the
  Anthropic console → Billing.

---

## 9. Local development (optional)

To run the app on your own Mac:

```bash
# from inside the project folder
npm install
cp .env.example .env.local      # then fill in real values (Step 5a)
npm run dev
```

Open **http://localhost:3000**. For Google login to work locally, the Supabase
**Redirect URLs** must include `http://localhost:3000/auth/callback` (Step 2.7),
and for Strava the callback domain must be `localhost` (Step 3).

> **Framework note (this is Next.js 16):** the file that runs auth on every
> request is **`src/proxy.ts`** — in Next.js 16 the old "middleware" was renamed
> to **proxy**. You don't edit it; just don't be surprised there's no
> `middleware.ts`. If no Supabase env vars are present, it deliberately does
> nothing (demo mode).

---

## ✅ You're live — final checklist

- [ ] Supabase project created; `supabase/schema.sql` run (got "Success").
- [ ] Copied **Supabase URL**, **anon key**, **service_role key**.
- [ ] Google Cloud project; consent screen **External + Testing**; **you + Martijn added as Test users**.
- [ ] **Google Calendar API enabled**; **`calendar.readonly`** scope added.
- [ ] Google OAuth Web client created; redirect URI = **Supabase** `.../auth/v1/callback`.
- [ ] Supabase → Providers → **Google enabled** with Client ID/Secret.
- [ ] Supabase → URL Configuration: **Site URL** = live URL; **Redirect URLs** include live + localhost `/auth/callback`.
- [ ] Strava app created; **Callback Domain = your Vercel domain** (bare domain).
- [ ] Anthropic key created; billing/credit added.
- [ ] All **9 env vars** added in Vercel (Production + Preview).
- [ ] Deployed; **`NEXT_PUBLIC_SITE_URL`** set to the real URL; **redeployed**.
- [ ] Signed in with Google (approved Calendar), finished onboarding, connected Strava, heatmap filled.
- [ ] Martijn added as a Google Test user and able to sign in.

🎉 That's it — Martijnfit is in production.
