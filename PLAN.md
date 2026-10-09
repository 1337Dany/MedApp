# MedApp — Status and Plan

Snapshot of branch `dev` at `d8fdeb9` (merge of PR #3, `feature-auth`), 2026-10-07.
Re-checked on `feature/fixes` at `9007af5`, 2026-10-09. Updated on `feature/docker-migration-fixes`, 2026-10-09: builds with 0 errors / 0 warnings; a clean copy of the repo + `.env` from `.env.example` → `docker compose up` works end to end.
Stack: ASP.NET Core (.NET 10) + EF Core/Npgsql + PostgreSQL; React 18 + Vite + Zustand; Docker Compose; GitHub Action running `dotnet format --verify-no-changes`.

## Where the project stands

### Done
- **Models / DAL**: all entities, per-entity configs, 7 migrations (`AddAuthAndRoles`: `User.Role`, unique email index, `RefreshTokens` table; `SeedLookupsRemoveDevUser`; latest `RestrictLookupDeletes`). Applied automatically on start.
- **Repositories**: one per entity plus `UnitOfWork` (`MedApp.DAL/Repositories`, interfaces in `MedApp.Services/Repositories`).
- **Auth backend** (works end to end in code):
  - `POST /api/auth/register | login | refresh | logout`, `GET /api/auth/me`.
  - `PasswordHasher<User>`, JWT access tokens, hashed refresh tokens with rotation and replay detection.
  - FluentValidation on requests, AutoMapper for `User` ↔ DTOs, Swagger with a Bearer scheme.
  - JWT options validated on start; app refuses to boot without `Jwt:Key` (>= 32 chars).
- **Service classes** for Subject, Topic, Activity, ActivityType, StudyStrategy, RecurringOptions, OptionsDayOfWeek (thin pass-throughs over the repositories).
- **Frontend UI**: every screen built, running on mock data (unchanged since the last snapshot).
- **Infra**: compose has `api`, `postgres:17` (with `pg_isready` healthcheck), `frontend`; API container on 5000, nginx proxies `/api/` to `api:5000`. `.env.example` documents every variable.

### Not done
- **No controllers except `AuthController`.** Subjects, topics, activities and the lookup tables have services but no HTTP surface.
- **Frontend is still fully mocked.** `services/api.ts` returns fake tokens; `useStore` keeps data in memory only. The new backend contract differs from what the frontend expects (see gaps below).
- **No planning logic**, no teacher analytics endpoint, no consent handling around `DataPermission`.
- **No tests at all**, and CI only checks formatting.

### Problems found (fix before building on top)
1. ~~**Services are registered in the wrong place.**~~ Fixed on `feature/fixes`: `MedApp.API.DependencyInjection` now registers all repositories and domain services.
2. ~~**Dead duplicate DI code.**~~ Fixed on `feature/fixes`: `AddMedAppDal` and `AddMedAppServices` deleted (with them the stray `user_role` enum mapping; `Role` stays `integer`). Two JWT checks remain on the live path, both needed for now: `Program.cs` reads the key before `Build()` for JwtBearer, and DI `ValidateOnStart` also checks Issuer/Audience.
3. ~~**Compose is not runnable from a clean clone.**~~ Fixed on `feature/docker-migration-fixes`:
   - `init.sql` mount removed (only `./postgres/data` stays). If an old checkout has a `postgres/init.sql` *directory* Docker created, delete it.
   - `Jwt__*` mapped from `.env` (done on `feature/fixes`).
   - The API applies pending migrations on start when `Database:MigrateOnStartup` is true (`DB_MIGRATE_ON_STARTUP` in `.env`; off by default, `true` in `.env.example`). `postgresql` has a `pg_isready` healthcheck; `api` uses `depends_on: condition: service_healthy`. On an empty database EF logs one `fail:` for the missing `__EFMigrationsHistory` table before creating it; harmless.
   - In-network connection string is `Host=postgresql;Port=5432`; `POSTGRES_PORT` is only the host mapping, `POSTGRES_HOST` is no longer used.
   - `.env.example` documents every variable. `appsettings.json` and `appsettings.Development.json` are committed (no secrets: empty connection string and `Jwt:Key`). Keep secrets in `.env`, user-secrets or env vars, never in these files. Dead `.gitignore` entries removed.
4. ~~**Backend Dockerfile restore step.**~~ Fixed: all four `.csproj` files are copied before `dotnet restore`.
5. ~~**`UseHttpsRedirection()`** with an HTTP-only container.~~ Fixed on `feature/fixes`: removed; TLS belongs at the proxy.
6. ~~**Lookup data not seeded.**~~ Fixed on `feature/fixes`: `HasData` in `StudyStrategyConfig` (1–3) and `ActivityTypeConfig` (1–9), migration `SeedLookupsRemoveDevUser` (Npgsql also resets the identity sequences past the seeded ids). `infra/scripts/Diploma_DB_create.sql` deleted (migrations own the schema); `Diploma_DB_seed.sql` rewritten as idempotent demo data for the current schema (two users, password `Demo1234!`; how to run is in its header).
7. ~~**Seeded dev user.**~~ Fixed on `feature/fixes`: the same migration deletes the placeholder admin row inserted by `NewMigration`; `Down` re-inserts it. Applied to the local compose database; smoke test (`register` → `me`) passes.
8. **No ownership checks in the service layer yet** (scheduled in Phase 2, step 1). `SubjectService.GetByIdAsync`, `UpdateAsync`, `DeleteAsync` take only an id, and services return/accept EF entities rather than DTOs. When controllers are added, every call must be scoped to the caller's user id, or one user can read or delete another's data. Entities in `UpdateAsync` also invite over-posting; use DTOs.
9. **`AuthController` details**:
   - ~~Logout doesn't check that the refresh token belongs to the caller.~~ Fixed: `LogoutAsync` takes the caller's id from the token and revokes only their own refresh token; the endpoint returns 204 either way.
   - ~~It injects `IUserRepository` directly.~~ Fixed: `Me` goes through `IAuthService.GetUserAsync`.
   - ~~No rate limiting on login/register.~~ Fixed: built-in rate limiter, fixed window of 5 requests per minute per client IP, 429 when exceeded. The client IP is read from `X-Forwarded-For`, and any caller is trusted as a proxy. That is safe only while the API port isn't public; restrict `KnownIPNetworks` in the production profile (Phase 5).
   - Role claim is emitted but no `[Authorize(Roles=...)]` is used yet (Phase 2, with the teacher-role decision).
10. ~~**Refresh tokens**: `RefreshAsync` reads `existing.User`.~~ Resolved: `RefreshTokenRepository.GetByTokenHashAsync` includes `User`. Still worth covering in the auth-flow test.
11. **Minor**:
    - ~~`ToListAsync().ContinueWith(...)` in 7 repositories.~~ Fixed: plain `await` (`t.Result` also wrapped DB errors in `AggregateException`).
    - ~~Lookup FKs cascade on delete.~~ Fixed: `StudyStrategy → Subjects` and `ActivityType → Activities` are `Restrict` (migration `RestrictLookupDeletes`).
    - ~~Vulnerable packages.~~ Fixed: `System.Security.Cryptography.Xml 9.0.18`, `Microsoft.OpenApi 2.7.5`.
    - ~~`OptionsDayOfWeekService.RemoveAsync` deleted every weekday of the recurrence instead of one.~~ Fixed: the repository deletes by the composite key.
    - ~~Frontend `process.env.REACT_APP_API_URL` ignored by Vite.~~ Fixed: `import.meta.env.VITE_API_URL`, defaulting to relative `/api`; `vite.config.ts` proxies `/api` to `http://localhost:8080` for `npm run dev`.
    - Still open: unused `showAuthModal` in `App.tsx`; Figma-export guide `.md` files in `frontend/src` (Phase 5). Frontend build output `build/` matches the Dockerfile.

### Frontend ↔ backend gaps
| Frontend | Backend now | Action |
|---|---|---|
| Login returns `{ user: {id,email,name,role}, token }` | Returns `{ accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }`; user via `GET /auth/me` | Rewrite `authAPI`; store both tokens; call `/me` after login |
| Register `{email,password,name,role}` | `{firstName,lastName,dateOfBirth,email,password,dataPermission}`; no way to register as teacher | Update `AuthModal`; decide how teachers are created (admin-only / invite) |
| `role: 'student' \| 'teacher'` | `UserRole { User, Admin }` | Add a Teacher role (migration) or rethink |
| No refresh handling | Short-lived access + rotating refresh token | Add 401 → refresh → retry in the fetch wrapper |
| `Subject.weight`, `strategy` string, `mode` | `Priority`, `PlanningMethodId`, `StudyMode` | One vocabulary, map in DTOs |
| `Topic.knowledge`, `order`, `sectionId`, `lastStudied`, `nextReview` | `Feedback` only | Add fields needed for spaced review; decide on `Section` |
| `Activity.type` string, `status` | `ActivityTypeId`, `Status` | Map via lookup table |
| `recurrencePattern.until` | not modelled | Add `RecurringOptions.Until` |
| `TimeBlock` (initial setup) | none | Persist as recurring Activities |

## Order of work

### Phase 0 — Make it run from a clean clone ✅ Done
1. ~~Fix backend Dockerfile restore.~~ Done.
2. ~~Compose: healthcheck, `depends_on: service_healthy`, `Port=5432`, no `init.sql` mount, `.env.example`, `.gitignore` cleanup.~~ Done.
3. ~~Apply migrations on start.~~ Done, behind `DB_MIGRATE_ON_STARTUP` (default false).
4. ~~Seed StudyStrategy and ActivityType in a migration; remove the fake admin user.~~ Done.
5. ~~Collapse DI into one place and register all repositories and services.~~ Done.
6. ~~Fix the `dotnet format` error.~~ Done; `dotnet format --verify-no-changes` passes.
   Verified 2026-10-09: a copy of the repo without ignored files + `.env` from `.env.example` → `docker compose up --build` → all migrations applied, `register` → `me` works, demo seed loads and its users can log in.

### Phase 1 — Connect the frontend to auth
1. Rewrite `authAPI` to the real contract. (Base URL already switched to `VITE_API_URL` / relative `/api` with a Vite dev proxy.)
2. Token storage and refresh-on-401 in one fetch wrapper; `logout` sends the refresh token.
3. Update `AuthModal` fields; settle the teacher-role question.
4. ~~Auth backend fixes (problem 9): logout ownership, `Me` via service, rate limiting.~~ Done.
   **Done when:** register/login/logout and page refresh work against the real API.

### Phase 2 — CRUD for core data (Subjects → Topics → Activities)
1. DTOs and controllers with **ownership checks** (problem 8):
   - Service methods take the caller's user id from the token, never from the request body; every query is filtered by it (`Subject.UserId`, and through `Subject` for Topics and Activities).
   - Get/update/delete of another user's row returns 404 (don't reveal it exists).
   - Accept and return DTOs, not EF entities (no over-posting of `UserId`, ids, navigation properties).
   - Validators for each DTO; check that referenced lookup ids (`PlanningMethodId`, `ActivityTypeId`) exist.
   - Apply `[Authorize(Roles = ...)]` once roles beyond `User` are used (teacher/admin endpoints), per the Phase 1 teacher-role decision.
2. Frontend API client per resource; load on login; write through in `useStore`; stop seeding demo data on the real path.
3. Resolve the model-gap rows as each resource lands.
   **Done when:** data survives a browser refresh and user B cannot see or change user A's data (check with a test).

### Phase 3 — Planning logic (core of the thesis)
1. Write the rules down first: how traffic-light colour, active-recall intervals, subject mode and exam date become scheduled sessions.
2. Scheduler in `MedApp.Services` as pure functions, unit-tested; overload warnings.
3. Re-plan when topic feedback or activity status changes.

### Phase 4 — Teacher / analytics
1. Only include users with `DataPermission = true`; aggregate with a minimum group size.
2. `GET /api/teacher/analytics`, role-restricted. Student analytics from real data.

### Phase 5 — Quality and delivery
1. Tests: scheduler unit tests, auth flow (register → login → refresh → replay) and ownership checks as API integration tests. Add `dotnet test` and `vite build` to CI.
2. Frontend loading/error states and form validation.
3. Pinned images, production compose profile (don't publish the API port; restrict forwarded-header `KnownIPNetworks` to the compose network, see problem 9).
4. README (run, env vars, architecture, ER diagram); remove the Figma guide `.md` files.

## Decisions taken
1. Migrations on start are opt-in: `DB_MIGRATE_ON_STARTUP=true` for local dev; in production set it only for a deploy that should migrate, after a `pg_dump`. Review the migration `.cs` (`Up()`) in the PR instead of generating SQL; EF warns at scaffold time when an operation may lose data. Before the first production run, check `__EFMigrationsHistory` exists (otherwise baseline it) and whether the placeholder admin `8898cf29-…` that `SeedLookupsRemoveDevUser` deletes owns any data (cascades).
2. Migrations own the schema; `infra/scripts/Diploma_DB_seed.sql` is optional demo data only.
3. `appsettings.json` / `appsettings.Development.json` are committed without secrets.

## Soonest TODO
1. Phase 1: switch the frontend to the real auth contract.
2. Phase 2: first controller (Subjects) with ownership scoping.
