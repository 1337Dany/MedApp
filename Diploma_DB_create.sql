CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE feedback_enum AS ENUM (
    'Unknown',
    'Easy',
    'Medium',
    'Hard',
    'NeedsRevision'
);

CREATE TYPE study_mode_enum AS ENUM (
    'Reading',
    'Practice',
    'Flashcards',
    'Lecture',
    'Mixed'
);

CREATE TYPE status_enum AS ENUM (
    'Planned',
    'InProgress',
    'Completed',
    'Cancelled',
    'Skipped'
);

CREATE TYPE frequency_enum AS ENUM (
    'Once',
    'Daily',
    'Weekly',
    'Monthly',
    'Custom'
);

CREATE TYPE day_of_week_enum AS ENUM (
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
);

CREATE TABLE Users (
    Id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    FirstName text NOT NULL,
    LastName text NOT NULL,
    DateOfBirth date NOT NULL,
    Email text NOT NULL UNIQUE,
    HashedPassword text NOT NULL,
    DataPermission boolean NOT NULL
);

CREATE TABLE StudyStrategy (
    MethodId int NOT NULL PRIMARY KEY,
    MethodName text NOT NULL
);

CREATE TABLE Subject (
    SubjectId uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    UserId uuid NOT NULL,
    Name text NOT NULL,
    ExamDate date NOT NULL,
    PlanningMethodId int NOT NULL,
    Priority int NOT NULL,
    StudyMode study_mode_enum NOT NULL,
    ColorHex varchar(7) NOT NULL,

    CONSTRAINT Subject_User
        FOREIGN KEY (UserId) REFERENCES Users(Id),

    CONSTRAINT Subject_PlanningMethod
        FOREIGN KEY (PlanningMethodId) REFERENCES StudyStrategy(MethodId)
);

CREATE TABLE Topic (
    TopicId uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    TopicTitle text NOT NULL,
    Notes text NULL,
    SubjectId uuid NOT NULL,
    Feedback feedback_enum NOT NULL,

    CONSTRAINT Topic_Subject
        FOREIGN KEY (SubjectId) REFERENCES Subject(SubjectId)
);

CREATE TABLE ActivityType (
    TypeId int NOT NULL PRIMARY KEY,
    TypeName text NOT NULL
);

CREATE TABLE RecurringOptions (
    RecurringOptionsId uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    Frequency frequency_enum NOT NULL
);

CREATE TABLE OptionsDayOfWeek (
    RecurringOptionsId uuid NOT NULL,
    DayOfWeek day_of_week_enum NOT NULL,

    PRIMARY KEY (RecurringOptionsId, DayOfWeek),

    CONSTRAINT OptionsDayOfWeek_RecurringOptions
        FOREIGN KEY (RecurringOptionsId)
        REFERENCES RecurringOptions(RecurringOptionsId)
);

CREATE TABLE Activity (
    ActivityId uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    SubjectId uuid NOT NULL,
    Title text NOT NULL,
    ActivityTypeId int NOT NULL,
    Priority int NOT NULL,
    StartTime timestamp NOT NULL,
    DurationMinutes int NOT NULL,
    IsRecurring boolean NOT NULL,
    RecurringOptionsId uuid NULL,
    IsNegotiable boolean NOT NULL,
    Notes text NULL,
    Status status_enum NOT NULL,

    CONSTRAINT Activity_Subject
        FOREIGN KEY (SubjectId) REFERENCES Subject(SubjectId),

    CONSTRAINT Activity_ActivityType
        FOREIGN KEY (ActivityTypeId) REFERENCES ActivityType(TypeId),

    CONSTRAINT Activity_RecurringOptions
        FOREIGN KEY (RecurringOptionsId)
        REFERENCES RecurringOptions(RecurringOptionsId)
);