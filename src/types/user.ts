export type UserStatus = 'Active' | 'Inactive' | 'Suspended';

export type SystemRole =
  | 'Super Admin'
  | 'Database Admin'
  | 'Data Editor'
  | 'Data Viewer'
  | 'Auditor';

export interface UserPermission {
  databaseId: string;
  read: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  tables?: Record<
    string,
    {
      read: boolean;
      insert: boolean;
      update: boolean;
      delete: boolean;
      export: boolean;
    }
  >;
}

export interface UserItem {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: SystemRole;
  status: UserStatus;
  lastLogin: string;
  avatarUrl?: string;
  department?: string;
  permissions: UserPermission[];
}

export interface RoleDefinition {
  id: string;
  name: SystemRole;
  description: string;
  userCount: number;
  isSystem: boolean;
  defaultPermissions: UserPermission[];
}
