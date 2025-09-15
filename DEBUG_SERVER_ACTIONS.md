## Next.js Server Actions + Playwright: RSC/Flight stream parse error in test harness

### Summary
- Server Actions work in normal Chrome usage but fail in our Playwright UI tests with the Next.js error overlay:

  - Client: `SyntaxError: No number after minus sign in JSON` (from the RSC/Flight parser)
  - Network: `500 (Internal Server Error)` on the Server Action POST
  - Server: generic RSC digest error (production omits details)

- A standalone minimal Next app + Playwright test does NOT reproduce the error; it passes.

This suggests the failure is specific to our repo’s test environment interacting with the Next RSC/Server Action Flight stream.

### Root cause (identified)
- Global Playwright `use.extraHTTPHeaders` set `Content-Type: application/json` for ALL browser requests, including the Server Action form POST. That header must be omitted so the browser sets a multipart boundary.
- With the forced JSON content type, Next’s form-data parser fails to parse the body, returns 500, and the client’s RSC/Flight parser throws the “No number after minus sign” error.
- Fix: Override headers for the UI project to an empty object so browser-originated requests keep their real headers.

See `playwright.config.ts` (UI project):
```ts
use: {
  baseURL: 'http://localhost:3010',
  extraHTTPHeaders: {}, // do NOT inject JSON headers for UI/browser requests
},
```

### Environment
- Next.js: 15.5.2
- React/React-DOM: 19.1.0
- @playwright/test: ~1.55
- Node: observed Node v24.x locally (consider trying Node 20 LTS)
- Repo layout:
  - `web/` – Next.js app
  - `servers/room-server/` – Hono API server
  - `tests/` – Playwright tests

### Minimal reproduction inside this repo
1) Minimal Server Action route (isolated layout):
   - `web/src/app/(sa)/layout.tsx` (bare layout)
   - `web/src/app/(sa)/sa-hello/page.tsx`:
     - Inline Server Action that early-returns under `PLAYWRIGHT_TEST` (no JSON parsing, no external calls)

2) Minimal UI test:
   - `tests/ui/sa-hello.test.ts` navigates to `/sa-hello`, fills an input, and submits the form.

3) Playwright config (simplified, recommended webServer):
   - `playwright.config.ts` starts Next from `web/` for the `ui` project and starts the room server for the `api` project. For UI tests we only need Next.

4) Run:
```bash
npx playwright test tests/ui/sa-hello.test.ts --project=ui
```

### Observed behavior
- The submit immediately triggers the Next error overlay:
  - Browser console: `Uncaught Error: An error occurred in the Server Components render...` with a `digest`.
  - Client logs: `SyntaxError: No number after minus sign in JSON at position 1` (RSC/Flight parser)
  - Network panel: Server Action POST returns HTTP 500.

### What still runs even for the minimal page
- During `next build`, Next pre-renders other pages (e.g. `/`, `/settings`). Our SSR bootstrap (`getServerUserData`) executes and logs errors (connection refused to the game server). This happens even though the test only navigates to `/sa-hello`.
- At runtime, the `/sa-hello` page itself is isolated via a route group/layout and the action early-returns under `PLAYWRIGHT_TEST`, but the overlay still appears. This implies the failure is in the Server Action stream pipeline itself under this test environment.

### What we have tried
- Isolated Next app to `web/` to avoid multi-lockfile root inference.
- Disabled rewrites during tests (`PLAYWRIGHT_TEST`) to reduce SSR surface.
- Suppressed most server-side `console.*` during tests to avoid polluting stdout.
- Switched to Playwright `webServer` to avoid custom global-setup child processes.
- Created a standalone minimal Next app + Playwright repro in a clean folder – that one passes.

### Hypothesis
RSC/Flight stream is getting corrupted in this repo’s test environment (possibly a tooling/runtime interaction). The client RSC parser chokes and throws the JSON-minus-sign error. The standalone scenario lacks the extra moving parts (API server, monorepo root, pre-rendered pages), so it doesn’t repro.

### Next debugging steps (suggested)
1) Try Node 20 LTS for tests (there are sporadic RSC quirks on newer Node versions).
2) Prevent Next from pre-rendering non-target pages during tests (e.g., add `export const prerender = false` or mark routes as dynamic) to minimize SSR work at build time.
3) Replace inline Server Action with an imported server file (we already tested both styles; still fails here).
4) Capture the Server Action POST at the network level in the test and log the raw response headers/body to see any extra bytes before the Flight payload.
5) Run the same test with `webServer` starting `next dev` (dev Flight) vs `next start` (prod Flight) and compare.
6) Temporarily remove all other pages/components and test again to eliminate any upstream bundling/transform side-effects.

### How to run
```bash
# UI (Next) only — uses Playwright webServer to build/start Next in web/ on port 3010
npx playwright test tests/ui/sa-hello.test.ts --project=ui --reporter=list

# API-only tests, if needed
npx playwright test --project=api --reporter=list
```

Notes:
- Reporter: use `list` to avoid starting the Playwright HTML report server (keeps CI/headless runs lighter, no extra ports).
- Tests must be fully non-interactive: no prompts or manual input; everything should run unattended.
- Never start dev servers manually for tests. The Playwright `webServer` config handles building/starting Next and the API server as needed. Running `npm run dev` or similar outside the test runner will conflict with ports/processes.

### Expected vs Actual
- Expected: submitting the minimal Server Action form on `/sa-hello` does nothing (early-return) and does not show an overlay.
- Actual: the Next overlay appears immediately after the Server Action POST; client shows the RSC parser error; network shows a 500 with RSC digest.

### Why this matters
This blocks UI tests that depend on form-submitted Server Actions. We can add a test-only JSON fallback to proceed with tests, but we’d prefer to fix the root cause so actions are testable via forms.

### References
- React Server Components Flight protocol: https://github.com/reactwg/server-components/discussions/5
- Next Server Actions docs: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions


