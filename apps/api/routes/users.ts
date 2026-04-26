import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { Session } from '../models/Session';
import { User } from '../models/User';

const router = Router();

const readQueueReportModel = () => {
  try {
    // Optional dependency for independent merge safety.
    return require('../models/QueueReport') as {
      QueueReport?: {
        countDocuments: (filter: Record<string, unknown>) => Promise<number>;
      };
    };
  } catch {
    return null;
  }
};

router.get('/me/profile', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const [user, activeSessions] = await Promise.all([
    User.findById(authReq.auth.userId, {
      _id: 1,
      email: 1,
      role: 1,
      createdAt: 1,
      updatedAt: 1,
    }).lean(),
    Session.countDocuments({
      userId: authReq.auth.userId,
      status: 'active',
    }),
  ]);

  const queueReportModule = readQueueReportModel();
  const reportCount = queueReportModule?.QueueReport
    ? await queueReportModule.QueueReport.countDocuments({
        userId: authReq.auth.userId,
        status: 'accepted',
      })
    : 0;

  res.json({
    success: true,
    data: {
      user: user
        ? {
            id: String(user._id),
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        : null,
      contributionSummary: {
        reportCount,
        activeSessions,
        rewardBalance: 0,
      },
    },
  });
});

export const usersRouter = router;

