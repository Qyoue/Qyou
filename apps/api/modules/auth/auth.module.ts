import { Router } from 'express';
import { authRouter } from '../../routes/auth';

export const authModule = {
  router: Router().use(authRouter),
};

