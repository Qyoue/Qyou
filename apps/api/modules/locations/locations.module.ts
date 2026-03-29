import { Router } from 'express';
import { locationsRouter } from '../../routes/locations';

export const locationsModule = {
  router: Router().use(locationsRouter),
};

