using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.Planning;

namespace MedApp.Services.Tests;

public class SpacedRepetitionTests
{
    [Theory]
    [InlineData(0, Feedback.Green, 1)]
    [InlineData(3, Feedback.Green, 4)]
    [InlineData(4, Feedback.Green, 4)]
    [InlineData(2, Feedback.Yellow, 2)]
    [InlineData(3, Feedback.Red, 0)]
    public void Stage_moves_with_the_result(int stage, Feedback result, int expected)
    {
        Assert.Equal(expected, SpacedRepetition.NextStage(stage, result));
    }

    [Fact]
    public void Review_sets_last_studied_and_next_review()
    {
        var reviewedAt = new DateTime(2026, 10, 5, 18, 0, 0, DateTimeKind.Utc);
        var topic = new Topic { ReviewStage = 1, TopicTitle = "Krebs cycle" };

        SpacedRepetition.Review(topic, Feedback.Green, reviewedAt);

        Assert.Equal(2, topic.ReviewStage);
        Assert.Equal(reviewedAt, topic.LastStudied);
        Assert.Equal(reviewedAt.AddDays(7), topic.NextReview);

        SpacedRepetition.Review(topic, Feedback.Red, reviewedAt);
        Assert.Equal(reviewedAt.AddDays(1), topic.NextReview);
    }
}
