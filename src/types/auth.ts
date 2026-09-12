export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  roles: string[];
  isActive: boolean;
}

export interface EffectivePermissionDto {
  permission: string;
  scopeType: string;
  connectionId?: string;
  databaseName?: string;
  schemaName?: string;
  tableName?: string;
  sourceRoles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  user: AuthUser;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  user: AuthUser;
}

export interface CurrentUserResponse {
  user: AuthUser;
  roles: string[];
  permissions: EffectivePermissionDto[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const PERMISSIONS = {
  ALL: '*',
  CONNECTION_VIEW: 'Connection.View',
  CONNECTION_MANAGE: 'Connection.Manage',
  DATABASE_READ: 'Database.Read',
  DATABASE_INSERT: 'Database.Insert',
  DATABASE_UPDATE: 'Database.Update',
  DATABASE_DELETE: 'Database.Delete',
  DATABASE_EXPORT: 'Database.Export',
  DATABASE_IMPORT: 'Database.Import',
  USER_VIEW: 'User.View',
  USER_MANAGE: 'User.Manage',
  ROLE_VIEW: 'Role.View',
  ROLE_MANAGE: 'Role.Manage',
  AUDIT_VIEW: 'Audit.View',
  MONITORING_VIEW: 'Monitoring.View',
} as const;
