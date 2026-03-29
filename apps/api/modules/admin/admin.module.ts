import { Router } from 'express';
import { adminLocationSeedRouter } from '../../routes/adminLocationSeed';

export const adminModule = {
  router: Router().use(adminLocationSeedRouter),
};

