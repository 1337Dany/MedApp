#Requires -Version 7
<#
.SYNOPSIS
    Smoke test for the running compose stack: migrations, auth flow, logout ownership,
    lookup FK restrict, rate limiting, and (optionally) the demo seed.

.EXAMPLE
    docker compose up -d --build
    ./infra/scripts/smoke-test.ps1
    ./infra/scripts/smoke-test.ps1 -WithSeed

.NOTES
    Rate limiting (5 auth requests per minute per IP) is tested last and uses up the budget:
    wait a minute between runs. Users created here (*@smoke.local) are deleted at the end.
#>
param(
    [string]$BaseUrl = "http://localhost:3000/api",   # through nginx, like the browser
    [string]$DbContainer = "postgres_db",
    [switch]$WithSeed                                 # also load Diploma_DB_seed.sql and log in as a demo user
)

$failed = 0

function Check([string]$Name, [bool]$Ok, [string]$Detail = '') {
    if ($Ok) { Write-Host "PASS  $Name" -ForegroundColor Green }
    else { Write-Host "FAIL  $Name  $Detail" -ForegroundColor Red; $script:failed++ }
}

function Call([string]$Method, [string]$Path, $Body = $null, [string]$Token = $null) {
    $params = @{
        Method = $Method; Uri = "$BaseUrl$Path"; Headers = @{}
        SkipHttpErrorCheck = $true; StatusCodeVariable = 'status'
    }
    if ($Token) { $params.Headers.Authorization = "Bearer $Token" }
    if ($null -ne $Body) { $params.Body = $Body | ConvertTo-Json; $params.ContentType = 'application/json' }
    $resp = Invoke-RestMethod @params
    [pscustomobject]@{ Status = [int]$status; Body = $resp }
}

function Psql([string]$Sql) {
    $out = $Sql | docker exec -i $DbContainer sh -c 'psql -X -q -t -A -U "$POSTGRES_USER" -d "$POSTGRES_DB"' 2>&1
    ($out | Out-String).Trim()
}

function Register([string]$Email) {
    Call POST /auth/register @{
        firstName = 'Smoke'; lastName = 'Test'; dateOfBirth = '2000-01-01'
        email = $Email; password = 'Smoke-Passw0rd!'; dataPermission = $true
    }
}

Write-Host "`n== Infrastructure" -ForegroundColor Cyan
$health = docker inspect -f '{{.State.Health.Status}}' $DbContainer 2>&1
Check "postgres healthcheck is healthy" ($health -eq 'healthy') "got: $health"

$lastMigration = Psql 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY 1 DESC LIMIT 1;'
Check "migrations applied (latest RestrictLookupDeletes)" ($lastMigration -like '*_RestrictLookupDeletes') "got: $lastMigration (DB_MIGRATE_ON_STARTUP=true in .env? stale image? run: docker compose up -d --build)"

$lookups = Psql 'SELECT (SELECT count(*) FROM "StudyStrategies") || ''/'' || (SELECT count(*) FROM "ActivityTypes");'
Check "lookup tables seeded (3 strategies / 9 activity types)" ($lookups -eq '3/9') "got: $lookups"

Write-Host "`n== Auth flow" -ForegroundColor Cyan
$run = [guid]::NewGuid().ToString('N').Substring(0, 8)
$a = Register "a-$run@smoke.local"
$b = Register "b-$run@smoke.local"
if ($a.Status -eq 429 -or $b.Status -eq 429) {
    Write-Host "Rate limit still active from a previous run; wait a minute and re-run." -ForegroundColor Yellow
    exit 1
}
Check "register returns tokens" ($a.Status -eq 200 -and $a.Body.accessToken -and $b.Body.refreshToken) "status: $($a.Status) / $($b.Status)"

$me = Call GET /auth/me -Token $a.Body.accessToken
Check "me returns the caller (via IAuthService)" ($me.Status -eq 200 -and $me.Body.email -eq "a-$run@smoke.local") "status: $($me.Status)"
$userId = $me.Body.id

Check "me without token is 401" ((Call GET /auth/me).Status -eq 401)

Write-Host "`n== Logout ownership" -ForegroundColor Cyan
$foreign = Call POST /auth/logout @{ refreshToken = $b.Body.refreshToken } $a.Body.accessToken
Check "logout with someone else's refresh token still answers 204" ($foreign.Status -eq 204) "status: $($foreign.Status)"
$bRefresh = Call POST /auth/refresh @{ refreshToken = $b.Body.refreshToken }
Check "...and that token was NOT revoked (refresh works)" ($bRefresh.Status -eq 200) "status: $($bRefresh.Status)"

$own = Call POST /auth/logout @{ refreshToken = $a.Body.refreshToken } $a.Body.accessToken
$aRefresh = Call POST /auth/refresh @{ refreshToken = $a.Body.refreshToken }
Check "logout with own token revokes it (refresh is 401)" ($own.Status -eq 204 -and $aRefresh.Status -eq 401) "status: $($own.Status) / $($aRefresh.Status)"

Write-Host "`n== Lookup FKs are Restrict (inside a rolled-back transaction)" -ForegroundColor Cyan
$subjectId = [guid]::NewGuid()
$fkOut = Psql @"
BEGIN;
INSERT INTO "Subjects" ("SubjectId", "UserId", "Name", "ExamDate", "PlanningMethodId", "Priority", "StudyMode", "ColorHex")
VALUES ('$subjectId', '$userId', 'smoke', '2030-01-01', 1, 1, 1, '#000000');
INSERT INTO "Activities" ("SubjectId", "Title", "ActivityTypeId", "Priority", "StartTime", "DurationMinutes", "IsRecurring", "IsNegotiable", "Status")
VALUES ('$subjectId', 'smoke', 1, 1, '2030-01-01 08:00+00', 30, false, false, 1);
SAVEPOINT s;
DELETE FROM "StudyStrategies" WHERE "MethodId" = 1;
ROLLBACK TO SAVEPOINT s;
DELETE FROM "ActivityTypes" WHERE "TypeId" = 1;
ROLLBACK;
"@
$fkErrors = ([regex]::Matches($fkOut, 'violates foreign key constraint')).Count
Check "deleting a used StudyStrategy and ActivityType is refused" ($fkErrors -eq 2) "output: $fkOut"

if ($WithSeed) {
    Write-Host "`n== Demo seed" -ForegroundColor Cyan
    $seedOut = Psql (Get-Content -Raw (Join-Path $PSScriptRoot 'Diploma_DB_seed.sql'))
    Check "seed script runs without errors" ($seedOut -notmatch 'ERROR') "output: $seedOut"
    $alice = Call POST /auth/login @{ email = 'alice.johnson@example.com'; password = 'Demo1234!' }
    Check "demo user can log in" ($alice.Status -eq 200) "status: $($alice.Status)"
}

Write-Host "`n== Rate limiting (5 per minute per IP on login/register)" -ForegroundColor Cyan
$codes = 1..6 | ForEach-Object { (Call POST /auth/login @{ email = "a-$run@smoke.local"; password = 'Smoke-Passw0rd!' }).Status }
Check "login is throttled with 429" ($codes -contains 429) "codes: $($codes -join ' ')"

Psql "DELETE FROM ""Users"" WHERE ""Email"" LIKE '%-$run@smoke.local';" | Out-Null

Write-Host ""
if ($failed) { Write-Host "$failed check(s) failed" -ForegroundColor Red; exit 1 }
Write-Host "All checks passed" -ForegroundColor Green
