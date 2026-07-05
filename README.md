# Martijnfit

**A beautiful multi-sport tracker + planner.** Auto-log every session, see your consistency at a glance, and plan next week around your habits and calendar — with an AI coach that actually edits your plan.

Built for athletes who do a bit of everything: ⚽ football · 🎾 tennis · padel · 🏃 running · 🏋️ gym · ⛷️ skiing.

## What it does

- **Consistency tracker** — a GitHub-style activity heatmap, streaks, and per-sport breakdowns. Replaces the "log every session in a spreadsheet" habit.
- **Auto-sync from Strava** — your activities (including Garmin, which Strava ingests) import automatically; manually add or edit any session.
- **Weekly planner** — your recurring habits (gym before work, football Wednesdays…) pre-fill the week as confirmable cards; quick-add ad-hoc sessions. Calendar-aware (reads Google Calendar to plan around meetings). Planned-vs-actual reconciliation.
- **AI coach** — chat to plan your week ("find me a tennis slot Thursday"); it makes the change for real.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack) + TypeScript + Tailwind 4
- **Supabase** — Postgres + Auth (email magic-link) + Row-Level Security
- **Strava API** — activity sync · **Google Calendar** — busy-aware planning (optional add-on)
- **Anthropic Claude** (Sonnet) — the in-app coach with tool use

> Runs in **demo mode** out of the box (mock data, no accounts needed): `npm install && npm run dev`.
> To take it to production with real accounts + sync, follow **[RUNBOOK.md](./RUNBOOK.md)**.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in keys (see RUNBOOK.md) — or leave empty for demo mode
npm run dev                  # http://localhost:3000
```

The database schema lives in [`supabase/schema.sql`](./supabase/schema.sql).

---

_Note: this is Next.js 16 — middleware is `proxy.ts`, and `cookies()` is async._
