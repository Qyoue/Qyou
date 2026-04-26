import { Router, Request, Response, NextFunction } from 'express';
import { QueueReport } from '../models/QueueReport';

export const queuesRouter = Router();

queuesRouter.post('/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId, userId, waitMinutes, queueLength } = req.body;
    if (!locationId || !userId || waitMinutes == null || queueLength == null) {
      res.status(400).json({ error: 'locationId, userId, waitMinutes, queueLength are required' });
      return;
    }
    const report = await QueueReport.create({
      locationId,
      userId,
      waitMinutes,
      queueLength,
      reportedAt: new Date(),
    });
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

queuesRouter.get('/nearby', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { locationId } = req.query;
    if (!locationId) {
      res.status(400).json({ error: 'locationId query param required' });
      return;
    }
    const reports = await QueueReport.find({ locationId, status: 'verified' })
      .sort({ reportedAt: -1 })
      .limit(10)
      .lean();
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

queuesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await QueueReport.findById(req.params.id).lean();
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});
