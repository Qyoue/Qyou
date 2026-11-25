import type { NextFunction, Request, Response } from 'express';
import { loginSchema, registerSchema, tokenRefreshSchema } from '../validators/auth.validators.js';
import {
  emailActionRequestSchema,
  emailVerificationConfirmSchema,
  passwordResetConfirmSchema,
} from '../validators/action-token.validators.js';
import type { AuthService } from '../services/auth.service.js';
import { UnauthorizedError } from '../../../shared/errors/index.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await this.authService.register(input, this.requestContext(req));
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await this.authService.login(input, this.requestContext(req));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = tokenRefreshSchema.parse(req.body);
      const result = await this.authService.refresh(input, this.requestContext(req));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
      await this.authService.revokeSession(token);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accessToken = req.header('authorization')?.slice('Bearer '.length);
      if (!req.user || !accessToken) throw new UnauthorizedError();
      const sessions = await this.authService.listSessions(req.user.id, accessToken);
      res.status(200).json({ sessions });
    } catch (error) {
      next(error);
    }
  };

  requestEmailVerification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email } = emailActionRequestSchema.parse(req.body);
      await this.authService.requestEmailVerification(email);
      res
        .status(200)
        .json({ message: 'If the account needs verification, an email will be sent.' });
    } catch (error) {
      next(error);
    }
  };

  confirmEmailVerification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { token } = emailVerificationConfirmSchema.parse(req.body);
      await this.authService.confirmEmailVerification(token);
      res.status(200).json({ message: 'Email verified successfully.' });
    } catch (error) {
      next(error);
    }
  };

  requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = emailActionRequestSchema.parse(req.body);
      await this.authService.requestPasswordReset(email);
      res
        .status(200)
        .json({ message: 'If an account exists for this email, a reset email will be sent.' });
    } catch (error) {
      next(error);
    }
  };

  confirmPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = passwordResetConfirmSchema.parse(req.body);
      await this.authService.confirmPasswordReset(token, password);
      res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = loginSchema.parse(req.body);
      await this.authService.deleteAccount(input);
      res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  private requestContext(req: Request) {
    return {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    };
  }
}
