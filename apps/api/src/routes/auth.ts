import express from 'express';
import { register } from '../controllers/authController';
import { registerValidation, validate } from '../middleware/validators';

const router = express.Router();

// POST /api/auth/register
router.post('/register', registerValidation, validate, register);

export default router;