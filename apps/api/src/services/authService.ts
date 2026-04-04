// ─── Auth Service ────────────────────────────────────────────────

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/unifiedConfig.js';
import { AppError } from '../middleware/errorHandler.js';
import { logInfo, logWarn } from '../lib/logger.js';
import type { UserRepository } from '../repositories/UserRepository.js';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: { email: string; password: string; name: string }) {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      logWarn('Registration attempt with existing email', { email: input.email });
      throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const token = this.generateToken(
      user.id,
      user.email,
      user.subscriptionPlan as 'FREE' | 'PRO' | 'ENTERPRISE',
    );
    logInfo('User registered successfully', { userId: user.id, email: user.email });
    return { user, token };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      logWarn('Login failed: user not found', { email: input.email });
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      logWarn('Login failed: invalid password', { userId: user.id, email: user.email });
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(
      user.id,
      user.email,
      user.subscriptionPlan as 'FREE' | 'PRO' | 'ENTERPRISE',
    );
    logInfo('User logged in successfully', { userId: user.id, email: user.email, plan: user.subscriptionPlan });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      logWarn('Profile fetch: user not found', { userId });
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }
    logInfo('Profile retrieved', { userId });
    return user;
  }

  generateToken(
    userId: string,
    email: string,
    subscriptionPlan: 'FREE' | 'PRO' | 'ENTERPRISE' = 'FREE',
  ): string {
    return jwt.sign({ userId, email, subscriptionPlan }, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn as any,
    });
  }
}
