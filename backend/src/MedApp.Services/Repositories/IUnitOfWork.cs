namespace MedApp.Services.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);

    // A database transaction; disposing it without CommitAsync rolls it back.
    Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default);
}

public interface IUnitOfWorkTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct = default);
}
