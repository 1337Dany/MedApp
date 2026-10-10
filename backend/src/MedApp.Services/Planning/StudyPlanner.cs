using MedApp.Models.Models.Enums;

namespace MedApp.Services.Planning;

// Places study sessions into free time. Pure: same input, same output. Rules: docs/PLANNING.md.
public static class StudyPlanner
{
    private const int MaxTitleLength = 100;

    public static PlanningResult Plan(PlanningInput input)
    {
        var today = DateOnly.FromDateTime(input.Now);
        var days = Math.Clamp(input.Days, 1, PlanningRules.MaxHorizonDays);

        var subjects = input.Subjects
            .Where(s => s.Strategy != PlanningStrategy.Manual)
            .ToList();

        var topics = input.Topics
            .GroupBy(t => t.SubjectId)
            .ToDictionary(g => g.Key, g => g.OrderBy(t => t.Order).Select(t => new TopicState(t)).ToList());

        var busy = input.Busy.ToList();
        var sessions = new List<PlannedSession>();
        var unmet = new List<UnmetDemand>();

        for (var offset = 0; offset < days; offset++)
        {
            var day = today.AddDays(offset);
            var date = day.ToDateTime(TimeOnly.MinValue);

            // Today is best effort once the window has started: a short evening is not a shortage.
            var windowStart = date + PlanningRules.StudyWindowStart;
            var reportShortage = true;
            if (offset == 0)
            {
                var now = RoundUp(input.Now);
                if (now > windowStart)
                {
                    windowStart = now;
                    reportShortage = false;
                }
            }
            var windowEnd = date + PlanningRules.StudyWindowEnd;

            var studyMinutes = busy.Where(b => b.IsStudy).Sum(b => MinutesWithin(b, date, date.AddDays(1)));

            var eligible = subjects
                .Where(s => s.ExamDate is null || day < s.ExamDate)
                .OrderByDescending(s => s.Mode)
                .ThenBy(s => s.ExamDate ?? DateOnly.MaxValue)
                .ThenByDescending(s => s.Priority)
                .ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var wanted = eligible.ToDictionary(s => s.Id, s => PlanningRules.SessionsPerDay(s.Mode));
            var missing = eligible.ToDictionary(s => s.Id, _ => 0);
            var plannedToday = new HashSet<Guid>();

            // Round robin: every subject gets its n-th session before any gets its (n+1)-th.
            for (var round = 1; round <= wanted.Values.DefaultIfEmpty(0).Max(); round++)
            {
                foreach (var subject in eligible.Where(s => wanted[s.Id] >= round))
                {
                    var subjectTopics = topics.GetValueOrDefault(subject.Id) ?? new List<TopicState>();
                    var topic = subject.Strategy == PlanningStrategy.ActiveRecall
                        ? PickDueTopic(subjectTopics, day, plannedToday)
                        : PickTrafficLightTopic(subjectTopics, day, plannedToday);

                    if (subject.Strategy == PlanningStrategy.ActiveRecall && topic is null)
                    {
                        // Nothing due: no review today, and that is not a shortage.
                        wanted[subject.Id] = round - 1;
                        continue;
                    }

                    var length = PlanningRules.SessionMinutes(subject.Strategy);
                    var start = studyMinutes + length <= PlanningRules.MaxStudyMinutesPerDay
                        ? FindSlot(windowStart, windowEnd, length, busy)
                        : null;

                    if (start is null)
                    {
                        missing[subject.Id]++;
                        continue;
                    }

                    var session = new PlannedSession(
                        subject.Id,
                        topic?.Topic.Id,
                        Title(subject, topic),
                        start.Value,
                        length,
                        PlanningRules.SessionPriority(subject.Mode));

                    sessions.Add(session);
                    busy.Add(new BusyBlock(session.Start, session.End, session.Title,
                        PlanningRules.StudyingActivityTypeId, true));
                    studyMinutes += length;

                    if (topic is not null)
                    {
                        plannedToday.Add(topic.Topic.Id);
                        topic.MarkPlanned(day, subject.Strategy);
                    }
                }
            }

            if (reportShortage)
            {
                unmet.AddRange(missing.Where(m => m.Value > 0).Select(m => new UnmetDemand(m.Key, day, m.Value)));
            }
        }

        return new PlanningResult(sessions, unmet);
    }

    // Earliest 15-minute-aligned start in the window that overlaps nothing; study blocks keep a break around them.
    private static DateTime? FindSlot(DateTime windowStart, DateTime windowEnd, int minutes, List<BusyBlock> busy)
    {
        var start = RoundUp(windowStart);
        var breakMinutes = TimeSpan.FromMinutes(PlanningRules.BreakBetweenSessionsMinutes);

        while (start.AddMinutes(minutes) <= windowEnd)
        {
            var end = start.AddMinutes(minutes);
            var conflict = busy
                .Select(b => b.IsStudy ? (Start: b.Start - breakMinutes, End: b.End + breakMinutes) : (b.Start, b.End))
                .Where(b => b.Start < end && b.End > start)
                .Select(b => (DateTime?)b.End)
                .Max();

            if (conflict is null)
            {
                return start;
            }

            start = RoundUp(conflict.Value);
        }

        return null;
    }

    private static TopicState? PickTrafficLightTopic(List<TopicState> topics, DateOnly day, HashSet<Guid> plannedToday)
    {
        var candidates = topics.Where(t => !plannedToday.Contains(t.Topic.Id)).ToList();
        if (candidates.Count == 0)
        {
            candidates = topics;
        }

        return candidates
            .OrderByDescending(t => PlanningRules.FeedbackWeight(t.Topic.Feedback) * (1 + t.DaysSinceTouched(day)))
            .ThenBy(t => t.Topic.Order)
            .FirstOrDefault();
    }

    private static TopicState? PickDueTopic(List<TopicState> topics, DateOnly day, HashSet<Guid> plannedToday) =>
        topics
            .Where(t => !plannedToday.Contains(t.Topic.Id) && (t.NextReview is null || t.NextReview <= day))
            .OrderBy(t => t.NextReview is null)
            .ThenBy(t => t.NextReview)
            .ThenBy(t => t.Topic.Order)
            .FirstOrDefault();

    private static string Title(PlannerSubject subject, TopicState? topic)
    {
        var verb = subject.Strategy == PlanningStrategy.ActiveRecall ? "Review" : "Study";
        var title = topic is null ? $"{verb} {subject.Name}" : $"{verb} {subject.Name}: {topic.Topic.Title}";
        return title.Length <= MaxTitleLength ? title : title[..(MaxTitleLength - 1)] + "…";
    }

    private static int MinutesWithin(BusyBlock block, DateTime from, DateTime to)
    {
        var start = block.Start > from ? block.Start : from;
        var end = block.End < to ? block.End : to;
        return end > start ? (int)(end - start).TotalMinutes : 0;
    }

    private static DateTime RoundUp(DateTime value)
    {
        var slot = TimeSpan.FromMinutes(PlanningRules.SlotMinutes).Ticks;
        var ticks = (value.Ticks + slot - 1) / slot * slot;
        return new DateTime(ticks, value.Kind);
    }

    // Per-run view of a topic: planning a session updates it as if the session happened.
    private sealed class TopicState
    {
        public TopicState(PlannerTopic topic)
        {
            Topic = topic;
            LastTouched = topic.LastStudied is null ? null : DateOnly.FromDateTime(topic.LastStudied.Value);
            NextReview = topic.NextReview is null ? null : DateOnly.FromDateTime(topic.NextReview.Value);
            Stage = topic.ReviewStage;
        }

        public PlannerTopic Topic { get; }
        public DateOnly? LastTouched { get; private set; }
        public DateOnly? NextReview { get; private set; }
        public int Stage { get; private set; }

        public int DaysSinceTouched(DateOnly day) => LastTouched is null
            ? PlanningRules.MaxRecencyDays
            : Math.Clamp(day.DayNumber - LastTouched.Value.DayNumber, 0, PlanningRules.MaxRecencyDays);

        public void MarkPlanned(DateOnly day, PlanningStrategy strategy)
        {
            LastTouched = day;
            if (strategy == PlanningStrategy.ActiveRecall)
            {
                // Assume the review succeeds.
                Stage = SpacedRepetition.NextStage(Stage, Feedback.Green);
                NextReview = day.AddDays(SpacedRepetition.IntervalDays(Stage));
            }
        }
    }
}
