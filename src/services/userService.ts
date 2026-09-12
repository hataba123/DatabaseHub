import { RoleDefinition, UserItem } from '@/types/user';
import { mockRoles, mockUsers } from '@/mocks/users.mock';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class UserService {
  private users: UserItem[] = [...mockUsers];
  private roles: RoleDefinition[] = [...mockRoles];

  async getUsers(): Promise<UserItem[]> {
    await delay(200);
    return [...this.users];
  }

  async getRoles(): Promise<RoleDefinition[]> {
    await delay(150);
    return [...this.roles];
  }

  async saveUser(user: Partial<UserItem>): Promise<UserItem> {
    await delay(300);
    const id = user.id || `usr-${Date.now()}`;
    const newUser: UserItem = {
      id,
      username: user.username || 'new_user',
      fullName: user.fullName || 'Người dùng mới',
      email: user.email || 'user@dbhub.enterprise',
      role: user.role || 'Data Viewer',
      status: user.status || 'Active',
      lastLogin: 'Never',
      department: user.department || 'Ban Kỹ Thuật',
      permissions: user.permissions || [],
    };

    const idx = this.users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ...newUser };
    } else {
      this.users.unshift(newUser);
    }
    return newUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    await delay(250);
    this.users = this.users.filter((u) => u.id !== id);
    return true;
  }

  async updateRolePermissions(
    roleId: string,
    permissions: any[]
  ): Promise<boolean> {
    await delay(300);
    const role = this.roles.find((r) => r.id === roleId);
    if (role) {
      role.defaultPermissions = permissions;
      return true;
    }
    return false;
  }
}

export const userService = new UserService();
