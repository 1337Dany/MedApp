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
whenever occurrences are read, so a change only ever affects the time after it. Requests of the same user that
record the history or write to the timetable are serialized with a transaction-scoped Postgres advisory lock. A
write (edit, status change, deletion of an activity or subject, planning) holds that lock and one transaction from
loading the activity to its last save, re-planning included, so each occurrence is recorded once and a parallel read
cannot record an activity that is being changed or deleted. The wait for the lock is limited to 5 seconds (then 503),
and each user can have 20 requests in progress and 200 queued (then 429).

Activity starts, series ends, marked occurrences and occurrence queries must lie between 2000-01-01 and 10 years from
now (`ActivityDates`). History is not recorded from before 2000 for older data.

What a change does to the history:

| Change | History |
|---|---|
| Edit a series (time, days, duration, title, type, subject) | Past occurrences keep their old values; the change applies from now on. Changing *when* it occurs (start, frequency, days, end date) drops the marks of its future occurrences. |
| Turn a series into a one-off activity | The past occurrences stay as history without an activity. The one in the same minute as the one-off's start becomes its own entry, so it does not count twice, and the one-off takes that occurrence's mark (also from a future one) unless the form chose another status. |
| Turn a past one-off activity into a series | Its status stays as the mark of the occurrence at that start; the rest of the series is unmarked. |
| Edit a one-off activity, or change its status | Its history entry is replaced by the new values (it is a correction of that one event). |
| Delete a series | Its past occurrences stay, without an activity. |
| Delete a one-off activity | Removed from the history. |
| Delete a subject | Its activities go; what already happened stays, without the subject. |

Moving a series to a time today that has already passed adds today's occurrence at the new time, unless the series
already has an entry for today (the occurrence at the old time ran): a day counts once.

Known limit: moving the start of a running series to an earlier date does not add occurrences to the earlier days
that had already passed, only to today.

## Status per occurrence

A one-off activity has one status. A series is marked per occurrence: `PATCH /api/activities/{id}/status`
with `occurrenceStart` (the occurrence's UTC start) sets the status of that occurrence only, past or future,
and is rejected when the series has no occurrence at that time. The series' own status stays as it is; an
unmarked occurrence of a series counts as "scheduled", unless the whole series is "skipped". Marking a study
occurrence on a topic as done counts as a review of the topic, like a one-off session (docs/PLANNING.md).

In the UI, clicking an occurrence in the Calendar opens the series with "This occurrence" buttons; the Calendar
shows the marks on the blocks. Blocks that overlap on a day are drawn side by side. The app reads the occurrences
again after every successful write that can change them. When such a read fails, the Calendar and Analytics keep what
they have and show a banner with "Try again"; the Calendar still shows one-off activities as they are now.

## Analytics view

The view shows a day, a week (Sunday to Saturday, like the Calendar) or a month, and can go back and forth without
limit. The period label opens a calendar to pick an exact date, which shows the report of that day. Switching
between kinds keeps the place: the period containing the shown day, or the start of the shown period (today when it
is the current one). All numbers come from the occurrences above, so past periods stay as they were and coming days follow the
current schedule as soon as it changes.

- **Study planned**: hours of study sessions in the period. **Studied**: hours credited by status - done counts
  fully, partially done half (the same credit as the teacher analytics).
- **Completion rate**: credited share of the study sessions in the period that have already started.
- **Time by activity type**: hours per day, stacked by type; an occurrence over midnight counts on both days.
  The nine types are folded into six groups (studying, classes, sleep, rest & sport, work, meals/commute/other)
  to stay within a color-blind-safe palette; a table beside the chart gives the totals and shares.
- **Study trend**: planned and studied hours for the last 14 days, 8 weeks or 6 months.
- **Study & classes by subject**: planned and studied hours per subject in the period.
- **How past activities were marked**: done / partially done / skipped / not marked, for everything that has
  started in the period.
- **Knowledge distribution**: the current topic ratings (topics have no history).
- **Insights**: low completion (< 70%), many red topics (> 30%), long sessions (average > 120 min), little sleep
  scheduled (< 7 h per day; for a single day, the sleep that begins on it, so a night starting late that day is
  counted whole), no study planned, nothing marked yet.
