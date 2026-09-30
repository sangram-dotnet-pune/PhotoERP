# PhotoERP — Application Audit

**Date:** 2026-09-30
**Scope:** `src/` (React 19 + TypeScript + Vite) and `src-tauri/src/` (Rust + SQLite)
**Method:** Read-only static analysis. No application code was modified to produce this report.
**Codebase size:** ~14,700 lines TS/TSX, ~927 lines CSS, ~6,953 lines Rust.

---

## 1. Executive summary

PhotoERP is a **well-built single-user quotation engine, not yet an ERP**. It is
well-executed in the one domain it covers — quotation → client → payment lifecycle,
plus per-order expense tracking — and it has genuinely good primitives: real SQLite
persistence with foreign keys and cascades, transactional save/delete paths, correct
balance derivation in SQL, reusable packages, and an unusually capable quotation PDF
engine.

Six issues must be fixed before this is used with real customers:

1. **Quantity is dead end-to-end** — every package-based quotation underquotes, and
   editing an old quotation silently destroys stored line totals.
2. **The PDF shows a wrong balance** — it ignores the `payments` ledger entirely and
   contradicts the app's own quotation list.
3. **Editing the advance never syncs the ledger** — revenue and outstanding balances
   permanently diverge from what the UI shows.
4. **The default studio identity is a real person's phone number and Gmail address**,
   printed on every generated quotation PDF.
5. **Editing a quotation rewrites the shared client record** — retroactively altering
   every other quotation for that client, including already-issued PDFs.
6. **CSV export truncates a caller-controlled file before validating the request.**

Approximately 20 of the ~35 capabilities a photography-studio ERP needs are absent.

**The dominant root cause is that money is computed once in the browser and trusted by
the backend.** Findings P0-2, P0-3, P0-5, P1-1 and P1-7 all stem from this. Moving
arithmetic into Rust and snapshotting every value a signed document depends on would
close most of the critical list at once.

---

## 2. Severity definitions

| Level | Meaning |
|---|---|
| **P0** | Corrupts money, leaks personal data, destroys files, or produces a customer-facing wrong number |
| **P1** | Wrong under normal business flows, concurrency, or edge cases |
| **P2** | Inconsistency, reliability gap, or material technical debt |
| **P3** | Code quality, accessibility, tooling, and consistency |

---

## 3. P0 — Fix before using this with a real client

### P0-1 · Quantity is discarded end-to-end → systematic underquoting and data loss on edit

Quantity is captured in the schema, validated in Rust, editable in the package
editor, and rendered in the PDF — then hardcoded to `1` at two points in the
frontend.

| Stage | Location | Behaviour |
|---|---|---|
| Package editor lets you set quantity | `src/features/quotations/components/ServicesPackagesSection.tsx:474-489` | stores `x2` |
| Package card renders `x{q} · ₹{q×p}` | `ServicesPackagesSection.tsx:308-309` | proves intent |
| Applying a package | `src/features/quotations/components/ServicesTable.tsx:113-117` | **hardcodes `quantity: 1`** |
| Inserting into state | `src/features/quotations/hooks/useQuotation.ts:215` | **hardcodes `quantity: 1` again** |
| Subtotal | `useQuotation.ts:256-261` | `Σ item.price` — never multiplies |
| Persist | `src/utils/quotationMapper.ts:40,42` | `quantity: 1`, `total: price` |
| Validate | `src-tauri/src/commands/quotation.rs:15-55` | requires `quantity > 0` — always satisfied by 1 |
| Load from DB | `quotationMapper.ts:80` | discards stored `quantity` |
| PDF fallback | `src/utils/pdfMapper.ts:92` | `quantity: 1` |

**Failure scenario:** a "Premium Wedding" package of *2 cameras × ₹25,000* becomes one
₹25,000 line. The user is ₹25,000 under. Because the subtotal is recomputed from unit
prices only, **any legacy row with `quantity > 1` loses its multiplication the moment
that quotation is saved** — silent, irreversible financial data loss on edit.

There is no quantity input in `ServicesTable`, so the only correct workaround today is
to manually enter `unit_price × quantity` as a single price. Nothing tells the user.

Git history identifies both regressions: `75af5fe` replaced `quantity: item.quantity`
with `quantity: 1`, and `src/features/quotations/components/ServicesTable.tsx.bak:175-193`
still holds the last correct quantity UI.

**Fix:** honour `s.quantity` in `ServicesTable.tsx:115`, honour `item.quantity` in
`useQuotation.ts:215`, make subtotal `Σ(price × quantity)`, persist
`total = price × quantity`, add a quantity stepper to `ServicesTable`, and repair
existing rows before re-enabling edit-save.

---

### P0-2 · The PDF prints a balance that ignores all recorded payments

`src/features/quotations/hooks/useQuotation.ts:267-269`

```ts
const balance = useMemo(() => {
  return total - num(advance);
}, [total, advance]);
```

`mapDtoToQuotationState` loads the correct payments-derived balance from the DTO, then
`formState` overwrites it with this memo. `ViewQuotationPage.tsx:63-71` feeds
`formState` into `mapQuotationToPdf`.

**Failure scenario:** for a ₹40,000 quotation with ₹0 advance and ₹15,000 collected:

| Surface | Shows | Correct? |
|---|---|---|
| Quotation list | ₹25,000 (payments-derived) | yes |
| Quotation view page | ₹40,000 | **no** |
| **Generated customer PDF** | **₹40,000** | **no** |
| Reports | ₹25,000 | yes |

The PDF is the artefact sent to the client, and it contradicts the app's own list.

**Fix:** derive `balance` from the payments ledger, not from `total - advance`.

---

### P0-3 · Editing the advance never reconciles the `payments` ledger

`quotations.advance_amount` is a denormalised copy of a `payments` row created at
quotation-creation time. `src-tauri/src/commands/quotation.rs:513` writes the new value
but has no counterpart to the advance-payment insert performed by `save_quotation_core`
at `quotation.rs:178-191`. Balance is then derived purely from `payments`
(`quotation.rs:601`, `services/payment.rs:39-48`).

**Failure scenarios:**
- Advance ₹0 → ₹5,000 on edit: no payment row exists. The PDF prints "Advance ₹5,000"
  from the column while the ledger holds nothing. Balance stays at full total.
- Advance ₹5,000 → ₹0 on edit: the stale `payment_method = 'Advance'` row survives and
  keeps reducing the balance for an advance the quotation no longer claims.

In both directions revenue, outstanding balance and order profitability diverge
permanently, and nothing resynchronises them.

The existing test `update_preserves_service_statuses_and_never_changes_number`
(`quotation.rs:1043-1100`) asserts balance derives from the advance payment but never
exercises changing the advance on update.

**Fix:** make `advance_amount` a derived view of the ledger, or reconcile the
`Advance` row inside `update_quotation_core`. A single source of truth is cheapest.

---

### P0-4 · Default studio identity is a real person's contact details

```ts
// src/types/settings.ts:24-31
export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  studio_name: 'Photo ERP Studio',
  owner_name: '',
  studio_phone: '+91 9022624329',
  studio_email: 'Jadhavomkar604@gmail.com',
  ...
};
```

Identical defaults are duplicated in `src-tauri/src/models/settings.rs:20-21`.

Both `usePdfConfig.ts:27,44-47` and `useStudioSettings.ts:25` fall back to these on any
load failure, and they render in the app header and on **every generated quotation PDF**.

**Failure scenario:** a user who skips setup, or whose settings read fails, sends every
customer the developer's mobile number and Gmail address on the quotation document.

**Fix:** blank defaults, plus a setup gate that fails closed until studio details are
entered.

---

### P0-5 · Editing a quotation rewrites the shared client record

`src-tauri/src/commands/quotation.rs:477-497`

```rust
UPDATE clients
SET name = ?1, phone = ?2, email = ?3, address = ?4
WHERE id = ( SELECT client_id FROM quotations WHERE id = ?5 )
```

There is no client snapshot on the quotation — `migrations.rs:38-65` stores only
`client_id`. Every read path joins live client data (`quotation.rs:365-366`,
`quotation_list.rs:51`).

**Failure scenario:** correct a client's address while editing one quotation, and that
address silently changes on **every other quotation for that client** — including
already-issued PDFs, the list view, and exports. Issued documents become
non-reproducible: the PDF no longer shows what was agreed.

Related: `save_quotation_core:102-118` inserts a **new** `clients` row whenever
`client_id` is `None`, so unlinked saves duplicate client records.

**Fix:** add a client snapshot to `quotations` and stop writing to `clients` from
`update_quotation_core`.

---

### P0-6 · CSV export truncates a file before validating the request

`src-tauri/src/commands/export.rs`

| Line | Issue |
|---|---|
| 27 | `output_path: String` is fully caller-controlled, no directory restriction |
| 33 | `create_dir_all(parent)` will create arbitrary directories |
| 40 | `File::create(&dest)` runs **before** the `kind` match at line 42 |
| 47-52 | The unknown-kind error returns only after the target file has been created and truncated |

**Failure scenario:** any invoke with an unrecognised `kind` **destroys any existing
file at that path** before the error is raised. A bad or stale call silently wipes a
user document.

Aggravated by `src-tauri/tauri.conf.json:21` being `"csp": null`, so there is no
`script-src` restriction either.

**Fix:** move the `kind` match above `File::create`, and validate `output_path` against a
user-chosen directory.

---

## 4. P1 — Wrong figures in normal business flows

| # | Finding | Evidence |
|---|---|---|
| **P1-1** | **Rust accepts client-supplied money with no arithmetic check.** Validation checks only sign and three orderings. It never asserts `subtotal == Σ service.total`, `service.total == quantity × price`, or `total == subtotal - discount`. Values are stored verbatim. The doc comment claiming "invalid data can never reach the database" is inaccurate — it guarantees only non-negativity. | `quotation.rs:13-55`, `:162-165` |
| **P1-2** | **Monthly revenue merges all years.** Groups by `strftime('%m', payment_date)` with no `%Y`. January 2024 and January 2026 collapse into one bar; year-over-year comparison is impossible. Affects both the dashboard and reports. | `src-tauri/src/services/revenue_service.rs:16-24` |
| **P1-3** | **Reports include Draft and Cancelled work.** `SUM(total)`, `SUM(amount)` and the pending aggregate have no status predicate, so a cancelled ₹2,00,000 booking still counts toward revenue and outstanding. `get_pending_quotations` likewise has no status filter. | `reports.rs:24-30,33-39,41-58`; `quotation.rs:258-263` |
| **P1-4** | **There is no refund path.** Payments validate `amount > 0`, so cancelling a deal with money received requires deleting rows. There are no negative payments, credit notes, or write-offs. | `commands/payment.rs:16` |
| **P1-5** | **`f64` money with no rounding at any write boundary.** All money columns are `REAL`; models are `f64`. No `round()`/`toFixed` before persist. `rusqlite` binds `f64` with no finite guard, so `Infinity` persists silently and renders as `₹∞`. Display is inconsistent — only expenses pin 2 decimals. | `migrations.rs:51-55,76,78,89,125`; `models/quotation.rs:10-12,47-52`; `expenseFormat.ts:1-5` vs `QuotationListPage.tsx:25` |
| **P1-6** | **Quotation numbers are burned on every page mount.** `useQuotation.ts:119-124` calls `generate_quotation_number()` on mount, and `next_quotation_number` increments the counter **outside any transaction**. Merely *viewing* a quotation permanently consumes a number, creating gaps. The non-transactional read-then-increment can also return duplicates under concurrency. | `useQuotation.ts:119-124`; `quotation.rs:619-624`; `services/quotation_number.rs:19-29` |
| **P1-7** | **Payment writes are non-transactional.** `INSERT INTO payments` commits on its own, then `sync_quotation_balance` runs separately. If it fails the payment is persisted while the balance stays stale, yet the `Err` return misleads the UI into thinking nothing was saved. The overpayment guard is read-then-write (TOCTOU), so two concurrent calls can jointly overpay. Contrast the correct pattern at `quotation.rs:222,316,610` and `package.rs:234`. | `commands/payment.rs:51-81` |
| **P1-8** | **"New quotation" never leaves the form.** After a successful save the assigned quotation number is discarded, the form is not cleared, and there is no navigation. The button re-enables when `loading` flips false — one click, a short pause, one more click creates two live quotations. No idempotency key, no duplicate guard. | `NewQuotationPage.tsx:44-90` |
| **P1-9** | **Editing a client erases its address.** The edit form initialises `address` to `''` and saves it. Irreversible, no warning, no dirty-state guard. | `ClientsPage.tsx:84` |
| **P1-10** | **App lock fails open, has no rate limit, and can self-lock.** `read_setting` swallows *every* error via `unwrap_or_else(\|_\| fallback)`, so DB corruption is indistinguishable from "row missing" and `is_enabled_core` reports unlocked. Salt and hash are written as two independent statements with no transaction, so a crash between them leaves salt set / hash empty while `app_lock_enabled = '1'` — a permanent self-lockout whose only escape re-hits the "no PIN" branches. PINs are 4–6 digits with a single round of salted SHA-256 and `verify_app_lock_pin` has **no attempt counter or rate limit**, so the DB file yields the PIN by brute force. | `app_lock.rs:14-21,61,70-94,96-104,124-129,161,190` |
| **P1-11** | **Setup gate and app lock both fail open.** `SetupGate` initialises `completed: true` and `AppLockContext` initialises `locked: false`; both flip only on a *successful* read, so a transient DB error skips the wizard or bypasses the PIN. | `src/features/setup/SetupGate.tsx:13`; `src/features/security/context/AppLockContext.tsx`; `src/app/App.tsx` |

---

## 5. P2 — Reliability, UX and data integrity

### Performance and scale
- **No pagination anywhere.** `Table.tsx` has no page state. `get_quotations`,
  `get_clients`, `get_expenses` and `get_all_payments` all return complete tables;
  filtering and sorting happen in the browser. A 5,000-row studio means 5,000-row JSON
  payloads on every list visit plus full-table re-render. `get_clients` additionally
  issues **one status query per client** (N+1).
- **No server-side pagination, search, or sort** on any list command.
- The expense quotation selector fetches every quotation then filters locally.

### Data integrity
- **Deleting a quotation hard-cascades payments *and* expenses.** The UI confirms only
  "Delete this quotation?" and the service doc comment mentions only payments and
  services — expenses are never disclosed. Deleting a paid job permanently removes its
  revenue from `SUM(payments.amount)` and its costs from profit reporting. There is no
  soft delete, archive, or audit trail for a financial document.
  (`quotation.rs:288-304`, `migrations.rs:101,133`, `QuotationListPage.tsx:93`,
  `src/services/quotation.service.ts:66-67`)
- **Timezone bug:** `quotation.rs:246` compares a local `event_date` against
  `date('now')`, which is UTC. Between 00:00 and 05:30 IST, yesterday's events are still
  listed as upcoming.
- **Advance is dual-sourced with no tie between representations.** The `advance_amount`
  column *and* an `'Advance'`-method payment row created at `quotation.rs:178-191`,
  dated with `quotation.event_date`. If `event_date` is blank the payment row is dated
  `''`, and `get_monthly_revenue` filters those out while `total_revenue` counts them —
  so **Revenue-by-Month and Total Revenue disagree**.
- **Service-status preservation is heuristic and collision-prone.** `quotation.rs:537-598`
  deletes and re-inserts every service row, matching on id then on **name**
  (`status_by_name.insert(...)` — last row wins). Two services named "Photography"
  collapse into one status.

### UI defects
- Sortable columns with no `accessor` are no-ops (Type, Order·Quotation, Vendor,
  Payment Method, Actions). `Table.tsx:49-64`, `ExpensesPage.tsx:239-300`
- Expense KPI cards ignore active filters — the table shows one set of rows while the
  cards show unfiltered totals.
- Quotation search ignores venue/city while the placeholder advertises both
  (`QuotationListPage.tsx:48-51`).
- `validTill` is hardcoded `'N/A'` in the PDF; no validity field exists.
- `studio_website` is editable only during setup and is never printed on the PDF.
- Branding is PDF-only; the app shell ignores it. The logo is fixed and bundled, not
  uploadable, despite a comment claiming "uploaded logo".
- The quotation view page shows no payment history and no "record payment" action —
  payments are reachable only via Clients → that client → the event.
- Setup steps 1–3 advance without persisting; inner cards must be saved separately or
  the work is lost.
- A client with zero services resolves to `Completed` in one path and `Pending` in
  another (`get_client_overall_status` vs `overall_status_for_services`).
- `PAYMENT_METHODS` in `payment.types.ts:1-7` omits `Advance`, which Rust accepts, so
  advance payments render a blank `<select>` option.
- `ClientsPage` uses `window.confirm` while every other page uses
  `@tauri-apps/plugin-dialog` — inconsistent and likely broken in Tauri.
- `DatabaseInfo.has_safety_backup` exists in Rust but is dropped from the frontend type
  and never displayed.

### Dead code and hardcoding
- **Empty files:** `src/utils/formatCurrency.ts`, `src/utils/formatDate.ts`,
  `src/constants/status.ts`, `src/constants/eventTypes.ts`, `src/app/providers.tsx`,
  `src/features/dashboard/components/StatsGrid.tsx`, plus feature barrel `index.ts` files.
- **Unused:** `usePaymentValidation.ts` (fully written, never wired),
  `useClientValidation.ts`, `QuotationTable.tsx`, `BackToDashboard.tsx`,
  `ServicesTable.tsx.bak`, `src/features/quotations/Data/quotation.data.ts:28-67`.
- **Inert props:** `QuotationHeader.tsx:3-12` accepts `disabled` and ignores it.
- **36 hardcoded `₹` literals across 16 files**, and no `Intl.NumberFormat` in the PDF.
- Event type is free text; `constants/eventTypes.ts` and `constants/status.ts` are empty.

---

## 6. P3 — Engineering quality, tooling and accessibility

### Dependencies and build
- **`clsx` is used directly but is not declared in `package.json`** — it resolves only
  as a transitive dependency and will break on any tree change.
- **Monolithic bundle, no code splitting.** `src/app/router.tsx` statically imports all
  13 pages; `html2pdf.js` ships in the initial chunk. `vite.config.ts` has no build
  chunking configuration.
- **No `manualChunks`, no dynamic `import()`** anywhere.

### Type safety
- `tsconfig` has `strict: true` but **not `noUncheckedIndexedAccess`**.
- **0 `any` types**, 1 non-null assertion, 16 functional `as` casts on API data, and 2
  unsafe `globalThis` casts.

### Testing and CI
- **Zero frontend test infrastructure.** No Vitest, no React Testing Library, no
  Playwright/puppeteer/jsdom, no test script in `package.json`.
- **62 `#[test]` functions** exist but all live inline in `#[cfg(test)]` modules using
  `src/test_support.rs`. **There is no `src-tauri/tests/` integration directory.**
- No ESLint or Prettier config, no pre-commit hooks, no CI workflow.

### Accessibility
- **76 `<div onClick>` elements** without keyboard handlers or ARIA roles.
- `Table.tsx` renders `<div>`s, not a real `<table>` — no semantics for screen readers.
- No `<main>` landmark; forms lack `<label for>`; modals have no focus trap and no
  `aria-modal`; icon-only buttons have no accessible names; `toast()` renders a plain div.
- No route-change focus management or skip link.

### Other
- `validateNotFutureDate` (`src/utils/validation.ts:78-87`) is defined but never applied
  to `event_date`.
- `NaN` passes validation (`NaN < 0.0` is `false`) then fails as a DB `NOT NULL`
  constraint instead of a clear message; `commands/package.rs` correctly uses
  `is_finite()` — the two validation paths disagree.
- `quotation.rs:121` comments "today (UTC)" while the code correctly uses
  `date('now', 'localtime')` — stale comment.
- No global error boundary, so any render-time throw blanks the app.

---

## 7. What is genuinely correct

Stated because it narrows the fix surface considerably.

- **Live balance derivation in SQL is sound.** `quotation_list.rs:25-31` clamps with
  `MAX(q.total - SUM(payments), 0)`, and `reports.rs:41-58` pre-aggregates payments in a
  subquery — correctly avoiding the fan-out double-count a naive
  `SUM(total) - SUM(payments)` join would produce.
- **Payment status classification is correct** (`quotation_list.rs:32-38`): `<= 0`
  Pending, `>= total` Paid, else Partial.
- **Overpayment is guarded** in Rust via `max_payment_amount` with positive-amount
  validation; `usePaymentValidation.ts` is a redundant second layer.
- **Quotation number and date are immutable on edit** (`quotation.rs:499-500`), so a
  document's identity cannot drift.
- **Client deletion is blocked when quotations exist** (`commands/client.rs:435-465`),
  so orphan quotations are impossible.
- **Package and service snapshotting is correct by design** — names and prices are
  copied into `quotation_services`, so later catalog edits do not alter issued
  quotations.
- **SQLite pragmas are sound** — `foreign_keys = ON`, WAL, 5s busy timeout
  (`connection.rs:9-20`).
- **Delete and save paths are transactional**, with rollback coverage in tests.
- `quotations.balance` is accepted from the wire at `quotation.rs:166` but immediately
  overwritten by `sync_quotation_balance` at `:194` — trusted then discarded, so not
  exploitable.

---

## 8. Feature inventory

| Area | Create | Read | Update | Delete | Assessment |
|---|---|---|---|---|---|
| Quotations | Yes | List + detail | Edit, status | Yes (hard cascade) | Partial — quantity dead, no validity/tax |
| Quotation lifecycle | — | — | — | — | **Robust** — Draft→Sent→Confirmed→Completed→Cancelled, colour-coded |
| Quotation PDF | — | Preview + PDF | Template settings | — | Partial — strong template engine, wrong balance |
| Clients | **No standalone** | List + detail | Edit | Yes | Partial — address wipe, N+1, no portal |
| Payments | Yes | History + summaries | Edit | Yes | Partial — ledger divergence, client-scoped only |
| Payment history & receipts | — | History | — | — | Partial — no printable receipt, no invoice |
| Expenses | Yes | List + per-order | Edit | Yes | **Robust** |
| Services catalog | Yes | Yes | Edit | Yes | Partial — name + price only |
| Packages | Yes | Yes | Edit | Yes | Partial — name + service rows only |
| Business settings | Yes | Yes | Yes | n/a | Partial — leak risk (P0-4) |
| Branded template | Yes | Preview + PDF | Yes | n/a | Partial — PDF only |
| App lock PIN | Yes | Status | Yes | Disable | Partial — fails open, brute-forceable |
| Backup / CSV | Manual | Yes | n/a | n/a | Partial — 4 CSV types, no schedule |

---

## 9. Capability gaps

Confirmed **zero occurrences** anywhere in `src/` or `src-tauri/src/` of: invoice, tax,
GST, enquiry, lead, staff, inventory, due date, follow-up, reminder, receipt, audit log.
(`vendor` exists only as a free-text expense column.)

| # | Capability | Status |
|---|---|---|
| 1 | Quotation authoring | Partial |
| 2 | Quotation lifecycle / status | **Robust** |
| 3 | Quotation PDF output | Partial |
| 4 | Client management | Partial |
| 5 | Payment collection | Partial |
| 6 | Payment history & receipts | Partial |
| 7 | Expense tracking | **Robust** |
| 8 | Vendor / procurement | **Absent** |
| 9 | Service & package catalog | Partial |
| 10 | Cost & margin analysis | Partial — per-order profit only, no aggregate P&L or COGS |
| 11 | GST / tax compliance | **Absent** — no HSN/SAC, no tax lines, no CGST/SGST split |
| 12 | Invoicing | **Absent** |
| 13 | Lead / enquiry pipeline | **Absent** |
| 14 | Follow-up, due dates, reminders | **Absent** |
| 15 | Staff / crew management | **Absent** |
| 16 | Scheduling / delivery calendar | **Absent** — "upcoming events" is a list, not a calendar |
| 17 | Client portal & e-signature | **Absent** |
| 18 | Contracts | **Absent** |
| 19 | Inventory / equipment | **Absent** |
| 20 | Analytics & reporting | Partial — cross-year bug, no ageing, no profit, no export |
| 21 | Multi-user & roles | **Absent** |
| 22 | Audit trail | **Absent** |
| 23 | Notifications (email/SMS/WhatsApp) | **Absent** |
| 24 | Scheduled off-site backup | **Absent** |

---

## 10. Recommended roadmap

### Phase 0 — Correctness and safety (no new features)

Ordered by blast radius, not by effort.

| Order | Item | Effort |
|---|---|---|
| 1 | **P0-4** blank the leaked default phone/email | Trivial |
| 2 | **P0-6** move the `kind` match above `File::create`; restrict the output path | Trivial |
| 3 | **P1-9** stop wiping the client address on edit | Trivial |
| 4 | **P1-8** navigate away / reset the form after a successful save | Small |
| 5 | **P1-2** add `%Y` to the revenue grouping | Trivial |
| 6 | **P1-11** make the setup gate and app lock fail closed | Small |
| 7 | **P0-1** restore quantity end to end, then repair existing rows | Medium |
| 8 | **P0-2** derive balance from the payments ledger | Small |
| 9 | **P0-3** single source of truth for advance | Medium |
| 10 | **P0-5** client snapshot on quotations; stop writing to `clients` | Medium |
| 11 | **P1-1 + P1-7** move money arithmetic into Rust; make payment writes transactional | Large |
| 12 | **P1-3 + P1-4** status-filter every report aggregate; add refunds/credit notes | Medium |
| 13 | **P1-5** migrate money columns to integer paise with boundary rounding | Large |
| 14 | **P1-6** allocate quotation numbers on save, not on mount | Medium |

### Phase 1 — Platform hardening

- Server-side pagination, search and sort on all list commands; remove the `get_clients`
  N+1.
- A global error boundary and per-feature error boundaries.
- Replace the browser fail-open lock with a backend-enforced one: PBKDF2/Argon2, an
  attempt counter with lockout, and a transactional credential write.
- Soft delete / archive for quotations; disclose exactly what a delete will remove.
- A scheduled backup to a user-chosen external location with retention.
- Frontend test infrastructure (Vitest + Testing Library) and a CI workflow; add
  `src-tauri/tests/` for integration coverage.
- Lazy-load routes, `manualChunks` in `vite.config.ts`, dynamic-import `html2pdf`.
- Declare `clsx`; add ESLint/Prettier; enable `noUncheckedIndexedAccess`.
- Accessibility pass: real `<table>`, `<main>` landmark, `<label for>`, keyboard
  handlers replacing `<div onClick>`, focus-trapped dialogs.

### Phase 2 — Commercial capability (highest value)

1. **Lead & enquiry pipeline with follow-up dates.** The single largest missing
   commercial capability — every existing feature assumes a client already exists. Add a
   `leads` table (source, event type, budget, stage, owner, notes), stage→client
   conversion, `next_follow_up_at`, and an overdue/aging follow-up queue on the
   dashboard. Highest revenue-per-hour of effort for a photography studio, and it feeds
   everything downstream.
2. **GST-compliant invoicing.** Generate an invoice from a confirmed quotation:
   sequential invoice number, HSN/SAC per service, taxable value, CGST/SGST split,
   discount and advance deduction, balance due — plus a printable invoice PDF and a
   payment receipt. For a GST-registered business this is a hard compliance blocker, not
   a nice-to-have.
3. **Vendor master and procurement.** Promote `expenses.vendor` free text to a `vendors`
   table; add purchase orders, vendor bills, and per-order vendor cost rollups feeding
   COGS and margin.
4. **Staff, resources and the delivery calendar.** Crew with day rates, per-event
   assignment, a real date calendar with conflict detection, and per-job milestones
   (shoot → edit → album → delivery). Turns "upcoming events" into an operational
   scheduling tool.
5. **Multi-user, roles, audit trail and scheduled backup.** Per-user login with
   role-based permissions (owner/manager/crew/viewer), an append-only audit log of who
   changed which quotation or payment, and automatic external backups. Today the app is
   a single un-auditable local file — below the standard bar for handling customer PII
   and money.

### Phase 3 — Reporting depth

Outstanding and aging receivables, profit and loss, revenue by payment method, service
and package profitability, CSV export of every report, and GST summary reports.

---

## 11. Known open item — quotation PDF totals block

By explicit decision, the PDF totals block was kept as-is and only relabelled. It now
reads:

| Label | Value | Note |
|---|---|---|
| Total after discount | `total` | post-discount figure |
| Advance | `advance` | from the `advance_amount` column |
| Remaining | `balance` | currently `total - advance`, ignoring the payments ledger |
| TOTAL (₹) | `total` | duplicates the first row |

The labels no longer misrepresent the values. Two substantive issues remain, both
already covered above and **deliberately not fixed**:

- **The discount is not shown on the document**, and the first and last rows display the
  same figure. P0-1 explains why `total` is already post-discount.
- **"Remaining" uses `total - advance`, not the payments ledger** (P0-2). Once P0-2 is
  fixed this row becomes correct automatically.

---

## 12. Verification limitations

- No `puppeteer`, `playwright`, `jsdom` or `happy-dom` is installed, so no rendered-PDF
  or browser end-to-end validation was possible. All PDF findings are from static
  analysis of the template and the `html2pdf` pipeline.
- No Tauri runtime was launched, so IPC and capability behaviour was reviewed statically.
- Findings were produced by static analysis with independent spot-checks on the highest
  severity items; the key P0 and P1 claims were re-verified against the source directly.