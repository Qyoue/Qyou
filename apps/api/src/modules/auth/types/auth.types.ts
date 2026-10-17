export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  deactivatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
}
