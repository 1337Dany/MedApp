using MedApp.DAL.Context;
using MedApp.Services.Repositories;

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
}
