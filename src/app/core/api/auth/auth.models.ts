import { User } from '../users/users.models';

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Token lifetime in seconds. */
  expiresIn: number;
  user: User;
}

/** POST /auth/register */
export interface RegisterRequest {
  /** 3–30 chars; letters, digits, '_' and '.' only; stored lowercase. */
  username: string;
  /** Valid email, max 254. */
  email: string;
  /** 8–72 chars; at least one letter and one digit. */
  password: string;
}

/** POST /auth/login */
export interface LoginRequest {
  /** Username or email (case-insensitive), max 254. */
  identifier: string;
  /** Max 72. */
  password: string;
}
