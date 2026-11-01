# Skinify: "Is this product actually working?" (YouCam API hackathon)

## What it is
A mobile-first web app (PWA) where a user logs skincare products, scans their face weekly with YouCam's Skin Analysis API, and gets an honest verdict on whether each product is working. Deadline is Nov 2, so FUNCTIONALITY FIRST. Any clean, simple UI is fine for now. I will polish the design later. Do not spend time on visual design or ask me to approve a UI mock.

## Stack and conventions
- React + Vite + TypeScript + TailwindCSS + shadcn/ui + Convex
- Sign-in through Clerk (replaced Convex Auth, issue #39): Google, or email + password with an emailed verification code.
- OpenRouter (free model) for the explanation text
- kebab-case file names, per-page directories with nested components/, named exports only
- Mobile-first layout
- All YouCam API calls happen server-side in Convex actions. The API key lives in Convex env vars, never in the client.

## Rules for you
- Do NOT guess YouCam endpoints, request shapes, or response fields. Read the official docs (https://yce.perfectcorp.com/ai-api). If you can't access them, stop and ask me to paste the docs or a sample response.
- Build in the order below and tell me when each milestone works before moving on.

## Build order

### Milestone 0: API spike (do this first)
A standalone script or Convex action that sends one test selfie to the YouCam Skin Analysis API and prints the RAW response. Show me the full output. List which concern scores come back and their ranges. I will tell you what to build on after seeing it. Also run the same photo twice and report how much the scores differ between identical inputs.

### Milestone 1: Auth
Sign in with Google or email + password (Clerk), plus a one-tap read-only demo. Anonymous visitors see only the login screen.
- Add a "Try the demo" button on the login screen that signs into the demo account in one tap.
- Settings page with a "Delete my account and data" button that wipes everything.

### Milestone 2: Scan flow
- Capture via a file input with `capture="user"` (front camera), plus a gallery option.
- Before sending, show a short guidance card: face a window, even light, no filters, same distance each time.
- Each scan = 2 photos taken back to back. Send both to the API and store the average of each concern score, plus the per-photo difference (this is the noise estimate).
- Store SCORES ONLY. Never store the photos. Discard after the API call.
- Handle API errors and low-quality photo rejections with clear messages.

### Milestone 3: Products and data model
Convex tables:
- `users` (one row per Clerk user, `clerkId`)
- `products`: userId, name, targetConcern, startDate, endDate (optional)
- `scans`: userId, createdAt, scores (object of concern -> averaged score), noise (object of concern -> |photo1 - photo2|), qualityFlag
- `verdicts`: productId, createdAt, verdict, summary, inputs (the numbers used)

Product form: name, which concern it targets (choose from the concerns the API actually returns), start date (defaults to today).

### Milestone 4: Timeline
Product detail page with a line chart of the targeted concern over time (use recharts), a marker on the product's start date, and a list of scans.

### Milestone 5: Verdict engine (pure TypeScript function, unit-tested)
Inputs: all of a user's scans, the product's start date, the target concern.

Definitions:
- baseline = scans before the start date; post = scans after it
- noise = the larger of (a) the standard deviation of the baseline scores and (b) the average per-scan photo difference
- change = mean(last 2 post scans) minus mean(baseline)
- "improved" direction depends on the concern (lower is better for most; make this a config map)

Verdicts (return exactly one):
- **TOO_EARLY**: fewer than 28 days since start OR fewer than 3 post scans
- **CANT_TELL**: fewer than 2 baseline scans, OR noise is large relative to the typical score range, OR the latest scans are flagged as poor quality. Say what rescan would fix it.
- **POSSIBLE_IRRITATION**: redness (or equivalent concern, depending on what the API returns) is worse than baseline by more than 2x noise at any point after the start
- **WORKING**: enough data AND improvement on the target concern is larger than 2x noise
- **NO_VISIBLE_CHANGE**: enough data AND |change| is within 2x noise

Keep all thresholds in one config file so I can tune them. Write unit tests with synthetic data covering all five verdicts.

### Milestone 6: Explanation text
Convex action calls OpenRouter with ONLY the structured numbers (verdict, change, noise, days, scan count) and asks for 3 to 4 plain-language sentences plus ONE next step (e.g. keep going 3 more weeks, patch test, ask a pharmacist or dermatologist). It must never invent scores or give a diagnosis. If the call fails or times out, fall back to a templated sentence per verdict. Show it on the verdict card.

### Milestone 7: Pages
- **Home**: product list, each with a verdict badge and a latest-scan date. Big "New scan" button.
- **Scan page**
- **Product detail**: timeline, verdict card, explanation
- **Compare**: before/after scores side by side (cut this first if time is short)
- **Settings**

### Milestone 8: Demo data
A seed mutation (and a "reset demo" script) that creates a demo user with 3 products and about 6 weeks of weekly scans using realistic fake scores:
- One product shows WORKING
- One shows NO_VISIBLE_CHANGE
- One shows CANT_TELL (inconsistent photo quality)

The login screen's "Try the demo" button signs into this account. Put the demo credentials in the README.

## Constraints
- Judges must be able to use the app free of charge until Nov 20, so signup must stay open and the demo account must always work.
- API units are limited (1,000 free total). Add a basic per-user daily scan limit and avoid unneeded API calls. The demo account runs on seeded data, not live scans.
- Public repo needs a license (MIT) and a README with: what it does, which YouCam API it uses, setup steps, env vars, demo credentials, and a short note on how verdicts are calculated.

## Done when
1. A new user can sign up, add a product, do 2 scans, and see a timeline
2. The verdict engine returns the right verdict on test data for all five cases
3. The explanation shows (or falls back cleanly)
4. "Try the demo" opens a populated account
5. Delete my data works
6. The app is deployed and works on a phone
