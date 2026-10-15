using MedApp.Models.Models;
using MedApp.Models.Models.Enums;

namespace MedApp.Services.Planning;

// Leitner-style review stages: green moves a topic up, yellow keeps it, red sends it back to the start.
public static class SpacedRepetition
{
    public static int MaxStage => PlanningRules.ReviewIntervalsDays.Length - 1;

    public static int NextStage(int stage, Feedback result) => result switch
    {
        Feedback.Green => Math.Min(Clamp(stage) + 1, MaxStage),
        Feedback.Red => 0,
        _ => Clamp(stage)
    };

    public static int IntervalDays(int stage) => PlanningRules.ReviewIntervalsDays[Clamp(stage)];

    // Records a review of the topic with the given result.
    public static void Review(Topic topic, Feedback result, DateTime reviewedAtUtc)
    {
        topic.ReviewStage = NextStage(topic.ReviewStage, result);
        topic.LastStudied = reviewedAtUtc;
        topic.NextReview = reviewedAtUtc.AddDays(IntervalDays(topic.ReviewStage));
    }

    private static int Clamp(int stage) => Math.Clamp(stage, 0, MaxStage);
}
