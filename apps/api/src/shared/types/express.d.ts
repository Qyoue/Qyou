import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      /** Epoch ms of the credential check that issued the access token (JWT `iat`). */
      lastAuthAt?: number;
    };
  }
}
