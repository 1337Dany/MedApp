# Planning rules

How MedApp turns subjects, topics and the student's timetable into study sessions.
The rules are implemented as pure functions in `backend/src/MedApp.Services/Planning`
(`StudyPlanner`, `SpacedRepetition`, `RecurrenceExpander`, `WorkloadAnalyzer`) and covered by
`backend/tests/MedApp.Services.Tests`. All constants live in `PlanningRules`.

## Inputs

- **Subjects**: study strategy, mode, priority (1–10), optional exam date.
- **Topics**: traffic-light feedback (red / yellow / green), order, last studied, next review, review stage.
- **Timetable**: every activity of the student. Recurring series are expanded into occurrences.
  Everything that is not an auto-planned study session is treated as busy time.
- **Time zone** of the student (IANA id sent by the browser, stored on the user), so "08:00" means
  the student's 08:00.
- **Horizon**: from now until the end of the N-th day (default 7, at most 28).

## What gets planned

1. **Manual** subjects are never planned; the student schedules them.
2. A subject is planned only before its exam: no sessions on or after the exam day.
3. Sessions per day by **mode**: Relaxed 1, Determined 2, Emergency 3.
4. Session length by **strategy**: Traffic Light 60 min (study), Active Recall 30 min (review).
5. Sessions are placed in the **study window** 08:00–22:00, never overlapping busy time, aligned to
   15 minutes, starting no earlier than now. Consecutive study sessions are at least 15 minutes apart.
6. At most **6 hours of study per day**, existing study activities included.
   Today is planned best effort: once today's window has started, sessions that do not fit are not
   reported as a shortage.
7. Per day, subjects take turns (round robin) in order of urgency: mode (Emergency first),
   then nearest exam, then priority, then name. So an urgent subject is placed first, but every
   subject gets its first session before any subject gets its second.

## Which topic a session covers

- **Traffic Light**: each topic scores `weight × (1 + days since it was last studied or planned, max 14)`,
  with weight red 3, yellow 2, green 1. The highest score wins (ties: topic order). A topic just planned
  starts again at 0 days, so red topics come back roughly three times as often as green ones and nothing
  is forgotten. A subject without topics gets general "Study <subject>" sessions.
- **Active Recall** (spaced repetition, Leitner-style): a topic is due when it has never been reviewed or
  its next-review date has arrived. Due topics are reviewed oldest-due first; when nothing is due the
  subject gets no session that day. Within one planning run a planned review is assumed successful, so
  the topic is not planned again before its next interval.

## Spaced repetition

Review intervals by stage: 1, 3, 7, 14, 30 days. A review result moves the stage:
green → next stage (max 4), yellow → same stage, red → back to stage 0.
Next review = review date + interval of the new stage.

A topic is reviewed when the student changes its feedback, or marks a study session linked to the topic
as done (the topic's current feedback is the result). Both also set "last studied".

## Re-planning

- `POST /api/planning/generate` deletes the student's future auto-planned sessions that are still
  `scheduled` and plans the horizon again. Past sessions are kept as history.
- Once a student has a plan (future auto-planned sessions exist), it is re-generated automatically when
  a topic's feedback changes or an activity's status changes.
- Editing the time, duration, subject or topic of an auto-planned session turns it into the student's
  own activity: it is kept on re-planning and counts as busy time.

## Overload warnings

Computed for each day of the horizon (`GET /api/planning/warnings`, also returned by generate):

| Warning | Severity |
|---|---|
| Committed time (everything except sleep, meals and rest) over 10 h / over 8 h | high / medium |
| Not every wanted session of a subject fits | high if the exam is within 7 days, else medium |
| Exam within 3 days but the subject is not in Emergency mode | medium |
| Exam within 7 days and the subject is in Relaxed mode | low |
| Active Recall subject without topics | low |

Each warning carries suggestions (move named negotiable activities, raise the mode, mark known topics
green, add topics).
