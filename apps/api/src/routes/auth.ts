import express from 'express';
import { register, login } from '../controllers/authController';
import { registerValidation, loginValidation, validate } from '../middleware/validators';

const router = express.Router();

// POST /api/auth/register
router.post('/register', registerValidation, validate, register);

// POST /api/auth/login
router.post('/login', loginValidation, validate, login);

export default router;