import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { seedLocationsFromProvider } from '../services/placeSeed';

const router = Router();

router.post('/locations/seed', requireAdmin, async (req, res) => {
  const result = await seedLocationsFromProvider(req.body || {});
  res.json({
    success: true,
    data: result,
  });
});

export const adminLocationSeedRouter = router;
