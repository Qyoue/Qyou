import { Router } from 'express';
import { ValidationError } from '../errors/AppError';
import { getQueueHistoryForLocation } from '../services/queueHistory';

const router = Router();

router.get('/:locationId/history', async (req, res) => {
  const locationId = String(req.params.locationId || '');
  if (!/^[a-fA-F0-9]{24}$/.test(locationId)) {
    throw new ValidationError('locationId must be a valid location identifier');
  }

  const windowHours = req.query.windowHours === undefined ? undefined : Number(req.query.windowHours);
  const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);

  const history = await getQueueHistoryForLocation({
    locationId,
    windowHours,
    limit,
  });

  res.json({
    success: true,
    data: history,
  });
});

export const queuesRouter = router;

