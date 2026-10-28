# Backend contract (Convex functions)

What the frontend can call. Written by Nana for Dave, so the UI can be built now (against mocks where a piece is marked "not yet") and swapped to the real thing without changes. Types come from `convex/_generated/api` (`api.<module>.<function>`) and the shared helpers from `shared/` (import with the `@shared/...` alias).

**Signed-out behaviour:** queries return `[]` / `null` (they never throw). Mutations and actions throw `ConvexError` with `data.code === 'NOT_AUTHENTICATED'`.

All timestamps are milliseconds since epoch. All scores are YouCam `raw_score` (1 to 100, **higher = healthier**).

## Concerns
`import { CONCERNS, CONCERN_KEYS, type ConcernKey } from '@shared/concerns'`

`CONCERNS[key] = { label, hint }` for `acne, redness, pore, texture, oiliness, moisture, radiance, dark_circle_v2`. The product form's dropdown is built from this; change the list there, nowhere else.

## Products (`convex/products.ts`)
| Function | Args | Returns |
|---|---|---|
| `query products.list` | none | products, newest first |
| `query products.get` | `{ productId }` | product or `null` (missing or not yours) |
| `mutation products.create` | `{ name, targetConcern, startDate? }` | new `productId`. `startDate` = start of the start day, defaults to start of today (UTC). Send the start of the user's local day if you want local days. |
| `mutation products.update` | `{ productId, name?, targetConcern?, startDate?, endDate? }` (`endDate: null` clears it) | nothing |
| `mutation products.remove` | `{ productId }` | nothing (also deletes the product's verdicts; scans stay) |

Product: `{ _id, _creationTime, userId, name, targetConcern, startDate, endDate? }`. Validation errors: `ConvexError` with `data = { code: 'INVALID_INPUT', message }` (message is safe to show).

## Scans (`convex/scans.ts`)
| Function | Args | Returns |
|---|---|---|
| `query scans.list` | none | all of the user's scans, **oldest first** (for the timeline) |
| `query scans.latest` | none | newest scan or `null` |
| `query scans.usage` | none | `{ usedToday, dailyLimit, remaining, nextScanAt, isDemoAccount, serviceAvailable, canScan }` |
| `action scans.submit` | `{ photos: [{ data: ArrayBuffer, contentType }, {...}] }` (exactly 2) | `{ scanId, scores, noise, qualityFlag }` |

Scan: `{ _id, userId, createdAt, scores: Record<concern, number>, noise: Record<concern, number>, qualityFlag: boolean }`. `scores` is the average of the 2 photos, `noise` is `|photo1 - photo2|`, `qualityFlag` is true when the two photos disagreed broadly (treat as a poor-quality scan).

**Use `scans.usage` to decide what the Scan/Home UI offers:** show the "New scan" button only when `canScan`; if `remaining === 0` show when `nextScanAt` is; `isDemoAccount` means "Demo runs on sample data"; `serviceAvailable === false` means the shared free budget is used up.

### Calling `scans.submit`
```ts
import { useAction } from 'convex/react'
import { ConvexError } from 'convex/values'
import { api } from '../../../convex/_generated/api'
import { isScanErrorData } from '@shared/scan/scan-errors'

const submit = useAction(api.scans.submit)

const photos = await Promise.all(
  [blob1, blob2].map(async (blob) => ({ data: await blob.arrayBuffer(), contentType: blob.type })),
)
try {
  const result = await submit({ photos }) // takes about 8 to 10 seconds: show a loading state
} catch (e) {
  if (e instanceof ConvexError && isScanErrorData(e.data)) {
    // e.data.code, e.data.message (safe to show), e.data.photo, e.data.retryAt
  } else {
    // network error: generic "check your connection" message
  }
}
```

### Preparing the photos (important)
**Resize every photo with the same recipe**: draw it on a canvas so the longest side is **1200 px** (never upscale), export as **JPEG quality 0.85**. Drawing through a canvas also applies the photo's rotation. Don't skip or vary this: the same face scores up to about 5 points differently at different resolutions (`docs/youcam-api-notes.md`), which would look like a skin change. Limits: JPEG or PNG, at most 5 MB each, short side at least 480 px, and the face should fill the frame (more than 60% of the width). Never store the photos anywhere on the client either.

### Errors (`e.data.code`)
| Code | When | What the UI does |
|---|---|---|
| `LOW_QUALITY_PHOTO` | YouCam rejected a photo (too dark, face too small or out of frame, too small a file). `e.data.photo` is 1 or 2. | Show `message`, offer to retake that photo. Costs nothing. |
| `DAILY_LIMIT` | 3 scans in the last 24 hours. `e.data.retryAt` says when. | Show `message` and the time. |
| `SERVICE_LIMIT` | The app's shared free YouCam budget is used up. | Show `message`. |
| `DEMO_ACCOUNT` | The demo account tried a live scan. | Show `message` (the button should already be hidden). |
| `INVALID_INPUT` | Not exactly 2 photos, wrong type or size. | Show `message`, retry. |
| `API_ERROR` | YouCam or our setup failed. | Show `message` with a Retry button. |
| `NOT_AUTHENTICATED` | Signed out. | Redirect to login. |

## Verdicts (`convex/verdicts.ts`)
| Function | Args | Returns |
|---|---|---|
| `query verdicts.latestForProduct` | `{ productId }` | newest verdict row or `null` |
| `query verdicts.latestForAll` | none | `[{ productId, verdict: row \| null }]`, one per product (for Home) |

Verdict row: `{ productId, userId, createdAt, verdict, summary, summarySource, reasons, rescanAdvice, inputs }`
- `verdict`: `TOO_EARLY | CANT_TELL | POSSIBLE_IRRITATION | WORKING | NO_VISIBLE_CHANGE`
- `summary`: the explanation text, 3 to 4 sentences plus one sentence starting with `Next step:`. **It always has text**: a templated version is stored the moment the verdict is created, and is replaced a few seconds later by the AI-written version (`summarySource` changes from `'template'` to `'model'`) if that succeeds. Because the queries are reactive, the card just updates by itself. Show `summary` as is; don't treat `'template'` as an error or a loading state.
- `reasons`: for `CANT_TELL`, a list of `FEW_BASELINE_SCANS | NOISY_SCANS | POOR_QUALITY`; `rescanAdvice` has one sentence per reason saying what would fix it. Empty for other verdicts.
- `inputs`: the numbers behind it (`shared/verdict/verdict-types.ts`, `VerdictInputs`): `change`, `improvement`, `noise`, `noiseThreshold`, `baselineMean`, `recentPostMean`, `baselineCount`, `postCount`, `worsening`, ... All numbers or `null`. **`inputs.daysSinceStart` / `daysRemaining` are as of when the verdict was computed**, so for "day N" shown live compute it from `product.startDate`.

**When verdicts appear:** a product gets one as soon as it is created (usually `TOO_EARLY`), after every scan, when the product's start date or target concern changes, and once a day. Nothing to call from the UI. A product with no row yet (the first moment after creating it) means `verdict: null`: show "Add scans to get a verdict".

## Demo account
`DEMO_EMAIL` / `DEMO_PASSWORD` (`shared/demo-account.ts`) sign into a seeded account with 3 products (WORKING, NO_VISIBLE_CHANGE, CANT_TELL) and 7 weekly scans. It is **read-only**: `products.create/update/remove` throw `DEMO_ACCOUNT` and `scans.submit` throws `DEMO_ACCOUNT`, so hide those buttons when `scans.usage` says `isDemoAccount`. **Account deletion (#12) must refuse the demo user too**: use `isDemoUser(ctx, userId)` from `convex/helpers.ts` and throw the same `DEMO_ACCOUNT` error. The account and its data are created and restored by `npm run reset-demo` (Nana).

## Not yet available
- Account deletion and Convex Auth setup are yours (#12, #3). Every table has a `userId` index (`products.by_user`, `scans.by_user_and_createdAt`, `verdicts.by_user`) so wiping a user is a few queries. `usageCounters` is app-wide and must NOT be deleted.

## Mocks while the backend is incomplete
`docs/youcam-sample-response.json` is a real YouCam response (face links removed). A mock scan for the UI looks like:
```ts
{ _id: 'mock-1', createdAt: Date.now(), qualityFlag: false,
  scores: { acne: 68, redness: 99, pore: 44, texture: 55, oiliness: 46, moisture: 35, radiance: 58, dark_circle_v2: 75 },
  noise: { acne: 1, redness: 1, pore: 2, texture: 1, oiliness: 1, moisture: 1, radiance: 1, dark_circle_v2: 1 } }
```

## Dev deployment and live scans
Each of us has our own Convex deployment (`CLAUDE.md` section 7). Live scans spend shared YouCam units, so **use mocks for UI work** and only set `YOUCAM_API_KEY` on your deployment if you really need a live scan (ask Nana for the key; never commit it).
