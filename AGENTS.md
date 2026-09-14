# HẸN Admin

Read `document/06_CURRENT_SCOPE.md` and `README.md` before implementation. They record the user's latest scope and current setup. Original references remain in `document/01` through `05`.

- Build directly in this Next.js project.
- Use the user-requested design-taste-frontend skill for applicable design choices. Respect the HẸN palette and practical admin workflows.
- Experiments & KPI and Risks & Decisions are deferred. Do not add these modules without a new user request.
- Do not build customer QR/reveal features in this admin.
- Never disguise sample data as a connected workspace or fake successful writes.
- Database writes must be authorized and validated on the server/database; never loosen RLS to make UI work.
- Keep business tables prefixed admin_ and workspace-scoped. Customer private memories are out of scope.
- Run typecheck/lint, relevant Vitest tests and relevant Playwright scenarios. Document checks requiring external services separately.
- Preserve original documents. Record scope changes in 06_CURRENT_SCOPE.md.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
