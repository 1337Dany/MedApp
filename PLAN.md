# MedApp — Status and Plan

Snapshot of branch `dev` at `d8fdeb9` (merge of PR #3, `feature-auth`), 2026-10-07.
Re-checked on `feature/fixes` at `9007af5`, 2026-10-09: solution builds (0 errors, 18 NuGet vulnerability warnings, see problem 11).
Stack: ASP.NET Core (.NET 10) + EF Core/Npgsql + PostgreSQL; React 18 + Vite + Zustand; Docker Compose; GitHub Action running `dotnet format --verify-no-changes`.

## Where the project stands

### Done
- **Models / DAL**: all entities, per-entity configs, 5 migrations (latest `AddAuthAndRoles`: `User.Role`, unique email index, `RefreshTokens` table).
- **Repositories**: one per entity plus `UnitOfWork` (`MedApp.DAL/Repositories`, interfaces in `MedApp.Services/Repositories`).
- **Auth backend** (works end to end in code):
  - `POST /api/auth/register | login | refresh | logout`, `GET /api/auth/me`.
  - `PasswordHasher<User>`, JWT access tokens, hashed refresh tokens with rotation and replay detection.
  - FluentValidation on requests, AutoMapper for `User` ↔ DTOs, Swagger with a Bearer scheme.
  - JWT options validated on start; app refuses to boot without `Jwt:Key` (>= 32 chars).
- **Service classes** for Subject, Topic, Activity, ActivityType, StudyStrategy, RecurringOptions, OptionsDayOfWeek (thin pass-throughs over the repositories).
- **Frontend UI**: every screen built, running on mock data (unchanged since the last snapshot).
- **Infra**: compose now has `api`, `postgres:17`, `frontend`; ports are aligned (API container on 5000, nginx proxies to `api:5000`).

### Not done
- **No controllers except `AuthController`.** Subjects, topics, activities and the lookup tables have services but no HTTP surface.
- **Frontend is still fully mocked.** `services/api.ts` returns fake tokens; `useStore` keeps data in memory only. The new backend contract differs from what the frontend expects (see gaps below).
- **No planning logic**, no teacher analytics endpoint, no consent handling around `DataPermission`.
- **No tests at all**, and CI only checks formatting.

### Problems found (fix before building on top)
1. **Services are registered in the wrong place.** `Program.cs` uses `MedApp.API.DependencyInjection.AddMedAppInfrastructure`, which registers only the user and refresh-token repositories and the auth services. `ISubjectService`, `ITopicService`, `IActivityService` and the other repositories are **never registered**. Any controller using them would fail at runtime.
2. **Dead duplicate DI code.** `MedApp.DAL.AddMedAppDal` and `MedApp.Services.AddMedAppServices` are never called, and both duplicate the JWT-options validation that the API's DI also does. `Program.cs` repeats the key check by hand, so there are four copies. `AddMedAppDal` also maps `UserRole` as a Postgres enum (`user_role`), while the migration creates the column as `integer` and the API path does not map it. Keep one DI entry point and delete the rest. The API is the natural place for it, since DAL depends on Services (it implements the interfaces defined there).
3. **Compose is not runnable from a clean clone.**
   - Mounts `./postgres/init.sql` and `./postgres/data`. Neither exists in the repo and both are gitignored; Docker will create a directory in place of the missing file. The old `infra/postgres/*` paths were dropped, and `.gitignore` lists both old and new.
   - The `api` service gets no `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience`, so the container will exit on start (`appsettings.*` is gitignored too).
   - `api` lost `depends_on: postgresql`, and nothing applies migrations at start-up. A plain `depends_on` isn't enough once migrations run on start: Postgres needs a `pg_isready` healthcheck and `condition: service_healthy`.
   - `.env` variable names changed (`POSTGRES_DB` → `POSTGRES_DATABASE`); there is no `.env.example` to document it. Existing local `.env` files still have the old names (`POSTGRES_DB`, `POSTGRES_ROOT_PASSWORD`) and lack `POSTGRES_DATABASE`, `POSTGRES_HOST`, `API_HTTP_PORT`, `ASPNETCORE_ENVIRONMENT` and `Jwt__*`, so compose doesn't run on an existing checkout either.
   - No `appsettings*.json` exists in `MedApp.API` (gitignored), so local `dotnet run` depends on user-secrets or env vars, and nothing documents which.
4. **Backend Dockerfile restore step** copies only `MedApp.API.csproj` before `dotnet restore`. The API now references DAL and Services (which reference Models), so restore either fails or the layer cache is wasted. Copy all four `.csproj` files before `restore`. Image not built yet, so unconfirmed.
5. **`UseHttpsRedirection()`** with an HTTP-only container (port 5000).
6. **Lookup data (StudyStrategy, ActivityType) is not seeded by any migration.** Creating a Subject or Activity violates its FK on a fresh database. `infra/scripts/Diploma_DB_seed.sql` is outdated (no `Role`, no `RefreshTokens`), but its lookup values are usable: StudyStrategy 1–3 (Traffic Light, Active Recall, Manual), ActivityType 1–9 (Studying … One-Time Event). Seed them with `HasData` and fixed ids. The ids are identity columns, so the sequences won't advance past the seeded ids. That's fine while the tables stay read-only.
7. **Seeded dev user** (`sisoev.a@outlook.com`, hash `somehash`) is created by `NewMigration` (`20260314185840`) and promoted to `Admin` by `AddAuthAndRoles`. It can't log in (not a valid Identity hash), but it is a real admin row in every database. Because of the unique email index, nobody can register with that email while the row exists. The model snapshot has no `HasData` for it, so removal needs a new migration with `DeleteData`.
8. **No ownership checks in the service layer yet.** `SubjectService.GetByIdAsync`, `UpdateAsync`, `DeleteAsync` take only an id, and services return/accept EF entities rather than DTOs. When controllers are added, every call must be scoped to the caller's user id, or one user can read or delete another's data. Entities in `UpdateAsync` also invite over-posting; use DTOs.
9. **`AuthController` details**:
   - Logout is `[Authorize]` but doesn't check that the refresh token belongs to the caller.
   - It injects `IUserRepository` directly (bypasses the service layer).
   - No rate limiting on login/register.
   - Role claim is emitted but no `[Authorize(Roles=...)]` is used yet.
10. ~~**Refresh tokens**: `RefreshAsync` reads `existing.User`.~~ Resolved: `RefreshTokenRepository.GetByTokenHashAsync` includes `User`. Still worth covering in the auth-flow test.
11. **Minor / mention only**: all repositories except User/RefreshToken/UnitOfWork (7 files) use `ToListAsync().ContinueWith(...)` to cast (just `await` and return); FKs `StudyStrategy → Subjects` and `ActivityType → Activities` cascade on delete, so deleting a lookup row deletes user data (should be `Restrict`); vulnerable packages: `System.Security.Cryptography.Xml 9.0.0` (pulled in indirectly by DAL) and `Microsoft.OpenApi 2.4.1` (API); `Frontend` build output is `build/` (matches Dockerfile, fine); frontend `process.env.REACT_APP_API_URL` is ignored by Vite and defaults to `localhost:3001`; unused `showAuthModal` in `App.tsx`; Figma-export guide `.md` files in `frontend/src`.

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

### Phase 0 — Make it run from a clean clone
1. Fix backend Dockerfile restore (copy all csproj files, or copy `src/` before restore).
2. Compose: remove the missing `init.sql` mount (or commit one), add a `pg_isready` healthcheck to `postgresql` and `depends_on: postgresql: condition: service_healthy` to `api`, pass `Jwt__Key/Issuer/Audience` from `.env`, commit `.env.example` and `.gitignore` cleanup.
3. Apply migrations on start in Development (`Database.Migrate()`), and drop `UseHttpsRedirection` in the container.
4. Seed StudyStrategy and ActivityType in a migration; remove the fake admin user.
5. Collapse DI into one place (API's, extended) and delete `AddMedAppDal` / `AddMedAppServices`, or the reverse; register all repositories and services.
   **Done when:** a clean clone + `.env` → `docker compose up` → Swagger works, `register` then `me` returns the user.

### Phase 1 — Connect the frontend to auth
1. Rewrite `authAPI` to the real contract; env var as Vite `VITE_*` or relative `/api` (+ dev proxy in `vite.config.ts`).
2. Token storage and refresh-on-401 in one fetch wrapper; `logout` sends the refresh token.
3. Update `AuthModal` fields; settle the teacher-role question.
   **Done when:** register/login/logout and page refresh work against the real API.

### Phase 2 — CRUD for core data (Subjects → Topics → Activities)
1. DTOs and controllers; every query filtered by the caller's id (fixes problem 8). Validators for each DTO.
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
3. Rate limiting on auth endpoints, pinned images, production compose profile.
4. README (run, env vars, architecture, ER diagram); remove the Figma guide `.md` files.

## Open decisions (Phase 0)
1. Remove the fake admin user via a new migration?
2. Apply migrations on start only in Development (compose sets `ASPNETCORE_ENVIRONMENT=Development`), or always?
3. `UseHttpsRedirection`: remove entirely, or keep for non-Development only (nginx in front speaks plain HTTP)?

## Soonest TODO
1. Phase 0 items 1–5: Dockerfile, compose/`.env`, migrations on start, lookup seed, single DI registration.
2. Phase 1: switch the frontend to the real auth contract.
3. Phase 2: first controller (Subjects) with ownership scoping.
