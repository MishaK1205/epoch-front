import { Role } from '../common.models';

export interface User {
  id: string;
  /** Always lowercase. */
  username: string;
  /** Always lowercase. */
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/** GET /users */
export interface ListUsersQuery {
  page?: number;
  limit?: number;
  role?: Role;
}

/** PATCH /users/:id/role */
export interface UpdateRoleRequest {
  /** 'user' revokes moderator/admin rights. */
  role: Role;
}
