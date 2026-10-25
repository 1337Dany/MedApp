# History and student analytics

How MedApp keeps what happened in the timetable over the long term, and how the student's Analytics view
reads it. The history lives in `backend/src/MedApp.Services/Services/ActivityHistoryService.cs` (expansion in
`History/OccurrenceExpander.cs`), the charts' arithmetic in `frontend/src/utils/analytics.ts`.

## Occurrences

An activity is either one-off or a recurring series (daily, or weekly on chosen days, optionally until a date).
A series repeats at the local time of day of its start, in the student's time zone (the IANA zone the browser
sends; it is stored on the user whenever the app loads its warnings or occurrences), so a daily 09:00 lecture
stays at 09:00 across daylight-saving changes.

`GET /api/occurrences?from=&to=&timeZone=` returns every occurrence that starts in `[from, to)` (at most 400
days), with its own title, type, subject, duration and status:

- **Before now**: from the history table (`ActivityOccurrences`).
- **From now on**: from the current timetable, with the marks of single occurrences (see below).

## Recording the history

Every occurrence that has started is copied into the history with the values the activity had at that time.
This happens before any change to the timetable (edit, status change, deletion of an activity or subject) and
whenever occurrences are read, so a change only ever affects the time after it. Parallel requests of the same
user are serialized with a transaction-scoped Postgres advisory lock, so each occurrence is recorded once.

What a change does to the history:

| Change | History |
|---|---|
| Edit a series (time, days, duration, title, type, subject) | Past occurrences keep their old values; the change applies from now on. Changing *when* it occurs (start, frequency, days, end date) drops the marks of its future occurrences. |
| Turn a series into a one-off activity | The past occurrences stay as history without an activity. |
| Edit a one-off activity, or change its status | Its history entry is replaced by the new values (it is a correction of that one event). |
| Delete a series | Its past occurrences stay, without an activity. |
| Delete a one-off activity | Removed from the history. |
| Delete a subject | Its activities go; what already happened stays, without the subject. |

Known limit: moving the start of a running series to an earlier date does not add occurrences to the days that
had already passed.

## Status per occurrence

A one-off activity has one status. A series is marked per occurrence: `PATCH /api/activities/{id}/status`
with `occurrenceStart` (the occurrence's UTC start) sets the status of that occurrence only, past or future,
and is rejected when the series has no occurrence at that time. The series' own status stays as it is; an
unmarked occurrence of a series counts as "scheduled", unless the whole series is "skipped". Marking a study
occurrence on a topic as done counts as a review of the topic, like a one-off session (docs/PLANNING.md).

In the UI, clicking an occurrence in the Calendar opens the series with "This occurrence" buttons; the Calendar
shows the marks on the blocks.

## Analytics view

The view shows a week (Sunday to Saturday, like the Calendar) or a month, and can go back and forth without
limit. All numbers come from the occurrences above, so past periods stay as they were and coming days follow the
current schedule as soon as it changes.

- **Study planned**: hours of study sessions in the period. **Studied**: hours credited by status - done counts
  fully, partially done half (the same credit as the teacher analytics).
- **Completion rate**: credited share of the study sessions in the period that have already started.
- **Time by activity type**: hours per day, stacked by type; an occurrence over midnight counts on both days.
  The nine types are folded into six groups (studying, classes, sleep, rest & sport, work, meals/commute/other)
  to stay within a color-blind-safe palette; a table beside the chart gives the totals and shares.
- **Study trend**: planned and studied hours for the last 8 weeks or 6 months.
- **Study & classes by subject**: planned and studied hours per subject in the period.
- **How past activities were marked**: done / partially done / skipped / not marked, for everything that has
  started in the period.
- **Knowledge distribution**: the current topic ratings (topics have no history).
- **Insights**: low completion (< 70%), many red topics (> 30%), long sessions (average > 120 min), little sleep
  scheduled (< 7 h per day), no study planned, nothing marked yet.
