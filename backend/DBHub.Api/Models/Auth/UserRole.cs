namespace DBHub.Api.Models.Auth;

public class UserRole
{
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    public string RoleId { get; set; } = string.Empty;
    public Role Role { get; set; } = null!;
}
