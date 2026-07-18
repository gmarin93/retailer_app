# MCP servers (Claude Code)

Project: **pw-react/retailer_app**

Project MCP config lives in [`.mcp.json`](../.mcp.json). After clone or change:

1. Restart Claude Code (or open a new session in this repo).
2. Run `/mcp` and **approve** each project server.
3. For GitHub, choose **Authenticate** in that panel (OAuth).

This repo already has `@playwright/test` and `e2e/`. Prefer `npm run test:e2e` for committed specs; use the Playwright MCP for ad-hoc browser exploration of `npm run dev`.

Chromium is typically already on this machine under `~/Library/Caches/ms-playwright/`. You do **not** need a global `npx playwright install` from `~` for MCP — if e2e browsers are missing, run `npx playwright install` **inside this project** (after `npm install`).

## Configured servers

| Server | What it gives Claude | Notes |
| --- | --- | --- |
| `playwright` | Drive Chromium against local Next.js | Great for smoke-checking migrated screens |
| `github` | Issues, PRs, reviews | Sign in with `/mcp` |
| `context7` | Current Next.js / React / TanStack / Zod docs | Ask Claude to “use context7 for …” |

## Related repos

Prefer Claude `/add-dir` over a filesystem MCP:

- `/Users/glenmarin/Documents/Development/club-powerhouse-api` — Django API
- `/Users/glenmarin/Documents/Development/club-powerhouse-web-react` — sibling Next.js app
- `/Users/glenmarin/Documents/Development/club-powerhouse-web` — legacy Angular (if needed)

## Optional later

| Server | When | How |
| --- | --- | --- |
| **Sentry** | Prod web error triage | `claude mcp add --transport http sentry --scope project https://mcp.sentry.dev/mcp` |
| **Figma** | Design → shadcn implementation | Remote Figma MCP via `claude mcp add` |
| **Linear / Jira** | Ticket → vertical migration | Remote HTTP via `claude mcp add --transport http …` |

## CLI helpers

```bash
claude mcp list
claude mcp get playwright
claude mcp reset-project-choices
```
