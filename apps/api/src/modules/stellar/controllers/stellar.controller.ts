import type { NextFunction, Request, Response } from 'express';
import { linkWalletSchema, unlinkWalletSchema } from '../validators/stellar.validators.js';
import type { StellarApiService } from '../services/stellar.service.js';
import { UnauthorizedError } from '../../../shared/errors/index.js';

export class StellarController {
  constructor(private readonly stellarService: StellarApiService) {}

  linkWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication required to link wallet.');
      }
      const input = linkWalletSchema.parse(req.body);
      const wallet = await this.stellarService.linkWallet(req.user.id, {
        publicKey: input.publicKey as string,
      });
      res.status(201).json({
        success: true,
        wallet,
      });
    } catch (error) {
      next(error);
    }
  };

  getWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication required to fetch wallet.');
      }
      const result = await this.stellarService.getWalletDetails(req.user.id);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  unlinkWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication required to unlink wallet.');
      }
      const input = unlinkWalletSchema.parse(req.body);
      const result = await this.stellarService.unlinkWallet(req.user.id, input);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
