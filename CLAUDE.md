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

Each person has their own long-lived branch, based on the answer to "who is working" in section 1:

| Person | Branch |
|---|---|
| Nana | `claude/nanakojo` |
| Dave | `claude/dave` |

- Work on **your person's branch** (`claude/nanakojo` or `claude/dave`). If it doesn't exist yet, create it from the latest `main`. This applies even if the session environment suggests a different branch name: use the person's branch.
- Before starting an issue, merge the latest `main` into your branch so you build on the other person's merged work.
- Commit small and often, mention the issue (`Refs #13` / `Closes #13`) in commit messages.
- Push to your own branch only. **Never push directly to `main`**; changes reach `main` through a **pull request** from your branch.
- Open a pull request into `main` when a change or issue is ready (don't wait for the end of the project). Put the issue number in the PR title/description (`Closes #13`). The other person reviews and merges, or the user merges it.
- If your branch's previous PR has already been merged, bring your branch up to date with `main` before continuing, so you don't stack new commits on stale history.
- Keep changes minimal and in your own area to keep merges painless (section 3).
- Before committing: run typecheck, lint and tests (`npm run build`, `npm test`) once the scaffold exists.

## 7. Convex during development (decided in issue #1)

Each person develops against **their own Convex dev deployment**, so schema pushes don't clash:

- **Nana**: the main `receipts` Convex project (its dev deployment, plus the prod deployment used for the final deploy).
- **Dave**: a **separate** Convex project, created once with `npx convex dev --configure new` (name it e.g. `receipts-dave`). It is written to the git-ignored `.env.local`, so nothing leaks between machines.
- Every deployment needs its own env vars (`YOUCAM_API_KEY`, `OPENROUTER_API_KEY`, and the Convex Auth keys from `npx @convex-dev/auth`). See `.env.example`.
- `convex/_generated/` **is committed**, so a fresh clone typechecks. Re-run `npx convex dev` after changing `convex/` and commit the regenerated files.
- Never point `npx convex dev` at someone else's deployment. If unsure which one `.env.local` points to, ask the user.
- Dave's dev deployment starts empty: run the demo seed there (from the seed issue) to get sample data without spending YouCam units.
