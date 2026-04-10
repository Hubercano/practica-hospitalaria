import type { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  institutionId: string | null;
  sessionId: string;
  iat?: number;
  exp?: number;
}