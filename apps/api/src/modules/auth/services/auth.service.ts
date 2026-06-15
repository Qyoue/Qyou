import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthResponse, LoginInput, RegisterInput } from '@qyou/shared';
import { env } from '../../../shared/config/env.js';
import { ConflictError, UnauthorizedError } from '../../../shared/errors/index.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { AuthUserRecord } from '../types/auth.types.js';

const SALT_ROUNDS = 10;

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.authRepository.create({ email: input.email, passwordHash });

    return this.toAuthResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.authRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    return this.toAuthResponse(user);
  }

  private toAuthResponse(user: AuthUserRecord): AuthResponse {
    const accessToken = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      tokens: { accessToken },
    };
  }
}
