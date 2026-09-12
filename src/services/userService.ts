import { RoleDefinition, UserItem, SystemRole } from '@/types/user';
import { mockRoles, mockUsers } from '@/mocks/users.mock';
import { apiClient } from './api/apiClient';
import { EffectivePermissionDto } from '@/types/auth';

interface ApiUserResponse {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  roles: string[];
}

interface ApiRoleResponse {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  userCount: number;
}

class UserService {
  private mockUserList: UserItem[] = [...mockUsers];
  private mockRoleList: RoleDefinition[] = [...mockRoles];

  async getUsers(): Promise<UserItem[]> {
    try {
      const apiUsers = await apiClient.get<ApiUserResponse[]>('/users');
      return apiUsers.map((u: ApiUserResponse) => ({
        id: u.id,
        username: u.username,
        fullName: u.displayName || u.username,
        email: u.email || `${u.username}@dbhub.enterprise`,
        role: (u.roles[0] as SystemRole) || 'Data Viewer',
        status: u.isActive ? 'Active' : 'Inactive',
        lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never',
        department: 'Ban Kỹ Thuật',
        permissions: [],
      }));
    } catch {
      return [...this.mockUserList];
    }
  }

  async getUserPermissions(userId: string): Promise<EffectivePermissionDto[]> {
    try {
      return await apiClient.get<EffectivePermissionDto[]>(`/users/${userId}/permissions`);
    } catch {
      return [];
    }
  }

  async getRoles(): Promise<RoleDefinition[]> {
    try {
      const apiRoles = await apiClient.get<ApiRoleResponse[]>('/roles');
      return apiRoles.map((r: ApiRoleResponse) => ({
        id: r.id,
        name: r.name as SystemRole,
        description: r.description,
        userCount: r.userCount,
        isSystem: r.isSystemRole,
        defaultPermissions: [],
      }));
    } catch {
      return [...this.mockRoleList];
    }
  }

  async saveUser(user: Partial<UserItem> & { password?: string }): Promise<UserItem> {
    try {
      if (user.id) {
        await apiClient.put(`/users/${user.id}`, {
          displayName: user.fullName,
          email: user.email,
        });
      } else {
        await apiClient.post('/users', {
          username: user.username,
          displayName: user.fullName || user.username,
          email: user.email,
          password: user.password || 'Password123!',
          roleIds: [],
        });
      }
      return this.getUsers().then((users) => users.find((u) => u.username === user.username) || {
        id: user.id || `usr-${Date.now()}`,
        username: user.username || 'new_user',
        fullName: user.fullName || 'User',
        email: user.email || '',
        role: user.role || 'Data Viewer',
        status: 'Active',
        lastLogin: 'Just now',
        permissions: [],
      });
    } catch {
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

      const idx = this.mockUserList.findIndex((u) => u.id === id);
      if (idx >= 0) {
        this.mockUserList[idx] = { ...this.mockUserList[idx], ...newUser };
      } else {
        this.mockUserList.unshift(newUser);
      }
      return newUser;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/users/${id}`);
      return true;
    } catch {
      this.mockUserList = this.mockUserList.filter((u) => u.id !== id);
      return true;
    }
  }

  async updateRolePermissions(
    roleId: string,
    permissions: any[]
  ): Promise<boolean> {
    try {
      await apiClient.put(`/roles/${roleId}/permissions`, { permissions });
      return true;
    } catch {
      const role = this.mockRoleList.find((r) => r.id === roleId);
      if (role) {
        role.defaultPermissions = permissions;
        return true;
      }
      return false;
    }
  }
}

export const userService = new UserService();
