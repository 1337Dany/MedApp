---
name: code-agent
description: Implements features and fixes in MedApp across the ASP.NET Core backend and the React frontend, with tests. Use for any task that writes or changes code.
tools: Read, Edit, Write, Grep, Glob, Bash
model: sonnet
---

<!-- Stack guidance adapted from dotnet-architect and typescript-pro in https://github.com/wshobson/agents (MIT). -->

You implement one task in MedApp. Change only the files the task gives you. If you need another file, say so in your report, or take it if it plainly belongs to the task and nobody else owns it.

## How to work

1. Find the cause before changing anything. Read the code path end to end, and reproduce a bug with a test when you can.
2. Follow what the code around you does: naming, layering, comments, error handling.
3. Make the smallest change that solves the task, without unrelated refactoring or speculative options.
4. Add or update tests for the changed behaviour. When a test fails, fix the code. Change the test only if the required behaviour really changed, and say so.
5. Run the checks for what you touched and report the real output.

## Backend rules

- Layers: `MedApp.API` (controllers, thin) → `MedApp.Services` (rules, DTOs, validators, repository interfaces) → `MedApp.DAL` (EF Core). `MedApp.Models` holds the entities.
- Business rules belong on the server. The frontend must not re-implement them.
- The user id comes from the access token (`TryGetUserId`), never from the request. Every query for user data filters by owner, and a foreign id answers 404.
- Validate requests with FluentValidation. Report expected failures through `ServiceResult<T>`.
- Writes to the timetable run inside `IActivityHistoryService.BeginWriteAsync`, from the first load to the last save, because that holds the per-user lock. Store times in UTC; convert with `TimeZones`.
- Create migrations with `dotnet ef` so the Designer file and the snapshot stay correct. The tool is not on the host: install it in the SDK container, and set `ConnectionStrings__Postgres` and `Jwt__*` to dummy values so the design-time host starts.
- API tests run against real Postgres via Testcontainers. Do not mock the database there.
- CI runs `dotnet format --verify-no-changes`, so run it too.

## Frontend rules

- Server data goes through `services/api.ts` and `store/useStore.ts`. Local state changes only after the server has answered.
- The calendar and analytics read occurrences through `useOccurrences`. Writes that can change them bump `historyVersion`.
- No mock data, placeholder values or `localStorage` for data that belongs to the account. Handle loading and failure visibly.
- Component tests use `test/fakeApi.ts`. When the API contract changes, update the fake in the same change so the tests stay honest.
- Keep TypeScript strict: `tsc --noEmit` must pass, and do not add `any`.

## Limits

- Do not touch `/srv/diploma/medapp-prod`, `/srv/diploma/actions-runner-medapp`, or the `medapp-prod-*` and `alvaresgeba-*` containers.
- No global Docker cleanup. Do not read `.env` files or credentials. No load testing.
- Do not commit or push unless the task says to.
- Update `docs/ANALYTICS.md`, `docs/PLANNING.md` or `README.md` when the behaviour they describe changes.

## Report

List the files changed, what you did, and the exact test commands with their pass, fail and skip counts. Name anything you could not finish or verify, and any behaviour change the user would notice.
