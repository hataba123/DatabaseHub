using DBHub.Api.Models.Auth;
using DBHub.Api.Models.Compare;
using DBHub.Api.Models.Sync;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Data;

public class DBHubDbContext : DbContext
{
    public DBHubDbContext(DbContextOptions<DBHubDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    // Phase 6 Sync & Compare
    public DbSet<CompareSession> CompareSessions => Set<CompareSession>();
    public DbSet<SyncPlan> SyncPlans => Set<SyncPlan>();
    public DbSet<SyncOperation> SyncOperations => Set<SyncOperation>();
    public DbSet<SyncExecution> SyncExecutions => Set<SyncExecution>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email);
            entity.Property(u => u.Username).HasMaxLength(100).IsRequired();
            entity.Property(u => u.DisplayName).HasMaxLength(150);
            entity.Property(u => u.Email).HasMaxLength(256);
        });

        // Role
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.Name).IsUnique();
            entity.Property(r => r.Name).HasMaxLength(100).IsRequired();
            entity.Property(r => r.Description).HasMaxLength(500);
        });

        // UserRole (composite key)
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });

            entity.HasOne(ur => ur.User)
                  .WithMany(u => u.UserRoles)
                  .HasForeignKey(ur => ur.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ur => ur.Role)
                  .WithMany(r => r.UserRoles)
                  .HasForeignKey(ur => ur.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // RolePermission
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(rp => rp.Id);
            entity.HasIndex(rp => new { rp.RoleId, rp.Permission, rp.ScopeType });

            entity.Property(rp => rp.Permission).HasMaxLength(100).IsRequired();
            entity.Property(rp => rp.ConnectionId).HasMaxLength(100);
            entity.Property(rp => rp.DatabaseName).HasMaxLength(128);
            entity.Property(rp => rp.SchemaName).HasMaxLength(128);
            entity.Property(rp => rp.TableName).HasMaxLength(128);

            entity.HasOne(rp => rp.Role)
                  .WithMany(r => r.RolePermissions)
                  .HasForeignKey(rp => rp.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // RefreshToken
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(rt => rt.Id);
            entity.HasIndex(rt => rt.TokenHash);
            entity.HasIndex(rt => rt.UserId);

            entity.Property(rt => rt.TokenHash).HasMaxLength(256).IsRequired();

            entity.HasOne(rt => rt.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(rt => rt.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // AuditEvent
        modelBuilder.Entity<AuditEvent>(entity =>
        {
            entity.HasKey(ae => ae.Id);
            entity.HasIndex(ae => ae.Timestamp);
            entity.HasIndex(ae => ae.UserId);
            entity.Property(ae => ae.Action).HasMaxLength(100).IsRequired();
            entity.Property(ae => ae.Username).HasMaxLength(100);
            entity.Property(ae => ae.TargetType).HasMaxLength(100);
        });

        // CompareSession
        modelBuilder.Entity<CompareSession>(entity =>
        {
            entity.HasKey(cs => cs.Id);
            entity.HasIndex(cs => cs.CreatedAt);
            entity.HasIndex(cs => cs.Status);
            entity.Property(cs => cs.SourceConnectionId).HasMaxLength(100).IsRequired();
            entity.Property(cs => cs.SourceDatabase).HasMaxLength(128).IsRequired();
            entity.Property(cs => cs.TargetConnectionId).HasMaxLength(100).IsRequired();
            entity.Property(cs => cs.TargetDatabase).HasMaxLength(128).IsRequired();
            entity.Property(cs => cs.Status).HasMaxLength(50).IsRequired();
        });

        // SyncPlan
        modelBuilder.Entity<SyncPlan>(entity =>
        {
            entity.HasKey(sp => sp.Id);
            entity.HasIndex(sp => sp.Status);
            entity.HasIndex(sp => sp.CreatedAt);
            entity.HasIndex(sp => sp.TargetConnectionId);
            entity.HasIndex(sp => sp.CompareSessionId);

            entity.Property(sp => sp.SourceConnectionId).HasMaxLength(100).IsRequired();
            entity.Property(sp => sp.SourceDatabase).HasMaxLength(128).IsRequired();
            entity.Property(sp => sp.TargetConnectionId).HasMaxLength(100).IsRequired();
            entity.Property(sp => sp.TargetDatabase).HasMaxLength(128).IsRequired();
            entity.Property(sp => sp.Direction).HasMaxLength(50).IsRequired();
            entity.Property(sp => sp.Status).HasMaxLength(50).IsRequired();
            entity.Property(sp => sp.Environment).HasMaxLength(50).IsRequired();

            entity.HasMany(sp => sp.Operations)
                  .WithOne(op => op.SyncPlan)
                  .HasForeignKey(op => op.SyncPlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // SyncOperation
        modelBuilder.Entity<SyncOperation>(entity =>
        {
            entity.HasKey(op => op.Id);
            entity.HasIndex(op => new { op.SyncPlanId, op.Status });
            entity.HasIndex(op => new { op.SyncPlanId, op.TableName });
            entity.HasIndex(op => new { op.SyncPlanId, op.Order });

            entity.Property(op => op.SchemaName).HasMaxLength(128).IsRequired();
            entity.Property(op => op.TableName).HasMaxLength(128).IsRequired();
            entity.Property(op => op.OperationType).HasMaxLength(50).IsRequired();
            entity.Property(op => op.Status).HasMaxLength(50).IsRequired();
        });

        // SyncExecution
        modelBuilder.Entity<SyncExecution>(entity =>
        {
            entity.HasKey(se => se.Id);
            entity.HasIndex(se => se.SyncPlanId);
            entity.HasIndex(se => se.StartedAt);
            entity.HasIndex(se => se.Status);

            entity.Property(se => se.Status).HasMaxLength(50).IsRequired();
            entity.Property(se => se.StartedByUserId).HasMaxLength(100);
            entity.Property(se => se.StartedByUsername).HasMaxLength(100);

            entity.HasOne(se => se.SyncPlan)
                  .WithMany()
                  .HasForeignKey(se => se.SyncPlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
