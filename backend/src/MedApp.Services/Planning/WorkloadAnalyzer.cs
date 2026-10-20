using MedApp.Models.Models.Enums;

namespace MedApp.Services.Planning;

// Overload warnings for the planning horizon (docs/PLANNING.md, "Overload warnings").
public static class WorkloadAnalyzer
{
    public static IReadOnlyList<PlanningWarning> Analyze(PlanningInput input, PlanningResult plan)
    {
        var today = DateOnly.FromDateTime(input.Now);
        var days = Math.Clamp(input.Days, 1, PlanningRules.MaxHorizonDays);
        var warnings = new List<PlanningWarning>();

        var blocks = input.Busy
            .Concat(plan.Sessions.Select(s => new BusyBlock(s.Start, s.End, s.Title, PlanningRules.StudyingActivityTypeId, true)))
            .ToList();

        for (var offset = 0; offset < days; offset++)
        {
            var day = today.AddDays(offset);
            var from = day.ToDateTime(TimeOnly.MinValue);
            var to = from.AddDays(1);

            var dayBlocks = blocks.Where(b => b.Start < to && b.End > from && !PlanningRules.IsRecovery(b.ActivityTypeId)).ToList();
            var minutes = dayBlocks.Sum(b => (int)((b.End < to ? b.End : to) - (b.Start > from ? b.Start : from)).TotalMinutes);

            if (minutes > PlanningRules.OverloadMediumMinutes)
            {
                var movable = dayBlocks
                    .Where(b => b.IsNegotiable && !b.IsStudy)
                    .Select(b => b.Title)
                    .Distinct()
                    .Take(3)
                    .ToList();

                var suggestions = new List<string>();
                if (movable.Count > 0)
                {
                    suggestions.Add($"Move or shorten: {string.Join(", ", movable)}.");
                }
                suggestions.Add("Spread study sessions over lighter days.");
                suggestions.Add("Keep time for sleep, meals and a short break.");

                warnings.Add(new PlanningWarning(
                    day,
                    minutes > PlanningRules.OverloadHighMinutes ? WarningSeverity.High : WarningSeverity.Medium,
                    $"{day:dddd}: {FormatHours(minutes)} of commitments.",
                    suggestions));
            }
        }

        var subjects = input.Subjects.ToDictionary(s => s.Id);

        foreach (var shortage in plan.Unmet.GroupBy(u => u.SubjectId))
        {
            if (!subjects.TryGetValue(shortage.Key, out var subject))
            {
                continue;
            }

            var first = shortage.Min(u => u.Date);
            var missing = shortage.Sum(u => u.MissingSessions);
            var examSoon = subject.ExamDate is not null &&
                           subject.ExamDate.Value.DayNumber - today.DayNumber <= PlanningRules.ExamSoonDays;

            var suggestions = new List<string>
            {
                $"Free up time from {first:dddd} on, e.g. by moving negotiable activities.",
                "Switch less urgent subjects to Relaxed mode."
            };
            if (subject.Strategy == PlanningStrategy.TrafficLight)
            {
                suggestions.Add("Mark topics you already know as green.");
            }

            warnings.Add(new PlanningWarning(
                first,
                examSoon ? WarningSeverity.High : WarningSeverity.Medium,
                $"{missing} {subject.Name} session{(missing == 1 ? "" : "s")} did not fit into your schedule.",
                suggestions));
        }

        foreach (var subject in input.Subjects.Where(s => s.Strategy != PlanningStrategy.Manual && s.ExamDate is not null))
        {
            var daysLeft = subject.ExamDate!.Value.DayNumber - today.DayNumber;
            if (daysLeft < 0)
            {
                continue;
            }

            if (daysLeft <= PlanningRules.ExamVerySoonDays && subject.Mode != StudyMode.Emergency)
            {
                warnings.Add(new PlanningWarning(today, WarningSeverity.Medium,
                    $"{subject.Name} exam in {DaysText(daysLeft)}, but the subject is in {subject.Mode} mode.",
                    new[] { $"Switch {subject.Name} to Emergency mode to get more sessions." }));
            }
            else if (daysLeft <= PlanningRules.ExamSoonDays && subject.Mode == StudyMode.Relaxed)
            {
                warnings.Add(new PlanningWarning(today, WarningSeverity.Low,
                    $"{subject.Name} exam in {DaysText(daysLeft)} while in Relaxed mode.",
                    new[] { $"Consider Determined mode for {subject.Name}." }));
            }
        }

        var subjectsWithTopics = input.Topics.Select(t => t.SubjectId).ToHashSet();
        foreach (var subject in input.Subjects.Where(s =>
                     s.Strategy == PlanningStrategy.ActiveRecall && !subjectsWithTopics.Contains(s.Id)))
        {
            warnings.Add(new PlanningWarning(today, WarningSeverity.Low,
                $"{subject.Name} uses Active Recall but has no topics, so no reviews can be scheduled.",
                new[] { $"Add topics to {subject.Name}." }));
        }

        return warnings
            .OrderByDescending(w => w.Severity)
            .ThenBy(w => w.Date)
            .ToList();
    }

    private static string FormatHours(int minutes) =>
        minutes % 60 == 0 ? $"{minutes / 60} h" : $"{minutes / 60} h {minutes % 60} min";

    private static string DaysText(int days) => days switch
    {
        0 => "today",
        1 => "1 day",
        _ => $"{days} days"
    };
}
