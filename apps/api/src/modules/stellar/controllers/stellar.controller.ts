import type { NextFunction, Request, Response } from 'express';
import { linkWalletSchema, unlinkWalletSchema } from '../validators/stellar.validators.js';
import type { StellarApiService } from '../services/stellar.service.js';
import { UnauthorizedError, ValidationError } from '../../../shared/errors/index.js';

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

  getRewardHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication required to fetch reward history.');
      }
      const rawLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
      if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
        throw new ValidationError('limit must be an integer between 1 and 100.');
      }
      let cursor: number | undefined;
      if (req.query.cursor !== undefined) {
        cursor = Number(req.query.cursor);
        if (!Number.isInteger(cursor) || cursor < 0) {
          throw new ValidationError('cursor is invalid.');
        }
      }
      const page = await this.stellarService.getRewardHistory(req.user.id, { limit: rawLimit, cursor });
      res.status(200).json({ success: true, ...page });
    } catch (error) {
      next(error);
    }
  };
}
