-- Demo data for local development.
--
-- The schema and lookup rows (StudyStrategies, ActivityTypes) come from EF migrations,
-- which the API applies on start. Run this only after the API has started once:
--   docker compose exec -T postgresql psql -U <POSTGRES_USER> -d <POSTGRES_DATABASE> < infra/scripts/Diploma_DB_seed.sql
--
-- Both demo users log in with the password: Demo1234!
-- Fixed ids + ON CONFLICT DO NOTHING make re-runs harmless.
-- Enums are stored as integers; values from MedApp.Models/Models/Enums.

BEGIN;

-- Users (Role: 0 = User, 1 = Admin)
INSERT INTO "Users" ("Id", "FirstName", "LastName", "DateOfBirth", "Email", "HashedPassword", "DataPermission", "Role") VALUES
    ('00000000-0000-0000-0000-000000000001', 'Alice', 'Johnson', '1998-04-12', 'alice.johnson@example.com',
     'AQAAAAIAAYagAAAAELY1CgnJgMz41Ajs5Jqrw3jEMmkx2UUHAo/qahVFd1eABzU4l6mYR0SG3QIw/gfheQ==', true, 0),
    ('00000000-0000-0000-0000-000000000002', 'Bob', 'Smith', '2000-07-22', 'bob.smith@example.com',
     'AQAAAAIAAYagAAAAELY1CgnJgMz41Ajs5Jqrw3jEMmkx2UUHAo/qahVFd1eABzU4l6mYR0SG3QIw/gfheQ==', false, 0)
ON CONFLICT DO NOTHING;

-- Subjects (PlanningMethodId: 1 Traffic Light, 2 Active Recall, 3 Manual; StudyMode: 1 Relaxed, 2 Determined, 3 Emergency)
INSERT INTO "Subjects" ("SubjectId", "UserId", "Name", "ExamDate", "PlanningMethodId", "Priority", "StudyMode", "ColorHex") VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Anatomy', '2027-01-20', 1, 1, 2, '#FF5733'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Biochemistry', '2027-02-05', 2, 2, 1, '#33FF57'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000002', 'Physiology', '2027-01-10', 3, 1, 3, '#3357FF')
ON CONFLICT DO NOTHING;

-- Topics (Feedback: 1 Red, 2 Yellow, 3 Green)
INSERT INTO "Topics" ("TopicId", "SubjectId", "TopicTitle", "Notes", "Feedback") VALUES
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001', 'Upper limb', 'Brachial plexus', 3),
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000002', 'Krebs cycle', 'Enzymes and regulation', 2),
    ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000003', 'Cardiac cycle', 'Pressure-volume loop', 1)
ON CONFLICT DO NOTHING;

-- RecurringOptions (Frequency: 1 Daily, 2 Weekly)
INSERT INTO "RecurringOptions" ("RecurringOptionsId", "Frequency") VALUES
    ('00000000-0000-0000-0003-000000000001', 1),
    ('00000000-0000-0000-0003-000000000002', 2)
ON CONFLICT DO NOTHING;

-- OptionsDayOfWeek (DayOfWeek: 1 Monday .. 7 Sunday)
INSERT INTO "OptionsDayOfWeek" ("RecurringOptionsId", "DayOfWeek") VALUES
    ('00000000-0000-0000-0003-000000000002', 1),
    ('00000000-0000-0000-0003-000000000002', 3),
    ('00000000-0000-0000-0003-000000000002', 5)
ON CONFLICT DO NOTHING;

-- Activities (ActivityTypeId: 1 Studying, 2 Class, ...; Status: 1 Scheduled, 2 PartiallyDone, 3 Done, 4 Skipped)
INSERT INTO "Activities" ("ActivityId", "SubjectId", "Title", "ActivityTypeId", "Priority", "StartTime", "DurationMinutes",
                          "IsRecurring", "RecurringOptionsId", "IsNegotiable", "Notes", "Status") VALUES
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001', 'Anatomy flashcards', 1, 1,
     '2026-11-02 08:00+00', 60, true, '00000000-0000-0000-0003-000000000001', false, 'Upper limb nerves', 1),
    ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0001-000000000002', 'Biochemistry lecture', 2, 2,
     '2026-11-02 14:00+00', 90, true, '00000000-0000-0000-0003-000000000002', false, NULL, 1),
    ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0001-000000000003', 'Physiology reading', 1, 1,
     '2026-11-03 16:00+00', 45, false, NULL, true, 'Chapter 9', 2)
ON CONFLICT DO NOTHING;

COMMIT;
