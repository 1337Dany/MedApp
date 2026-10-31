namespace MedApp.Services.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);

    // A database transaction; disposing it without CommitAsync rolls it back. Inside a running transaction it
    // joins that one: committing or disposing the inner handle does nothing, the outer one decides.
    Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default);
}

public interface IUnitOfWorkTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct = default);
}
