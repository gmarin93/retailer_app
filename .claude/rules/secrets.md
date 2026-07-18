# Secrets and credentials

Never read, edit, commit, or paste:

- `.env.local`, `.env*.local` (machine overrides)
- `e2e/.auth/**` (Playwright saved auth state / cookies)
- `*.pem` private keys
- Auth tokens, passwords, or API keys from session storage / network logs

Committed `.env.development` / `.env.production` / `.env.example` only hold public `NEXT_PUBLIC_*` URLs and flags. Still never invent production credentials or hardcode tokens in source.

If a task needs a new env var, add it to `.env.example` with a placeholder and document it — do not put real secrets in the repo.
