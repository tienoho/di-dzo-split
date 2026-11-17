# Dzô! Split — Remediation register and release gates
Updated: 2026-11-17 · Source: `tienoho/di-dzo-split` · PR #1

## Scope
React 19, Vite 6, Tailwind 4, Firestore/Firebase Auth and Express/Vercel.
This register distinguishes **implemented source code**, **automated test coverage**, and **deployment verification**. A passing GitHub build never proves Firebase permissions, iOS behavior, or production PSP integration.

## Changes implemented in this PR
| Area | Remediation |
| --- | --- |
| Mobile UI | Bottom navigation; keyboard focus, reduced motion, dark mode first paint; corrected invalid Tailwind palette classes; prevented 320px overflow and navigation intercept |
| Money | Exact whole-VND equal, percentage and roulette allocations, strict sum validation, money shorthand input |
| Debt | Transfer-level payment events, multiple partial payments, balance tracking, reset event history, legacy paid flag fallback |
| Cloud | Per-entity revisions, tombstones for bills/venues/contacts, login/session race guards and a reset epoch for stale devices |
| FCM | Removed name-based public token directory, private owner account token mapping; Firebase ID verification for owner-device self-test; Firestore transaction rate limit; third-party push deliberately disabled until explicit recipient binding/consent |
| AI API | Fail-closed OCR and FCM; 12MB JSON limit, OCR base64/image checks, recommendation input caps, per-IP Firestore-backed AI request quota on Vercel |
| Public bill | Owner-only writes, no receipt/private contacts in public payload, time-limited links, no collection listing, one-way revoke, owner re-share preserving expiry, no short-link local fallback, current link forwarding by viewers, payment updates in the public snapshot |
| VietQR | Correct remaining amount after partial payments; prevent QR when the recipient account cannot be uniquely determined |
| Community reviews | Review documents by Firebase UID, no client-authored venue aggregate rating changes, mean rating derived from reviews |
| Reset | Chunked private collection deletion, revocation attempt of known cloud links, no local wipe if cloud deletion fails, durable account reset epoch |
| Quality | Unit tests for money, debts, payment ledger and versioned sync; Playwright Chromium mobile/desktop tests (320/375/390/430/768/1024px), automated lint/test/build via Actions |

## Release gates requiring external access
1. **Merge only after current GitHub Actions statuses are green.** Earlier failures were during iterative changes; consult the HEAD SHA rather than historical runs. Frontend CI covers typecheck/unit/build; Playwright runs 16 browser checks, not physical device UAT.
2. **Deploy Firestore rules explicitly** against the *correct project/database*, review them with Firebase Rules Emulator and two real authenticated accounts. GitHub/Vercel builds do not deploy Firebase rules. Security will remain open in production until verified.
3. **Migrate old public bills** after taking a Firestore backup. `scripts/migrate-public-bills.ts` is DRY RUN by default and requires Firebase Admin ADC; `MIGRATION_APPLY=yes` enables writes. Existing documents without owner IDs are revoked; owner-backed old documents receive expiry. Review dry-run counts and notification to users before applying.
4. **Verify real data flows on Firebase staging**: create/edit/delete, offline reconnection, stale-device recovery, account switching, partial pay/undo across devices, revoked and expired public URLs, community venue reviews, push self-test permission/quotas. Do not silently import unrelated guest data into an account.
5. **Verify backend deployment secrets**: Firebase Admin Application Default Credentials/Google service account, Firestore database id, AI keys, VAPID public key; ensure serverless quota transactions work under concurrent requests. Rate-limit failures should fail closed.
6. **Perform physical mobile UAT** on iOS Safari and Android Chrome, including notches/safe area, 320px/landscape, keyboard overlay, dark/light contrast, VoiceOver/TalkBack and VietQR transfer to the correct account.
7. **Dependency audit**: `npm ci` previously reported 27 vulnerabilities (13 moderate, 13 high, 1 critical) across the full dependency tree. Investigate production reachability using `npm audit --omit=dev` and upgrade compatible package/lockfile versions before production; do not blindly use force.
8. **Data privacy**: Guest self-contained URLs cannot be remotely revoked. Strong revocation requires authenticated owner cloud links. Public link holders can still view member names, balances and intended payee bank details before expiry. Define retention, consent and removal policy.

## Deliberately not claimed complete
- **Cross-account push-to-friend** is disabled for security. To enable: verified recipient UID, explicit consent per group, server-side owner/member authorization, delivery audit and abuse controls.
- **Payment ledger is client-authored** in user-scoped Firestore; unit tests are not proof of multi-device transactional consistency or financial-grade immutable audit. Real-money reconciliation needs idempotent server-side transactions, payment provider confirmations, and an append-only storage model.
- **Versioned sync is last-write-wins**, with tombstones and account reset fencing. It is not full per-field CRDT merge; conflicting concurrent edits across devices can still overwrite one another.
- **Cloud reset is not guaranteed atomic** across subcollections and public documents; it requires an operational deletion job and evidence for privacy/legal deletion guarantees.
- **Remaining large components** still merit extraction, virtualization, route-level code splitting and performance profiling; Playwright navigation tests do not measure production Core Web Vitals.
- **External services and device tests** cannot be marked passed from source review or a simulated browser alone.

## Review checklist
- `npm ci && npm run lint && npm test && npm run build`.
- `npx playwright test` in the pinned Playwright container on CI; review 16 browser cases.
- Same payment record is never over-counted; check 1đ rounding, split across 3/7 people, multi-payer/partial/refund reset, double-click concurrency.
- Revoke a short link, then attempt re-share/update/access from a second account; no revival.
- Test public read/list rules with unauthenticated client; create/update only by owner, token directory blocked.
- Test stale offline entity + newer deletion tombstone and epoch reset on a second device.
