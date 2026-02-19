# Security + Frontend Audit Issue Catalog (2026-02-19)

## 1) Frontend architecture: split teleprompter runtime script into modules
- Category: Frontend best practice
- Severity: Medium
- Status: Open

### Title
Frontend: decompose `teleprompter.html` inline runtime into maintainable modules

### Body
`teleprompter.html` still carries a large inline runtime script, including a parser copy that duplicates logic in `src/parser.js`. This creates drift risk, weak testability, and slows future changes.

#### Proposed scope
- Move runtime logic to module files under `src/` (parser, renderer, controls, state)
- Import built assets in HTML instead of embedding a monolithic inline script
- Ensure parser implementation is single-source-of-truth
- Preserve existing UX and keyboard behavior

#### Acceptance criteria
- No duplicated parser implementation between app runtime and `src/parser.js`
- Existing parser and worker tests still pass
- Runtime behavior unchanged from user perspective

## 2) Security: remove dependency on `style-src 'unsafe-inline'`
- Category: Security posture
- Severity: Medium
- Status: Open

### Title
Security: eliminate `style-src 'unsafe-inline'` by replacing inline style mutations

### Body
CSP currently includes `style-src 'unsafe-inline'` due dynamic inline style usage. This meaningfully weakens CSP hardening.

#### Proposed scope
- Replace `element.style.*` mutations with class toggles/CSS variables where feasible
- Remove inline style attributes and `cssText` usage
- Tighten CSP `style-src` to `'self'` (no `'unsafe-inline'`)
- Add worker tests asserting CSP no longer includes `'unsafe-inline'`

#### Acceptance criteria
- App behavior unchanged
- CSP enforces non-inline style policy
- Test coverage verifies the stricter policy

## 3) Security: add upload abuse controls
- Category: Security posture
- Severity: Low/Medium
- Status: Open

### Title
Security: implement rate limiting and abuse protection for `/upload`

### Body
`POST /upload` is unauthenticated, but production now has an existing Cloudflare WAF rate-limit control: more than 3 attempts from a single IP triggers a 10-second block. This materially mitigates basic burst abuse on the free plan. Remaining risk is primarily defense-in-depth (e.g., distributed sources, noisy low-and-slow traffic, and lack of app-level telemetry on blocked attempts).

#### Proposed scope
- Keep existing CF WAF rule as baseline control
- Add optional app-level guardrail only if abuse is observed (e.g., lightweight heuristic counters or turnstile gate)
- Add operational visibility to track `/upload` pressure and blocked requests over time

#### Acceptance criteria
- Existing WAF threshold is documented in runbook/repo docs
- Monitoring can distinguish normal upload volume from blocked/abusive patterns
- Any new app-level mitigation is justified by observed abuse data (not change for change's sake)

## 4) Completed in branch `codex/security-frontend-hardening`
- Category: Implemented remediation
- Severity: Medium
- Status: Resolved on branch

### Title
Frontend/Security: externalize page CSS and harden worker headers/CORS

### Body
Resolved in commit `3acdc11` on branch `codex/security-frontend-hardening`.

#### Delivered
- Extracted monolithic inline CSS into `styles/teleprompter.css` and `styles/guide.css`
- Updated HTML pages to load external stylesheets
- Worker now serves stylesheet routes (`/styles/teleprompter.css`, `/styles/guide.css`)
- Added stricter security headers (`HSTS`, `COOP`, `CORP`, `Permissions-Policy`)
- Replaced wildcard CORS with explicit allowlist for production + local dev
- Added worker tests for headers, CORS, and stylesheet serving
