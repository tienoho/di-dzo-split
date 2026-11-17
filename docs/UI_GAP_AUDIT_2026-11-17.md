# Dzô! Split — UI, calculation and API gap audit (2026-11-17)

## Scope
Source review of React 19 / Vite / Tailwind CSS 4 frontend, Firebase persistence, sharing, and Express APIs. This is **not** a production-device or deployment acceptance report.

## Addressed on this branch
- Tailwind 4 class-driven `dark:` styles, saved-theme first paint, reduced-motion and keyboard focus.
- Mobile thumb-friendly 5-item bottom navigation (four main sections + three in More); safe-area spacing; desktop tabs retained.
- Unsupported Tailwind palette shades replaced with supported classes across primary screens.
- Whole-VND allocation using largest remainders for equal and percentage splits; roulette sum reconciliation; stricter save validation and self-debtor status.
- Money shorthand input supports `500k`, `1,5tr` and `1.000k` without destroying decimal punctuation mid-entry.
- Cloud short links returned only after a successful write; otherwise self-contained URL fallback.
- Public bill write access restricted to authenticated owner; shared document omits scanned receipt images and contact fields. Viewer does not silently use the viewer's own bank account for VietQR.
- Receipt OCR errors no longer inject invented amounts. Unavailable FCM no longer reports simulated delivery as real success.
- Node unit regressions for allocation and money parsing; GitHub Actions typecheck/unit/build gate.

## Deployment notes
1. **Deploy updated Firestore security rules** separately to the correct Firebase project. Merging frontend code alone does not update deployed rules.
2. Existing `public_bills` entries without `ownerUid` are readable but cannot be updated under the new policy. Guests get a self-contained link rather than a cloud short link.
3. Public share links (including portable encoded links) deliberately expose the selected invoice and recipient bank details to anyone holding the link; avoid publishing them in open channels.
4. Deploy the updated API with the client; OCR and FCM now fail closed where real providers fail.

## Follow-up gaps not claimed as closed
| Priority | Gap | Required verification / design |
| --- | --- | --- |
| P0 | FCM token collection has public reads and unauthenticated write semantics; `/api/send-fcm` lacks recipient authorization and rate limiting | Redesign subscription ownership and enforce authenticated server authorization/quotas before public notification rollout |
| P0 | Legacy records and cloud/local synchronization can resurrect deleted records after offline stale merge | Durable tombstones, versioned conflict resolution, account-switch race tests |
| P1 | Debt settlement uses one boolean per debtor; multi-creditor bills cannot record partial and per-recipient transfers | Transaction-level settlement ledger, audit and migration |
| P1 | No automated browser E2E or screenshot baseline for 320–768px and light/dark | Playwright viewport suite on deployed staging, iOS/Android device UAT |
| P1 | Public bill reads are intentionally unauthenticated and bank details are included | Privacy retention/expiry policy and revoke link support |
| P2 | Several modules are oversized single-file components and re-mount on each tab switch | Extract view-model hooks, lazy load feature modules and add performance profiling |

## Acceptance checklist
- `npm ci && npm run lint && npm test && npm run build`.
- Save splits with 1/2/3/7 people including odd-VND amounts; sum all shares and upfront payments exactly.
- Check guest/offline sharing, signed-in short sharing, and authenticated overwrite protection across two accounts.
- Verify that failed OCR cannot fill random monetary values; failed FCM cannot claim delivered.
- Test 320, 375, 390, 430, 768, 1024px viewports, landscape, keyboard opening, screen reader focus, light/dark and reduced motion.
