using MedApp.DAL.Context;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore.Storage;

namespace MedApp.DAL.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly MedAppDbContext _db;

    public UnitOfWork(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        _db.SaveChangesAsync(ct);

    public async Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default) =>
        _db.Database.CurrentTransaction is not null
            ? new JoinedTransaction()
            : new Transaction(await _db.Database.BeginTransactionAsync(ct));

    private sealed class Transaction : IUnitOfWorkTransaction
    {
        private readonly IDbContextTransaction _transaction;

        public Transaction(IDbContextTransaction transaction)
        {
            _transaction = transaction;
        }

        public Task CommitAsync(CancellationToken ct = default) => _transaction.CommitAsync(ct);

        public ValueTask DisposeAsync() => _transaction.DisposeAsync();
    }

    private sealed class JoinedTransaction : IUnitOfWorkTransaction
    {
        public Task CommitAsync(CancellationToken ct = default) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
