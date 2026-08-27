import type { NextFunction, Request, Response } from 'express';
import { loginSchema, registerSchema } from '../validators/auth.validators.js';
import type { AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await this.authService.register(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  
    try {
      const input = loginSchema.parse(req.body);
      const result = await this.authService.login(input);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
