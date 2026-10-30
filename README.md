# Receipts

**"Is this product actually working?"** A mobile-first web app (PWA) where you log your skincare products, scan your face once a week, and get an honest verdict on whether each product is doing anything, with the numbers to back it up.

Built for the YouCam API hackathon.

## What it does

1. **Add a product** and pick the skin concern it should help with (acne, redness, pores, texture, oiliness, moisture, radiance or dark circles) and the day you started it.
2. **Scan weekly.** Each scan is two photos taken back to back. The photos are analysed by YouCam and **thrown away**; only the scores are stored.
3. **Get a verdict** for each product, with a short plain-language explanation and one next step:

| Verdict | Meaning |
|---|---|
| `TOO_EARLY` | Under 4 weeks or under 3 scans since you started. Keep going. |
| `CANT_TELL` | Not enough clean data (too few "before" scans, jumpy photos, or a poor-quality latest scan). Says what rescan would fix it. |
| `POSSIBLE_IRRITATION` | Redness (or the targeted concern) got clearly worse than before you started. |
| `WORKING` | The targeted concern improved by more than the normal scan-to-scan variation. |
| `NO_VISIBLE_CHANGE` | The change is within normal variation. |

The honest part: two photos of the same face never score exactly the same (light, angle, distance), so every scan measures its own noise, and a change only counts if it is bigger than that noise.

## Which YouCam API it uses

The **[YouCam AI Skin Analysis API](https://yce.perfectcorp.com/ai-api)** (standard definition, v2.0 endpoints). For every photo the server uploads the image, creates a `skin-analysis` task, polls it, and reads the `raw_score` (1 to 100, higher is healthier) for 8 concerns: `acne, redness, pore, texture, oiliness, moisture, radiance, dark_circle_v2`.

- All YouCam calls happen **server-side** in Convex actions. The API key never reaches the browser.
- **Privacy:** photos are sent to YouCam for analysis (YouCam states uploads are deleted after 24 hours). Receipts itself never stores, logs or caches a photo; it keeps only the numbers.
- **Free-tier budget:** the API allows 1,000 free units in total, and one scan costs 24. So the app limits each user to **3 scans per rolling 24 hours** and stops live scanning for everyone after 900 units. The demo account runs on seeded data and never spends units.
- What we learned about the API (noise, score ranges, errors, costs) is in [`docs/youcam-api-notes.md`](docs/youcam-api-notes.md).

## Try it

**Demo account** (read-only, pre-filled with 6 weeks of sample scans and 3 products showing `WORKING`, `NO_VISIBLE_CHANGE` and `CANT_TELL`): on the login screen, **"Try the demo"** signs in with one tap. It has no password.

To scan for real, tap **"Continue with Google"**, or create an account with an email and password (Clerk emails a 6-digit code to confirm the address). Sign-in is handled by [Clerk](https://clerk.com).

## Run it yourself

Needs Node 22+.

```bash
git clone https://github.com/Nana-Kojo801/receipts.git
cd receipts
npm install
npx convex dev        # creates your own Convex dev deployment, writes VITE_CONVEX_URL to .env.local
npm run dev           # in a second terminal: http://localhost:5173
```

Then set the server-side environment variables on your Convex deployment (they are **not** read from `.env.local`):

| Variable | Needed for | How |
|---|---|---|
| `YOUCAM_API_KEY` | Real scans. Without it scanning shows an error; everything else works. | `npx convex env set YOUCAM_API_KEY <key>` |
| `OPENROUTER_API_KEY` | AI-written explanations. Without it a built-in templated explanation is used. | `npx convex env set OPENROUTER_API_KEY <key>` |
| `OPENROUTER_MODEL` | Optional. One or more OpenRouter model ids, comma-separated, tried in order. Default: a few free chat models (see `shared/explanation/openrouter-client.ts`). | `npx convex env set OPENROUTER_MODEL <ids>` |
| `CLERK_JWT_ISSUER_DOMAIN` | Login (Clerk). Convex only accepts sign-in tokens from this Clerk instance. | The **Frontend API URL** from the Clerk dashboard, e.g. `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-name-00.clerk.accounts.dev`. |
| `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` | Scan reminder emails ([Resend](https://resend.com)). Without them no email is sent and everything else works. | `npx convex env set RESEND_API_KEY <re_...>`; `EMAIL_FROM` like `Receipts <onboarding@resend.dev>` (the sender must be on a domain verified in Resend, except Resend's test sender); `APP_URL` is the site address used in the email links, e.g. `https://receipts-three-tau.vercel.app`. |
| `EMAIL_ALLOWED_TO` | Who really gets reminder emails. Unset or empty = nobody (safe default), `*` = everyone, otherwise a comma-separated list of addresses. Everyone else only sees the preview in Settings. | `npx convex env set EMAIL_ALLOWED_TO you@example.org`. Resend's test sender can only reach the Resend account owner, so use that address until a domain is verified, then set `*`. |
| `CLERK_SECRET_KEY` | Creating the demo user, "Try the demo" tickets and account deletion. Server-side only. | `npx convex env set CLERK_SECRET_KEY <sk_...>` (Clerk dashboard, API keys). |

The frontend also needs `VITE_CLERK_PUBLISHABLE_KEY` (the `pk_...` key, public) in `.env.local`, and in the Netlify and Vercel environment variables.

**Clerk setup (once per Clerk instance):** create an application; under User & authentication turn on **Email address** (sign-up and sign-in, verified at sign-up with an email verification code) and **Password**; enable **Google** under SSO connections (a development instance uses Clerk's shared Google credentials, so no Google Cloud project is needed); and activate the **Convex** integration (Integrations). A Clerk *production* instance needs a domain you own and your own Google OAuth client.

Create the demo account on your deployment (needs `CLERK_SECRET_KEY`):

```bash
npm run reset-demo            # creates the demo user in Clerk if missing and (re)seeds it; safe to repeat
```

Other commands: `npm test` (unit and Convex function tests), `npm run typecheck`, `npm run lint`, `npm run build`.

### Deploying (Netlify and/or Vercel, plus a Convex deployment)

For this hackathon the live app runs on a Convex **development** deployment (no separate production deployment). That deployment already has the environment variables above and the demo account; the code is pushed to it with `npx convex dev --once` (or while `npx convex dev` runs). Note that anything pushed there goes live at once, so don't leave `npx convex dev` running with half-finished edits while the app is being judged.

The website is a static single-page app, so it can be hosted on **Netlify and Vercel at the same time**: each one builds the same repo and talks to the same Convex deployment, and each gets its own address. Both hosts need the same one environment variable:

> `VITE_CONVEX_URL` = the Convex deployment's URL (the `VITE_CONVEX_URL` line in your `.env.local`, for example `https://dashing-chameleon-912.convex.cloud`). It is public, not a secret.

- **Netlify:** add a new site from this GitHub repo. Settings come from [`netlify.toml`](netlify.toml) (`npm run build`, publish `dist`); routing and cache rules are in `public/_redirects` and `public/_headers`.
- **Vercel:** add a new project from this GitHub repo. Settings come from [`vercel.json`](vercel.json) (Vite, `npm run build`, output `dist`, single-page routing and the same cache rules). Add the environment variable above under Settings, Environment Variables (Production), then redeploy.
- Both hosts need `VITE_CLERK_PUBLISHABLE_KEY` as well. A Clerk development instance accepts sign-in from any address, so Netlify, Vercel and localhost all work.
- Before judging, restore the demo data if it was touched: `npm run reset-demo`.

If you ever want a separate production deployment instead: create it in the Convex dashboard, add a production deploy key to the host as `CONVEX_DEPLOY_KEY`, use the build command `npx convex deploy --cmd 'npm run build'`, set the environment variables with `--prod`, and use a Clerk production instance (needs your own domain) and run `npm run reset-demo -- --prod`.

## Scan reminders

People can turn on **"Email me a reminder"** in Settings (off by default). The next scan is due 7 days after the latest scan, and the email goes out at **9:00 local time the day before** (their time zone is read from the browser when they switch it on). Scanning early moves the due date, so the reminder moves too: the due date is always computed from the latest scan. There is at most one email per due date, and after **3** ignored reminders in a row it stops until the person switches it off and on again. Every email has an unsubscribe link (no sign-in needed). The email contains no scores, only "time for your weekly scan" and a link.

Never emailed: the demo account, addresses on test domains (`example.com`, `example.org`, `example.net`, ...), and addresses not on `EMAIL_ALLOWED_TO` (those users see a preview of the email in Settings instead). An hourly cron (`convex/crons.ts`) runs `reminders:sendDueReminders`. All numbers (interval, lead time, hour, miss limit, test domains) are in [`shared/reminders/reminder-config.ts`](shared/reminders/reminder-config.ts); the provider is behind one function in [`shared/email/send-email.ts`](shared/email/send-email.ts).

## Ideas to test

After a scan (and on Home), a card lists the 1 to 3 concerns with the lowest scores, with a few ingredient families people commonly try for each. **Test this** opens the new-product form with the concern and a name pre-filled, and Receipts then judges the product like any other. The list is hand-written in [`shared/ideas/ideas-config.ts`](shared/ideas/ideas-config.ts): no brands, nothing written by an AI model, no prescription or drug-like ingredients (a test enforces this). Concerns that already have an active product are skipped, nothing is suggested after a scan flagged as poor quality, and the card always says these are ideas to try, not advice. It makes no YouCam calls.

## Scan quality coach

On the Scan page, each photo gets a small lighting hint as soon as it is chosen ("Lighting looks good", "Looks quite dark", "Looks very bright"), plus notes when the two photos have different light or when the light differs from the last scan. It is measured in the browser from the middle of the photo (average brightness, 0 to 255), sends nothing new to YouCam and **never blocks a scan**. To compare with the last scan, one number per scan is stored (`scans.brightness`, the mean of the two photos): never a photo. The thresholds are first guesses in [`shared/scan/lighting.ts`](shared/scan/lighting.ts) and need tuning on real photos.

## Same-concern warning

When two **active** products target the same concern and **started within 28 days** of each other, Receipts says so: a note on both product pages, a chip on the Home cards, and a heads-up in the new-product form before saving (it never blocks saving). The verdict compares your score before and after a start date, so it can't tell overlapping products apart. This is a warning only: the verdict engine is unchanged. The rule and the 28 days live in [`shared/products/overlap.ts`](shared/products/overlap.ts).

## How verdicts are calculated

The engine is a pure TypeScript function in [`shared/verdict/compute-verdict.ts`](shared/verdict/compute-verdict.ts), and every threshold lives in one file, [`shared/verdict/verdict-config.ts`](shared/verdict/verdict-config.ts).

- **Baseline** = scans up to the end of the day you started the product. **After** = later scans.
- **Noise** = the larger of (a) the standard deviation of the baseline scores and (b) the average difference between the two photos of each scan (at least 1 point).
- **Change** = the mean of the last 2 scans after the start minus the mean of the baseline. Whether up or down is "better" is a config map (for YouCam's `raw_score`, higher is healthier for every concern).
- Checked in this order, the first match wins:
  1. `TOO_EARLY`: fewer than 28 days since the start, or fewer than 3 scans after it.
  2. `CANT_TELL`: fewer than 2 baseline scans, or noise above 15% of the score range, or the latest scans flagged as poor quality.
  3. `POSSIBLE_IRRITATION`: redness worse than its baseline by more than 2x its noise at **any** scan after the start (or the targeted concern clearly worse).
  4. `WORKING`: improvement on the targeted concern larger than 2x the noise.
  5. `NO_VISIBLE_CHANGE`: otherwise (the change is within 2x the noise).
- **Explanation text:** a template per verdict is stored immediately. An AI model (OpenRouter free model) then rewrites it, but it is only ever given the verdict's numbers (no photos, no personal data) and its answer is discarded unless it passes checks (no invented numbers, no diagnoses, exactly one next step). Any failure keeps the template.
- Verdicts are recomputed after every scan, whenever a product changes, and once a day. None of that calls YouCam.

This is an estimate from photos, **not medical advice**.

## Project structure

```
src/            React app: pages/<page>/<page>-page.tsx with nested components/, shared UI in components/
convex/         Backend: schema, products / scans / verdicts functions, scan action, explanations, seed, crons
shared/         Code used by both: verdict engine, concerns, scan limits, YouCam client, OpenRouter client, demo data
tests/          Vitest tests (engine, clients, and the Convex functions with a mocked YouCam / OpenRouter)
scripts/        YouCam API spike and a live check script (need an API key)
docs/           SPEC.md, youcam-api-notes.md, api-contract.md
```

Stack: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Convex (database, functions), Clerk (Google and email + password sign-in). Charts are hand-drawn SVG; Figtree (Fontsource, OFL) is the typeface.

## License

MIT, see [`LICENSE`](LICENSE).
