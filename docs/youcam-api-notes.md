# YouCam Skin Analysis API notes

Status of issue #2 (API spike). **Part A is from the official docs. Part B must be filled in from a real run** of `scripts/youcam-spike.ts`; nothing in Part A has been confirmed against a live response yet.

Sources: https://yce.perfectcorp.com/ai-api (overview), https://docs.perfectcorp.com/reference/ai_skin_analysis (reference). The reference page was read through a summarising fetch, so treat exact field names as "to verify against the raw output" until Part B is done.

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

## Part B: results of the real run (TODO, fill in)

Run:
```bash
YOUCAM_API_KEY=... node scripts/youcam-spike.ts ~/selfie.jpg --runs 2
```
(16 units per run with the default 16 concerns. Keep the selfie outside the repo.)

- [ ] Full raw response pasted or attached (from `.spike/run-1.json`)
- [ ] Concerns that actually come back, with their score ranges and which direction is better
- [ ] Does `skin_type` return a number or a class?
- [ ] Same photo twice: per-concern |difference| in `raw_score` (the noise floor)
- [ ] How long a task takes (seconds)
- [ ] A rejected photo (e.g. too dark or face too small): exact error shape
- [ ] Is a `file_id` reusable across tasks? (would halve upload calls)
- [ ] Confirm the final list of concerns we request and the resulting units per scan
