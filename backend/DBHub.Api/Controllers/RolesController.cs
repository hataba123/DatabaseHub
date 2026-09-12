using System.Security.Claims;
using DBHub.Api.Data;
using DBHub.Api.DTOs;
using DBHub.Api.DTOs.Auth;
using DBHub.Api.Models.Auth;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly DBHubDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IAuditService _auditService;
    private readonly ILogger<RolesController> _logger;

    public RolesController(
        DBHubDbContext context,
        IPermissionService permissionService,
        IAuditService auditService,
        ILogger<RolesController> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _auditService = auditService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoleResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.RoleView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view roles." });
        }

        var roles = await _context.Roles
            .Include(r => r.UserRoles)
            .OrderBy(r => r.Name)
            .ToListAsync(cancellationToken);

        var response = roles.Select(r => new RoleResponse
        {
            Id = r.Id,
            Name = r.Name,
            Description = r.Description,
            IsSystemRole = r.IsSystemRole,
            UserCount = r.UserRoles.Count,
            CreatedAt = r.CreatedAt
        }).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RoleResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.RoleView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view roles." });
        }

        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Role with id '{id}' was not found." });
        }

        return Ok(new RoleResponse
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            UserCount = role.UserRoles.Count,
            CreatedAt = role.CreatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<RoleResponse>> Create([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.RoleManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to create roles." });
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new ErrorResponse { Code = "VALIDATION_FAILED", Message = "Role name is required." });
        }

        var name = request.Name.Trim();
        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == name.ToLower(), cancellationToken);
        if (exists)
        {
            return BadRequest(new ErrorResponse { Code = "ROLE_EXISTS", Message = $"Role '{name}' already exists." });
        }

        var role = new Role
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = name,
            Description = request.Description?.Trim() ?? string.Empty,
            IsSystemRole = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync(cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "ROLE_CREATED", "Role", role.Id, ip, true, new { role.Name }, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = role.Id }, new RoleResponse
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            UserCount = 0,
            CreatedAt = role.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<RoleResponse>> Update(string id, [FromBody] UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.RoleManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to update roles." });
        }

        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Role with id '{id}' was not found." });
        }

        role.Description = request.Description?.Trim() ?? string.Empty;
        role.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "ROLE_UPDATED", "Role", role.Id, ip, true, new { role.Name, role.Description }, cancellationToken);

        return Ok(new RoleResponse
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            UserCount = role.UserRoles.Count,
            CreatedAt = role.CreatedAt
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.RoleManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to delete roles." });
        }

        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Role with id '{id}' was not found." });
        }

        if (role.IsSystemRole)
        {
            return BadRequest(new ErrorResponse { Code = "CANNOT_DELETE_SYSTEM_ROLE", Message = "System default roles cannot be deleted." });
        }

        if (role.UserRoles.Count > 0)
        {
            return BadRequest(new ErrorResponse { Code = "ROLE_IN_USE", Message = $"Role cannot be deleted because {role.UserRoles.Count} user(s) are assigned to it." });
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync(cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "ROLE_DELETED", "Role", role.Id, ip, true, new { role.Name }, cancellationToken);

        return NoContent();
    }

    [HttpGet("{id}/permissions")]
    public async Task<ActionResult<IReadOnlyList<RolePermissionItemDto>>> GetPermissions(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.RoleView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view role permissions." });
        }

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (role == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Role with id '{id}' was not found." });
        }

        var perms = await _context.RolePermissions
            .Where(rp => rp.RoleId == id)
            .ToListAsync(cancellationToken);

        var response = perms.Select(p => new RolePermissionItemDto
        {
            Permission = p.Permission,
            ScopeType = p.ScopeType.ToString(),
            ConnectionId = p.ConnectionId,
            Database = p.DatabaseName,
            Schema = p.SchemaName,
            Table = p.TableName
        }).ToList();

        return Ok(response);
    }

    [HttpPut("{id}/permissions")]
    public async Task<IActionResult> UpdatePermissions(
        string id,
        [FromBody] UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.RoleManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to update role permissions." });
        }

        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Role with id '{id}' was not found." });
        }

        // Capture BEFORE state for audit diff
        var beforeState = role.RolePermissions.Select(p => new
        {
            p.Permission,
            ScopeType = p.ScopeType.ToString(),
            p.ConnectionId,
            p.DatabaseName,
            p.SchemaName,
            p.TableName
        }).ToList();

        // Clear existing permissions
        _context.RolePermissions.RemoveRange(role.RolePermissions);

        // Add new permissions
        var newPerms = new List<RolePermission>();
        if (request.Permissions != null && request.Permissions.Count > 0)
        {
            foreach (var item in request.Permissions)
            {
                if (string.IsNullOrWhiteSpace(item.Permission) || !PermissionDefinitions.IsValidPermission(item.Permission))
                {
                    continue;
                }

                Enum.TryParse<PermissionScopeType>(item.ScopeType, true, out var scope);

                newPerms.Add(new RolePermission
                {
                    RoleId = role.Id,
                    Permission = item.Permission,
                    ScopeType = scope,
                    ConnectionId = item.ConnectionId,
                    DatabaseName = item.Database,
                    SchemaName = item.Schema,
                    TableName = item.Table
                });
            }

            _context.RolePermissions.AddRange(newPerms);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Capture AFTER state for audit diff
        var afterState = newPerms.Select(p => new
        {
            p.Permission,
            ScopeType = p.ScopeType.ToString(),
            p.ConnectionId,
            p.DatabaseName,
            p.SchemaName,
            p.TableName
        }).ToList();

        // Invalidate cache for all affected users assigned to this role
        foreach (var ur in role.UserRoles)
        {
            _permissionService.InvalidateUserPermissionsCache(ur.UserId);
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(
            currentUserId,
            User.Identity?.Name ?? "Unknown",
            "ROLE_PERMISSIONS_CHANGED",
            "Role",
            role.Id,
            ip,
            true,
            new { Role = role.Name, Before = beforeState, After = afterState },
            cancellationToken);

        return Ok(new { message = "Role permissions updated successfully." });
    }
}
