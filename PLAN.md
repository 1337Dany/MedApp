# MedApp — Status and Plan

Snapshot of branch `dev` at `d8fdeb9` (merge of PR #3, `feature-auth`), 2026-10-07.
Re-checked on `feature/fixes` at `9007af5`, 2026-10-09. Updated on `feature/docker-migration-fixes`, 2026-10-09: builds with 0 errors / 0 warnings; a clean copy of the repo + `.env` from `.env.example` → `docker compose up` works end to end.
Updated on `feature/frontend-auth`, 2026-10-09: Phase 1 done (frontend on the real auth contract, Teacher role).
Updated on `feature/core-crud`, 2026-10-09: Phase 2 done (CRUD with ownership checks, frontend on real data, integration tests).
Updated on `feature/planning`, 2026-10-09: Phase 3 done (study planner, spaced repetition, overload warnings; rules in `docs/PLANNING.md`).
Updated on `feature/quality-delivery`, 2026-10-10: Phase 5 done (CI runs tests, type check and build; production compose profile; pinned images; README).
Updated on `feature/teacher-analytics`, 2026-10-09: Phase 4 done (teacher analytics with consent and minimum group size, profile/consent editing, admin role management).
Stack: ASP.NET Core (.NET 10) + EF Core/Npgsql + PostgreSQL; React 18 + Vite + Zustand; Docker Compose; GitHub Action running `dotnet format --verify-no-changes`.

## Where the project stands

### Done
- **Models / DAL**: all entities, per-entity configs, 9 migrations (`AddAuthAndRoles`: `User.Role`, unique email index, `RefreshTokens` table; `SeedLookupsRemoveDevUser`; `RestrictLookupDeletes`; `CoreCrudModelGaps`; latest `PlanningSupport`: `Activity.IsAutoPlanned`, `Topic.ReviewStage`, `User.TimeZone`). Applied on start when `Database:MigrateOnStartup` is true.
- **Repositories**: one per entity plus `UnitOfWork` (`MedApp.DAL/Repositories`, interfaces in `MedApp.Services/Repositories`). Queries for owned data take the caller's user id.
- **Auth backend** (works end to end in code):
  - `POST /api/auth/register | login | refresh | logout`, `GET /api/auth/me`.
  - `PasswordHasher<User>`, JWT access tokens, hashed refresh tokens with rotation and replay detection.
  - FluentValidation on requests, AutoMapper for `User` ↔ DTOs, Swagger with a Bearer scheme.
  - JWT options validated on start; app refuses to boot without `Jwt:Key` (>= 32 chars).
- **CRUD API** (`feature/core-crud`), all `[Authorize]`, every call scoped to the caller:
  - `GET/POST /api/subjects`, `GET/PUT/DELETE /api/subjects/{id}` (delete cascades to topics and activities).
  - `GET /api/topics[?subjectId=]`, `GET/POST /api/subjects/{subjectId}/topics`, `GET/PUT/DELETE /api/topics/{id}`.
  - `GET /api/activities[?from=&to=]` (recurring series that can occur in the window are included), `GET/POST`, `PUT/DELETE /api/activities/{id}`, `PATCH /api/activities/{id}/status`. Recurrence (`frequency`, `daysOfWeek`, `until`) is part of the activity DTO; `RecurringOptions` rows are managed by `ActivityService`.
  - `GET /api/study-strategies`, `GET /api/activity-types` (read-only lookups).
  - Services take and return DTOs; validators check lookup ids, ranges and recurrence; another user's row is a 404, a foreign subject/topic referenced from an activity is a 400.
  - The unused `RecurringOptionsService`, `OptionsDayOfWeekService` and the day-of-week repository were removed.
- **Study planner** (`feature/planning`, rules in `docs/PLANNING.md`): pure functions in `MedApp.Services/Planning` (`StudyPlanner`, `SpacedRepetition`, `RecurrenceExpander`, `WorkloadAnalyzer`, constants in `PlanningRules`), orchestrated by `PlanningService`.
  - `POST /api/planning/generate` `{ timeZone, days }` replaces future auto-planned sessions; `GET /api/planning/warnings`.
  - Plans in the student's local time (IANA zone from the browser, stored on the user; the API image now installs `tzdata`).
  - A changed topic rating or a finished session on a topic is a spaced-repetition review; an existing plan is re-generated after topic, subject and activity-status changes; moving a planned session makes it the student's own.
  - Frontend: planner card and workload warnings on the dashboard, "Plan My Week" quick action, auto-planned badge, next-review date on topics.
- **Teacher / admin** (`feature/teacher-analytics`):
  - `GET /api/teacher/analytics` (`[Authorize(Roles = "Teacher,Admin")]`): only students (role `User`) with `DataPermission = true`; nothing is reported below 5 such students, and subjects studied by fewer than 5 of them are left out. Aggregation is a pure function (`Analytics/ClassAnalyticsCalculator`): completion rate (done 1, partially done 0.5, over past activities), at-risk students (completion < 60 % or more than half red topics), average knowledge per subject (green 100, yellow 50, red 0), study hours and completion per week for the last 5 weeks.
  - `PUT /api/users/me`: own profile and data-sharing consent (takes effect immediately).
  - `GET /api/users`, `PUT /api/users/{id}/role` (admins only; an admin cannot change their own role).
  - Frontend: teacher dashboard on real data with insights derived from it, "not enough data" state; Profile Settings modal with the consent switch; admin Users view; staff no longer see the empty student views.
  - `infra/scripts/Diploma_DB_seed.sql` adds a demo teacher and admin.
- **Tests**: `backend/tests/MedApp.Services.Tests` (planner unit tests, no Docker) and `backend/tests/MedApp.API.Tests` (xUnit, `WebApplicationFactory`, Testcontainers Postgres; needs Docker). Auth flow incl. refresh replay, ownership isolation between two users, CRUD, cascades, recurrence, validation.
- **Frontend UI**: every screen built, running on mock data (unchanged since the last snapshot).
- **Infra**: compose has `api`, `postgres:17` (with `pg_isready` healthcheck), `frontend`; API container on 5000, nginx proxies `/api/` to `api:5000`. `.env.example` documents every variable.

### Not done
- The Figma-export UI kit (`frontend/src/components/ui`, `components/figma`) is not used by any screen; it is excluded from the type check and could be deleted.

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
8. ~~**No ownership checks in the service layer.**~~ Fixed on `feature/core-crud`: every service method takes the caller's id from the token, repositories filter by it (`Subject.UserId`, `Activity.UserId`, `Topic.Subject.UserId`), services accept and return DTOs. Covered by `OwnershipTests`.
9. **`AuthController` details**:
   - ~~Logout doesn't check that the refresh token belongs to the caller.~~ Fixed: `LogoutAsync` takes the caller's id from the token and revokes only their own refresh token; the endpoint returns 204 either way.
   - ~~It injects `IUserRepository` directly.~~ Fixed: `Me` goes through `IAuthService.GetUserAsync`.
   - ~~No rate limiting on login/register.~~ Fixed: built-in rate limiter, fixed window of 5 requests per minute per client IP, 429 when exceeded. The client IP is read from `X-Forwarded-For`. ~~Any caller is trusted as a proxy.~~ `ForwardedHeaders:KnownNetworks` restricts the trusted proxies; `docker-compose.prod.yml` sets it to the compose network and does not publish the API port (Phase 5). Without it (local development) any caller is trusted.
   - ~~Role claim is emitted but no `[Authorize(Roles=...)]` is used yet.~~ Used since Phase 4 (teacher analytics, user administration). A role change applies with the user's next access token.
10. ~~**Refresh tokens**: `RefreshAsync` reads `existing.User`.~~ Resolved: `RefreshTokenRepository.GetByTokenHashAsync` includes `User`. Still worth covering in the auth-flow test.
11. **Minor**:
    - ~~`ToListAsync().ContinueWith(...)` in 7 repositories.~~ Fixed: plain `await` (`t.Result` also wrapped DB errors in `AggregateException`).
    - ~~Lookup FKs cascade on delete.~~ Fixed: `StudyStrategy → Subjects` and `ActivityType → Activities` are `Restrict` (migration `RestrictLookupDeletes`).
    - ~~Vulnerable packages.~~ Fixed: `System.Security.Cryptography.Xml 9.0.18`, `Microsoft.OpenApi 2.7.5`.
    - ~~`OptionsDayOfWeekService.RemoveAsync` deleted every weekday of the recurrence instead of one.~~ Fixed: the repository deletes by the composite key.
    - ~~Frontend `process.env.REACT_APP_API_URL` ignored by Vite.~~ Fixed: `import.meta.env.VITE_API_URL`, defaulting to relative `/api`; `vite.config.ts` proxies `/api` to `http://localhost:8080` for `npm run dev`.
    - ~~Unused `showAuthModal` in `App.tsx`; Figma-export guide `.md` files in `frontend/src`.~~ Removed (Phase 1 and Phase 5). Frontend build output `build/` matches the Dockerfile.

### Frontend ↔ backend gaps
| Frontend | Backend now | Action |
|---|---|---|
| ~~Login returns `{ user, token }`~~ | `TokenResponse`; user via `GET /auth/me` | Done: `authAPI` rewritten, both tokens stored, `/me` after login |
| ~~Register `{email,password,name,role}`~~ | `{firstName,lastName,dateOfBirth,email,password,dataPermission}` | Done: `AuthModal` has these fields; registration always creates a student |
| ~~`role: 'student' \| 'teacher'`~~ | `UserRole { User, Admin, Teacher }` | Done: `Teacher = 2` (integer column, no migration); UI maps `user` → student |
| ~~No refresh handling~~ | Short-lived access + rotating refresh token | Done: 401 → single shared refresh → retry in `services/http.ts` |
| ~~`Subject.weight`, `strategy` string, `mode`~~ | `Priority` (1–10), `PlanningMethodId`, `StudyMode`; `ExamDate` now optional | Done: mapped in `frontend/src/services/mappers.ts` (lookup ids match the seeded rows) |
| ~~`Topic.knowledge`, `order`, `sectionId`, `lastStudied`, `nextReview`~~ | `Feedback`, `Order`, `LastStudied`, `NextReview` (server-maintained) | Done. `Section` was unused in the UI and was dropped from the frontend |
| ~~`Activity.type` string, `status`~~ | `ActivityTypeId`, `Status`; `UserId` owner, optional `SubjectId` and `TopicId` | Done: mapped in `mappers.ts` |
| ~~`recurrencePattern.until`~~ | `RecurringOptions.Until` | Done; the calendar and dashboard expand series into occurrences (`utils/recurrence.ts`) |
| ~~`TimeBlock` (initial setup)~~ | none | Dropped: unused in the UI; routines are recurring activities |

## Order of work

### Phase 0 — Make it run from a clean clone ✅ Done
1. ~~Fix backend Dockerfile restore.~~ Done.
2. ~~Compose: healthcheck, `depends_on: service_healthy`, `Port=5432`, no `init.sql` mount, `.env.example`, `.gitignore` cleanup.~~ Done.
3. ~~Apply migrations on start.~~ Done, behind `DB_MIGRATE_ON_STARTUP` (default false).
4. ~~Seed StudyStrategy and ActivityType in a migration; remove the fake admin user.~~ Done.
5. ~~Collapse DI into one place and register all repositories and services.~~ Done.
6. ~~Fix the `dotnet format` error.~~ Done; `dotnet format --verify-no-changes` passes.
   Verified 2026-10-09: a copy of the repo without ignored files + `.env` from `.env.example` → `docker compose up --build` → all migrations applied, `register` → `me` works, demo seed loads and its users can log in.

### Phase 1 — Connect the frontend to auth ✅ Done (`feature/frontend-auth`)
1. ~~Rewrite `authAPI` to the real contract.~~ Done (`services/api.ts`).
2. ~~Token storage and refresh-on-401 in one fetch wrapper; `logout` sends the refresh token.~~ Done (`services/http.ts`). Parallel 401s share one refresh, so the single-use refresh token is never sent twice (that would trip replay detection).
3. ~~Update `AuthModal` fields; settle the teacher-role question.~~ Done.
4. ~~Auth backend fixes (problem 9): logout ownership, `Me` via service, rate limiting.~~ Done.
   Also: enums are serialized as camelCase strings (`JsonStringEnumConverter`); the auth rate limit is configurable (`RateLimiting:AuthPermitLimit`, default 5).
   Verified 2026-10-09 in a browser against compose: register (with server-side password errors), reload keeps the session, a broken access token is refreshed transparently, logout revokes and clears tokens, wrong password shows the API message.

### Phase 2 — CRUD for core data (Subjects → Topics → Activities) ✅ Done (`feature/core-crud`)
1. ~~DTOs and controllers with **ownership checks** (problem 8):~~ Done.
   - Service methods take the caller's user id from the token, never from the request body; every query is filtered by it (`Subject.UserId`, and through `Subject` for Topics and Activities).
   - Get/update/delete of another user's row returns 404 (don't reveal it exists).
   - Accept and return DTOs, not EF entities (no over-posting of `UserId`, ids, navigation properties).
   - Validators for each DTO; check that referenced lookup ids (`PlanningMethodId`, `ActivityTypeId`) exist.
   - Apply `[Authorize(Roles = ...)]` once roles beyond `User` are used (teacher/admin endpoints), per the Phase 1 teacher-role decision.
2. ~~Frontend API client per resource; load on login; write through in `useStore`; stop seeding demo data on the real path.~~ Done. Demo data is generated by the frontend only and saved through the normal endpoints when a student picks "Start with Demo Data".
3. ~~Resolve the model-gap rows as each resource lands.~~ Done (migration `CoreCrudModelGaps`; existing activities get their owner from their subject).
   Verified 2026-10-09: integration tests pass; in a browser against compose, demo data loads and survives a reload, the calendar shows recurring series on every matching day, subject/topic/activity forms save, reopen with the same local time, a subject delete removes its activities, and a second user starts empty.

### Phase 3 — Planning logic (core of the thesis) ✅ Done (`feature/planning`)
1. ~~Write the rules down first.~~ Done: `docs/PLANNING.md`, derived from what the UI promises for each strategy and mode plus standard Leitner-style spaced repetition.
2. ~~Scheduler in `MedApp.Services` as pure functions, unit-tested; overload warnings.~~ Done (25 unit tests).
3. ~~Re-plan when topic feedback or activity status changes.~~ Done (also after subject and topic changes, once a plan exists).
   Verified 2026-10-09: API tests cover generation around a recurring timetable in Europe/Warsaw, replacement, reviews, re-planning and isolation; in a browser the demo account gets 36 sessions over 7 days that fit between classes and meals, warnings show with suggestions, and finishing a session updates the topic's next review.

### Phase 4 — Teacher / analytics ✅ Done (`feature/teacher-analytics`)
1. ~~Only include users with `DataPermission = true`; aggregate with a minimum group size.~~ Done (minimum 5, also per subject).
2. ~~`GET /api/teacher/analytics`, role-restricted. Student analytics from real data.~~ Done; the student Analytics view already works on the real store data since Phase 2.
   Verified 2026-10-09: tests cover forbidden access for students, the "not enough data" threshold, exclusion of non-consenting students, per-subject suppression, consent withdrawal and admin-only role changes; in a browser against compose with a generated class, the teacher sees the aggregates, the admin can grant and remove the teacher role, and a student's consent switch persists.

### Phase 5 — Quality and delivery ✅ Done (`feature/quality-delivery`)
1. ~~Tests: scheduler unit tests, auth flow and ownership checks as API integration tests. Add `dotnet test` and `vite build` to CI.~~ Done: 28 unit + 18 integration tests; `.github/workflows/ci.yml` runs build + test (Testcontainers on the runner's Docker) and `npm ci`, `npm run typecheck`, `npm run build`. `format.yml` is unchanged.
2. ~~Frontend loading/error states and form validation.~~ Done along the way: loading and retry screens for session and data, inline API errors in every form, client-side checks mirroring the validators (password rules, weekly days, ranges, lengths).
3. ~~Pinned images, production compose profile.~~ Done: `postgres:17.11`, `node:22.23.3-alpine`, `nginx:1.30.5-alpine` (.NET images stay on `10.0-alpine`); `docker-compose.prod.yml` publishes only nginx and trusts forwarded headers from `172.30.0.0/24` only. Verified: the API and database have no host ports, migrations apply, a spoofed `X-Forwarded-For` does not bypass the login limit.
4. ~~README; remove the Figma guide `.md` files.~~ Done (`Attributions.md` kept for the license notices).

## Decisions taken
4. Roles: `User` (student, the default), `Teacher`, `Admin`. Registration always creates a student; teacher and admin accounts are granted by an admin (`PUT /api/users/{id}/role`, Users view), the first admin via SQL (`UPDATE "Users" SET "Role" = 1 WHERE "Email" = ...`). Teachers and admins get the class views in the UI.
5. Enums travel as camelCase strings in JSON; the database keeps integers.
1. Migrations on start are opt-in: `DB_MIGRATE_ON_STARTUP=true` for local dev; in production set it only for a deploy that should migrate, after a `pg_dump`. Review the migration `.cs` (`Up()`) in the PR instead of generating SQL; EF warns at scaffold time when an operation may lose data. Before the first production run, check `__EFMigrationsHistory` exists (otherwise baseline it) and whether the placeholder admin `8898cf29-…` that `SeedLookupsRemoveDevUser` deletes owns any data (cascades).
2. Migrations own the schema; `infra/scripts/Diploma_DB_seed.sql` is optional demo data only.
3. `appsettings.json` / `appsettings.Development.json` are committed without secrets.

## Soonest TODO
All phases are done. Possible follow-ups:
1. Delete the unused Figma UI kit (`frontend/src/components/ui`, `components/figma`) and the Vite aliases that only it needs.
2. Per-occurrence status for recurring activities (today a status applies to the whole series).
3. Teacher groups/classes, if analytics should be per class rather than over all consenting students.
