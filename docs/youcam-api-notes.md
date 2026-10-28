# YouCam Skin Analysis API notes

Status of issue #2 (API spike). **Part A is from the official docs. Part B is from a real run** (Oct 28, one selfie sent twice, SD, all 16 concerns). A cleaned sample response is in `docs/youcam-sample-response.json` (use it for mocks and seed data).

Sources: https://yce.perfectcorp.com/ai-api (overview), https://docs.perfectcorp.com/reference/ai_skin_analysis (reference). Where Part B contradicts Part A, Part B wins.

## Part A: what the docs say

### Auth and base URL
- Base URL `https://yce-api-01.makeupar.com`
- `Authorization: Bearer <API key>`, `Content-Type: application/json`
- Key lives in the Convex env var `YOUCAM_API_KEY`, server-side only.

### Flow (asynchronous, 4 calls per photo)
1. `POST /s2s/v2.0/file` with `{ "files": [{ "content_type", "file_name", "file_size" }] }` returns `data.files[].file_id` and `data.files[].requests[]` (`method` = PUT, pre-signed `url`, `headers`).
2. `PUT` the image bytes to that pre-signed URL with the listed headers. Skipping this gives a 500 `unknown_internal_error` or a 404 later.
3. `POST /s2s/v2.0/task/skin-analysis` with
   ```json
   { "src_file_id": "<file_id>", "dst_actions": ["redness", "acne", "..."], "format": "json" }
   ```
   returns `{ "status": 200, "data": { "task_id": "..." } }`. (There is also a v2.1 of the create and poll endpoints; the spike uses v2.0.)
4. Poll `GET /s2s/v2.0/task/skin-analysis/{task_id}` until `data.task_status` is `success` or `error` (`running` otherwise). Docs prefer webhooks; polling is supported. Results are kept 24 hours.

Result shape: `data.results.output[]` with `type`, `ui_score`, `raw_score`, `mask_urls`. `mask_urls` are images of your face's analysed regions, so never store or log them.

### Concern names (`dst_actions`)
- **SD** (use this): `wrinkle`, `droopy_upper_eyelid`, `droopy_lower_eyelid`, `firmness`, `acne`, `moisture`, `eye_bag`, `dark_circle_v2`, `age_spot`, `radiance`, `redness`, `oiliness`, `pore`, `texture`, `tear_trough`, `skin_type`
- **HD**: the same with an `hd_` prefix (needs 1080px short side, more units). **Never mix HD and SD** in one request (HTTP 400 `InvalidParameters`).

### Scores
- `raw_score`: float, 1 to 100, **higher = healthier**.
- `ui_score`: integer 1 to 100, deliberately calibrated to look more favourable ("motivational"). **Don't use for verdicts**; use `raw_score`.
- `skin_type` probably returns a classification rather than a score (verify).

### Image requirements (SD)
- jpg, jpeg or png, under 10 MB
- short side at least 480 px; long side auto-resized down to 2560 px
- portrait recommended; face width must be more than 60% of image width (the face should fill roughly 60 to 80% of the frame)

### Errors
- Image quality: `error_below_min_image_size`, `error_exceed_max_image_size`, `error_src_face_too_small`, `error_src_face_out_of_bound`, `error_lighting_dark`. The docs list no dedicated "no face detected" code.
- Bad request: HTTP 400 `{ "status": 400, "error": "...", "error_code": "InvalidParameters" }`
- Units are only consumed when `task_status` is `success`.

### Units (per task, SD)
| Concerns requested | Units |
|---|---|
| 1 to 4 | 9 |
| 5 to 8 | 12 |
| 9 to 12 | 14 |
| 13 to 16 | 16 |

(HD: 12 / 16 / 20 / 22.)

## Consequences for our design (please read)

1. **The unit budget is tight.** One scan is 2 photos, so 2 tasks. With 1,000 free units in total:

   | Concerns requested per photo | Units per scan | Total scans available |
   |---|---|---|
   | 1 to 4 | 18 | about 55 |
   | 5 to 8 | 24 | about 41 |
   | 9 to 12 | 28 | about 35 |
   | 13 to 16 | 32 | about 31 |

   Judges and our own testing share this. Requesting only the concerns we actually show (about 6 to 8, e.g. redness, acne, texture, pore, oiliness, moisture, radiance, dark circles) saves a lot, and the product form can only offer what we request. Recommend also a **global** cap in the scan backend (#5), not just per-user, so signups can't drain the budget.
2. **Higher raw_score = healthier**, which is the opposite of the spec's "lower is better for most". The direction config map in the verdict engine (#6) should say "higher is better" for these scores. For POSSIBLE_IRRITATION, redness getting *worse* means the `redness` raw_score going *down* by more than 2x noise.
3. **Photos do leave our server.** The flow uploads each photo to YouCam's storage (the overview page says uploads are deleted after 24 hours). "Never store photos" holds for our own database and storage; the README should state that photos are sent to YouCam for analysis.
4. **Scans will take seconds, not milliseconds** (upload plus task plus polling, twice). Run the two photos in parallel in the Convex action and show a clear loading state in the Scan UI (#13).
5. **Scan UI limits** (#13): downscale on the client but keep the short side at least 480 px and the file under 10 MB; ask for the face to fill the frame (more than 60% of the width), portrait orientation.
6. **`qualityFlag`**: the docs show no quality score on success, only failure codes. We probably have to derive the flag ourselves (e.g. large photo-1 vs photo-2 difference). Decide after Part B.

## Part B: results of the real run

Run: `YOUCAM_API_KEY=... node scripts/youcam-spike.ts selfie.jpg --runs 2` (selfie 3408x2556 stored landscape, 2.5 MB jpg, accepted without resizing). Both runs returned `task_status: "success"`.

### Flow confirmed
- `POST /s2s/v2.0/file` returns `data.files[0].file_id` and `data.files[0].requests[0]` = `{ method: "PUT", url, headers: { "Content-Length", "Content-Type" } }`.
- Create task returns `data.task_id`. Poll returns `{ status: 200, data: { task_status, error, results } }`.
- **Time per photo: 6.5 s and 8.4 s** (polling every 2 s). Two photos in parallel should take about 8 to 10 s per scan.

### What comes back (21 outputs for 16 requested concerns)
`data.results.output[]` entries:

| `type` | Fields | Observed values |
|---|---|---|
| `eye_bag`, `tear_trough`, `droopy_lower_eyelid`, `droopy_upper_eyelid`, `pore`, `firmness`, `redness`, `texture`, `oiliness`, `age_spot`, `acne`, `radiance`, `dark_circle_v2`, `wrinkle`, `moisture` (15 scored concerns) | `raw_score` (float), `ui_score` (int), `mask_urls` (array), `url` (null) | raw 35.2 to 100, ui 63 to 99 |
| `skin_type` (3 entries, `region` = `whole`, `t_zone`, `u_zone`) | `skin_type` (string, e.g. `"Oily"`), `mask_urls`. **No numeric score.** | "Oily" |
| `all` | `score` (one number, not raw/ui) | 72.7 |
| `skin_age` | `score` | 26 |
| `resize_image` | `mask_urls` only | n/a |

So **15 concerns are usable as numeric scores**. `skin_type`, `all`, `skin_age` and `resize_image` have no `raw_score`: skip or handle separately. `mask_urls` link to images of the face: never store or log them.

### Noise: identical photo gives identical scores
Running the **same photo twice gave exactly the same score for every concern (|diff| = 0)**. The API is deterministic. So all the noise we will see comes from the photo itself (light, angle, distance, expression), which is exactly what the 2-photos-per-scan design measures. This also means identical-input tests can't tune the noise thresholds. To tune `maxNoiseToRangeRatio` and `noiseFloor` we need **two different photos taken back to back** (16 units).

### Scores
- `raw_score` is 1 to 100 and higher is healthier (consistent with the docs). `ui_score` is compressed upward (moisture 35 raw is 64 ui; redness 100 raw is 99 ui), so verdicts use `raw_score`.
- **`redness` came back as exactly 100 (the ceiling).** If redness is often saturated, WORKING can never be shown for redness, and POSSIBLE_IRRITATION can only trigger when it drops from 100. This is one sample; check on more photos (and across skin tones) before relying on redness.

### Errors
A task can be rejected after creation: create-task still returns HTTP 200, and the poll returns
```json
{ "status": 200, "data": { "error": "error_below_min_image_size", "error_message": "The input image is below the minimum required resolution.", "results": null, "task_status": "error" } }
```
(tested with a 100x100 image; came back in 2.1 s). The other quality codes from the docs are `error_src_face_too_small`, `error_src_face_out_of_bound`, `error_lighting_dark`, `error_exceed_max_image_size`. Not yet triggered: no-face and bad-lighting cases. Treat any `task_status: "error"` as a typed error in #5, keyed by `data.error`.

### Units: confirmed from the YouCam console (Unit Records)
Balance went 1,000, then 984, then 968 for the two spike runs: **16 units per photo with 16 concerns**, as in the docs table. The rejected tiny-image test showed **-9 then +9**: a task is **charged when created and refunded if it ends in `error`**. So rejected photos cost nothing in the end, but the balance dips briefly. (The docs say units are only consumed on success; the refund explains the difference.)

### Not tested (to save units)
- Whether a `file_id` can be reused for a second task.
- Whether the API honours a photo's EXIF rotation tag. The selfie was stored landscape but displays portrait, and it was accepted, so either works. The Scan UI should still draw photos through a canvas, which bakes the rotation in.

### Image resolution changes the scores (live check, Oct 28)
The same selfie sent at full size (3408x2556) and downscaled to 900x1200 gave different scores for the 8 proposed concerns:

| Concern | Full size | 900x1200 | Difference |
|---|---|---|---|
| pore | 39.4 | 44.2 | +4.8 |
| acne | 68.6 | 67.2 | -1.4 |
| redness | 100 | 98.9 | -1.1 |
| oiliness | 45.4 | 45.9 | +0.5 |
| moisture | 35.2 | 34.7 | -0.5 |
| texture | 54.8 | 54.6 | -0.3 |
| radiance | 57.9 | 57.7 | -0.1 |
| dark_circle_v2 | 75.2 | 75.1 | -0.1 |

A third size (540x720, JPEG quality 55) gave pore 43.0, acne 69.9, moisture 33.0, so both size and compression matter. (The downscaled files were also re-oriented to portrait, so rotation may contribute.) A "real" change from a skincare product is a few points, so **every photo must be resized the same way**, or scans taken at different sizes would show fake changes. The Scan UI uses one fixed recipe: canvas resize to a 1200 px long side, JPEG quality 0.85 (see `docs/api-contract.md`). Also note redness is no longer exactly 100 at this size (98.9), so the "ceiling" concern above is milder than it looked.

The scan backend client was checked live with this recipe: it took 4.3 s for one photo of 211 KB from Node, and 2.9 s for a 27 KB photo running inside the Convex runtime on the dev deployment.

### Proposed concern list to request (Nana to confirm)
Request only what we show. Suggested 8: `acne`, `redness`, `pore`, `texture`, `oiliness`, `moisture`, `radiance`, `dark_circle_v2`. That is the 5 to 8 tier: **12 units per photo, 24 per scan, about 41 scans from 1,000 units.** Dropping to 4 concerns (e.g. acne, redness, texture, moisture) is 9 units per photo, 18 per scan, about 55 scans.

### Checklist
- [x] Raw response and concern list with score ranges
- [x] `skin_type` returns a string per region, no number
- [x] Same photo twice: no difference at all
- [x] Task time: 6.5 to 8.4 s
- [x] Rejected photo shape (too small)
- [ ] Real photo-to-photo noise (needs 2 different back-to-back photos)
- [ ] No-face and too-dark error cases
- [ ] `file_id` reuse
- [ ] Final concern list confirmed
