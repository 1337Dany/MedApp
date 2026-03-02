-- demo data

-- Study Strategies
INSERT INTO StudyStrategy (MethodId, MethodName) VALUES
    (1, 'Traffic Light'),
    (2, 'Active Recall'),
    (3, 'Manual');

-- Activity Types
INSERT INTO ActivityType (TypeId, TypeName) VALUES
    (1, 'Studying'),
    (2, 'Class'),
    (3, 'Rest'),
    (4, 'Sport'),
    (5, 'Work'),
    (6, 'Meal'),
    (7, 'Sleep'),
    (8, 'Commute'),
    (9, 'One-Time Event');

-- Users
INSERT INTO Users (FirstName, LastName, DateOfBirth, Email, HashedPassword, DataPermission) VALUES
('Alice', 'Johnson', '1998-04-12', 'alice.johnson@example.com', 'hashed_pw_1', true),
('Bob', 'Smith', '2000-07-22', 'bob.smith@example.com', 'hashed_pw_2', true);

-- Subjects
INSERT INTO Subject (UserId, Name, ExamDate, PlanningMethodId, Priority, StudyMode, ColorHex) VALUES
    ((SELECT Id FROM Users WHERE Email='alice.johnson@example.com'), 'Math', '2026-06-10', 1, 1, 'Determined', '#FF5733'),
    ((SELECT Id FROM Users WHERE Email='alice.johnson@example.com'), 'History', '2026-05-15', 2, 2, 'Relaxed', '#33FF57'),
    ((SELECT Id FROM Users WHERE Email='bob.smith@example.com'), 'Physics', '2026-07-01', 3, 1, 'Emergency', '#3357FF');

-- Topic
INSERT INTO Topic (TopicTitle, Notes, SubjectId, Feedback) VALUES
    ('Algebra Basics', 'Focus on linear equations', (SELECT SubjectId FROM Subject WHERE Name='Math'), 'Green'),
    ('World War II', 'Include main battles', (SELECT SubjectId FROM Subject WHERE Name='History'), 'Yellow'),
    ('Newton Laws', 'Important formulas', (SELECT SubjectId FROM Subject WHERE Name='Physics'), 'Red');

-- RecurringOptions
INSERT INTO RecurringOptions (Frequency) VALUES
    ('Daily'),
    ('Weekly');

-- OptionsDayOfWeek
INSERT INTO OptionsDayOfWeek (RecurringOptionsId, DayOfWeek) VALUES
    ((SELECT RecurringOptionsId FROM RecurringOptions WHERE Frequency='Daily'), 'Monday'),
    ((SELECT RecurringOptionsId FROM RecurringOptions WHERE Frequency='Daily'), 'Wednesday'),
    ((SELECT RecurringOptionsId FROM RecurringOptions WHERE Frequency='Weekly'), 'Friday');

-- Activities
INSERT INTO Activity
(SubjectId, Title, ActivityTypeId, Priority, StartTime, DurationMinutes,
 IsRecurring, RecurringOptionsId, IsNegotiable, Notes, Status)
VALUES
    ((SELECT SubjectId FROM Subject WHERE Name='Math'), 'Algebra Practice', 1, 1, '2026-04-01 10:00', 60, true,
     (SELECT RecurringOptionsId FROM RecurringOptions WHERE Frequency='Daily'),
     false, 'Do problems 1-10', 'Scheduled'),

    ((SELECT SubjectId FROM Subject WHERE Name='History'), 'History Reading', 1, 2, '2026-04-02 14:00', 45, false,
     NULL, true, 'Read chapters 3-4', 'Partially Done'),

    ((SELECT SubjectId FROM Subject WHERE Name='Physics'), 'Physics Flashcards', 1, 1, '2026-04-03 16:00', 30, true,
     (SELECT RecurringOptionsId FROM RecurringOptions WHERE Frequency='Weekly'),
     true, 'Focus on formulas', 'Scheduled');