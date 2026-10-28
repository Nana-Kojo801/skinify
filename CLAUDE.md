# Receipts: working agreement for Claude

Hackathon project (YouCam API, **deadline Nov 2**). Two people build it: **Nana** and **Dave**. They both use the **same Claude account and the same GitHub account**, so GitHub cannot tell them apart. You have to ask.

Full spec: `docs/SPEC.md`. Master plan and schedule: GitHub issue #21 ("Project plan and work split").

## 1. FIRST THING IN EVERY SESSION: ask who is working

Before doing anything else, ask:

> Who's working right now: **Nana** or **Dave**?

Do not guess from the git config, the GitHub login or the machine. The GitHub login is always Nana's. Do not continue until you have an answer. If the user already said their name in their first message, use that and don't ask again.

Remember the answer for the rest of the session. Then:

1. Fetch that person's open issues with the GitHub MCP tools (`mcp__github__list_issues`, repo `nana-kojo801/receipts`, `state: OPEN`, `labels: ["owner:nana"]` or `["owner:dave"]`). Load the tools with ToolSearch if needed.
2. Show a short list (number, title, blocked or not) and recommend the next one to work on: lowest-numbered unblocked issue, with `blocker`-labelled issues first. Check the "Depends on" line of the issue and whether the dependency is already merged.
3. Work **only** on that person's issues. Never pick up the other person's issues unless the user explicitly says to. If a task would need changes in the other person's area, say so and leave a comment on the relevant issue instead (see section 3).
4. Issues labelled `owner:nana` **and** `owner:dave` (final QA) are shared.

How ownership is marked on issues: label `owner:nana` / `owner:dave`, and the name in brackets at the end of the title, e.g. `M2: Scan page UI ... (Dave)`.

When a task is done: check off the checklist in the issue, comment with what was done (and anything the other person needs to know), and close the issue only when its "Done when" is met.

## 2. Project in one paragraph

Mobile-first PWA where a user logs skincare products, scans their face weekly (2 photos per scan) with YouCam's Skin Analysis API, and gets an honest verdict on whether each product is working (TOO_EARLY, CANT_TELL, POSSIBLE_IRRITATION, WORKING, NO_VISIBLE_CHANGE). **Functionality first**: simple clean UI, no visual polish, don't ask for UI mock approval.

## 3. Who owns what (to avoid merge conflicts)

| Area | Owner |
|---|---|
| `convex/**` (schema, functions, actions, `convex/lib/**` incl. the verdict engine), seed/reset scripts, README, deployment | **Nana** |
| `src/pages/**`, `src/components/**`, PWA setup, `convex/auth.ts` + `convex/account.ts` (auth and account deletion) | **Dave** |

- `convex/schema.ts` is **Nana's**. If Dave needs a table or field changed, comment on the schema issue (#4) instead of editing it.
- Shared contract files: `docs/api-contract.md` (Convex function signatures, written by Nana) and `docs/youcam-api-notes.md` (written by Nana after the API spike). Read them before building against the backend. If a function doesn't exist yet, build against a mock and say so in the issue.
- Tiny cross-area fixes (a typo, an import) are fine; mention them in the commit message.

## 4. Stack and conventions

- React + Vite + TypeScript + TailwindCSS + shadcn/ui + Convex
- Convex Auth, **email + password only**. No email verification, no password reset.
- OpenRouter (free model) for explanation text
- **kebab-case file names**, per-page directories with nested `components/` (`src/pages/<page>/<page>-page.tsx`), **named exports only** (no default exports)
- Mobile-first layout
- Verdict thresholds live in **one config file** (`convex/lib/verdict/verdict-config.ts`); never hard-code thresholds elsewhere

## 5. Hard rules

- **Never guess YouCam endpoints, request shapes or response fields.** Read `docs/youcam-api-notes.md` and the official docs (https://yce.perfectcorp.com/ai-api). If neither covers it, stop and ask the user to paste the docs or a sample response.
- All YouCam and OpenRouter calls happen **server-side in Convex actions**. API keys live in Convex env vars (`YOUCAM_API_KEY`, `OPENROUTER_API_KEY`), **never in the client, never committed**. Never commit `.env.local` or test selfies.
- **Store scores only. Never store photos** (no Convex file storage, no localStorage, no logging of image data).
- YouCam units are limited (1,000 free total). Don't make unnecessary API calls. Use seeded demo data for UI work. A per-user daily scan limit is enforced server-side.
- The **demo account must always work** (until Nov 20): it runs on seeded data, can't do live scans and can't be deleted. Signup stays open.
- The LLM explanation gets **only structured numbers** and must never invent scores or diagnose; always fall back to a templated sentence.
- Public repo: MIT license, no secrets in git history.

## 6. Git workflow

- Follow the branch your session environment designates. If none is designated, use one branch per issue named `<name>/<issue-number>-<slug>` (e.g. `dave/13-scan-ui`, `nana/5-scan-backend`).
- Commit small and often, mention the issue (`Refs #13` / `Closes #13`) in commit messages.
- Keep changes minimal and in your own area to keep merges painless; pull/merge `main` before starting a new issue.
- **Do not open a pull request unless the user asks.** Do not push to `main` directly unless the user asks.
- Before committing: run typecheck, lint and tests (`npm run build`, `npm test`) once the scaffold exists.

## 7. Open decision (Nana resolves in issue #1)

How the two of us share Convex during development (separate dev deployments vs one shared). Until it is written here, **don't run `npx convex dev` against a deployment you didn't create yourself**, and ask the user which deployment to use.
