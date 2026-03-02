# Admin can view archived properties for a manager

Implement an admin-only enhancement to the admin “manager properties” screen so archived properties are hidden by default but can be included via a URL-synced toggle, with a read-only details dialog for archived items.

## Objective

Allow an **administrator** to view a **manager’s archived properties** from the existing admin properties view, without changing the manager-facing experience.

## Current state (from codebase)

- **Archive model**: Postgres `properties.archived_at` (nullable timestamp).
- **Backend list endpoint already supports archived**:
  - Handler: `src/handlers/adminListManagerProperties.ts`
  - DB: `src/db/postgres/propertiesRepository.ts::listPropertiesByOwner(ownerManagerSub, { includeArchived })`
  - Query param: `includeArchived=true|false` (defaults false)
  - OpenAPI: `/admin/managers/{managerSub}/properties` includes `includeArchived`.
- **Backend get endpoint allows archived**:
  - Handler: `src/handlers/adminGetProperty.ts` returns a property regardless of archived status.
  - Frontend API helper: `src/lib/api.ts::adminApi.getProperty(propertyId)` exists.
- **Frontend admin properties page exists**:
  - Route: `src/App.tsx` → `/admin/managers/:managerSub/properties`.
  - Page: `src/pages/AdminProperties.tsx` currently renders status chip (Active/Archived) and disables action menu for archived, but **does not provide an include-archived toggle** and **does not open a details view**.

## Scope

### In scope

- Admin UI: `AdminProperties` page gains:
  - URL-synced **“Include archived”** toggle (default off).
  - When enabled, list includes both active + archived properties.
  - Archived rows have clear status indicator.
  - Archived property **details dialog** (read-only).
  - Action menu stays disabled for archived (existing behavior) unless explicitly changed later.
- Backend:
  - Ensure list endpoint response shape aligns with frontend and OpenAPI.
  - Confirm `includeArchived` works end-to-end and is tested.

### Out of scope

- Manager UI changes.
- Changing archive semantics (still `archived_at`).
- Unarchiving or editing archived properties.
- Pagination changes (note: frontend has pagination token/limit plumbing; backend list handler currently returns `{ properties: [...] }` only).

## Constraints / non-goals

- Keep handlers thin and DB logic in repositories (per backend architecture rules).
- Do not add new dependencies unless required.
- Keep OpenAPI (`openapi/api.yaml`) aligned with handler behavior.
- Add/update Jest unit tests for backend changes and Playwright E2E for frontend behavior if needed.
- Avoid leaking secrets in logs/responses.

## Acceptance criteria

### Backend

- `GET /admin/managers/{managerSub}/properties`:
  - **Default**: returns only active properties (`archived_at IS NULL`).
  - With `includeArchived=true`: returns active + archived.
  - OpenAPI response schema uses **camelCase** and matches the handler/frontend contract.

### Frontend

- On `/admin/managers/:managerSub/properties`:
  - Toggle defaults to off.
  - When toggle is on:
    - URL updates to `?includeArchived=true`.
    - List includes archived properties.
  - When toggle is off:
    - URL removes `includeArchived` (or sets to false) and list hides archived.
  - Clicking an **archived** property opens a **read-only details dialog** (no edit, no archive actions).
  - Clicking an **active** property may either:
    - Do nothing (keep existing UX), or
    - Optionally open the same details dialog (editable remains via menu).

### Tests

- Backend unit tests cover:
  - includeArchived missing → defaults false.
  - includeArchived true → passes `{ includeArchived: true }` into repository.
  - Response mapping correctness (archived timestamp field included/nullable).
- Frontend E2E covers:
  - Toggle updates URL.
  - Toggle causes archived rows to appear/disappear.
  - Archived row opens details dialog.

## Key design decisions

- **URL as source of truth** for toggle state (`?includeArchived=true`) so it’s shareable and back-button friendly.
- **Details dialog** for archived property view (no navigation, minimal surface area).
- **Preserve existing security model**: admin routes protected by `ProtectedRoute requireAdmin` and backend `requireAdminSession`.

## Implementation plan (single-threaded)

### 1) Backend contract review + minimal alignment

1. Verify handler response vs OpenAPI schema for `/admin/managers/{managerSub}/properties`:
   - Handler currently transforms DB fields to camelCase (`ownerManagerSub`, `archivedAt`, etc.).
   - OpenAPI snippet currently shows snake_case properties inside response (`owner_manager_sub`, `archived_at`, etc.).
2. Authoritative contract: **camelCase** (matches handler output and frontend types in `src/types/admin.ts`).
3. Update `openapi/api.yaml` response schema accordingly (camelCase keys), and ensure `adminGetProperty` OpenAPI already matches.
4. Ensure list handler still returns `{ properties: Property[] }` with `archivedAt?: string | null` (consistent with frontend expectations).

### 2) Backend tests (Jest)

1. Update/add unit tests in `test/unit/adminListManagerProperties.test.ts`:
   - Ensure expected response uses camelCase, matching current handler behavior.
   - Add a case verifying an archived property serializes `archivedAt` ISO string.
2. If OpenAPI alignment requires handler changes, add tests for the changed mapping.

### 3) Frontend: includeArchived toggle (URL-synced)

1. Update `src/pages/AdminProperties.tsx`:
   - Read `includeArchived` from `useSearchParams()` (react-router).
   - Keep UI state derived from the URL.
   - On toggle change, set/remove the query param.
2. Ensure `loadProperties()` passes `{ includeArchived: true }` to `adminApi.getManagerProperties` when toggle is on.
   - Note: `adminApi.getManagerProperties` already appends `includeArchived=true`.

### 4) Frontend: archived property details dialog

1. Add a “View details” interaction:
   - Recommended: row click for archived items OR a dedicated icon/button per row.
   - Keep action menu disabled for archived (current).
2. Dialog data strategy:
   - Option A (recommended): use existing list data for display; call `adminApi.getProperty(propertyId)` only when opening (to ensure freshness) and show a spinner.
   - Option B: show list data only (no extra call).
3. Dialog UI:
   - Title: property name + archived chip.
   - Body: address fields, timezone, created/updated/archived timestamps.
   - No edit controls; close button.

### 5) Frontend tests

1. Extend Playwright `e2e/auth.spec.ts` or add `e2e/admin-properties.spec.ts`:
   - Navigate to `/admin/managers/:managerSub/properties` (requires admin auth setup in tests; if not available, mock API at network level or use existing auth harness).
   - Verify query param toggling changes visible rows.
   - Verify clicking archived row opens dialog.

### 6) Smoke / build checks

- Backend: `npm test`, `npm run build`.
- Frontend: `yarn build`, `yarn test:e2e`.

## Parallel agent sub-plans (for reduced context + concurrency)

### Agent A: Backend contract + tests (maintenance-app-backend)

**Goal**: Ensure backend behavior and OpenAPI match and add/adjust unit tests.

- Files likely touched:
  - `openapi/api.yaml`
  - `src/handlers/adminListManagerProperties.ts` (only if contract mismatch needs handler changes)
  - `test/unit/adminListManagerProperties.test.ts`
- Tasks:
  1. Enforce response field naming for `listManagerProperties` as **camelCase**.
  2. Update OpenAPI response schema for `/admin/managers/{managerSub}/properties` to match.
  3. Update unit tests expectations accordingly; add archived property serialization coverage.
- Deliverables:
  - Passing `npm test`
  - OpenAPI reflects actual JSON response

### Agent B: Frontend toggle + URL sync (maintenance-app-frontend)

**Goal**: Add URL-synced include-archived toggle and wire it to API call.

- Files likely touched:
  - `src/pages/AdminProperties.tsx`
  - (Maybe) `src/lib/api.ts` (only if needed)
- Tasks:
  1. Add toggle control (MUI Switch/Checkbox) in the header near “Create Property”.
  2. Use `useSearchParams` to derive `includeArchived` and keep URL in sync.
  3. Ensure `loadProperties()` passes `includeArchived` when toggle enabled.
- Deliverables:
  - `yarn build` passes

### Agent C: Frontend details dialog for archived properties (maintenance-app-frontend)

**Goal**: Provide read-only details dialog for archived properties.

- Files likely touched:
  - `src/pages/AdminProperties.tsx` (or extract dialog into `src/components/` if it gets large)
  - `src/lib/api.ts` (already has `getProperty`)
- Tasks:
  1. Add a click target for archived rows (row click or “View” button).
  2. Implement dialog with read-only fields; optionally fetch `adminApi.getProperty` on open.
  3. Ensure archived items remain non-editable and non-archivable via existing actions.
- Deliverables:
  - Works in local dev; `yarn build` passes

### Agent D: QA/E2E and regression checks (maintenance-app-frontend + backend)

**Goal**: Add tests proving the toggle + dialog behavior.

- Files likely touched:
  - `maintenance-app-frontend/e2e/*.spec.ts`
- Tasks:
  1. Decide test strategy (real admin auth vs network mocking). Prefer the existing project’s E2E conventions.
  2. Add tests:
     - toggle updates URL
     - archived rows appear/disappear
     - archived row opens details dialog
  3. Run `yarn test:e2e` and report results.

## Risks / open questions

- **OpenAPI mismatch (resolved)**: Update OpenAPI for `listManagerProperties` to camelCase to match the handler/frontend contract.
- **Pagination mismatch**: Frontend expects `paginationToken`/`hasMore` in `PaginatedProperties`, but backend handler returns only `{ properties }`. This plan does not change pagination; consider aligning later.
- **Row interaction conflicts**: If we add row click for details, ensure it doesn’t conflict with the action menu click target.
