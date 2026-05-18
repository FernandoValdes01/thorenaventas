export type UserRole = 'admin' | 'vendedor' | 'oficina';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  authenticated: boolean;
  user: User | null;
}

export interface BetterAuthSessionPayload {
  session: {
    id: string;
    expiresAt: string;
  };
  user: User;
}
