import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/User';
import { dispatchWalletCreation } from '../jobs/walletQueue';

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Create new user (password will be hashed by the pre-save middleware)
    const user = new User({
      fullName,
      email,
      password
    });

    await user.save();

    // Dispatch background job to create Stellar wallet
    await dispatchWalletCreation(String(user._id), user.email);

    // Return success response (password is excluded via toJSON method)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server misconfiguration: missing JWT secret'
      });
    }

    const expiresInSeconds = Number(process.env.JWT_EXPIRES_IN) || 3600;

    const token = jwt.sign(
      { id: String(user._id) },
      process.env.JWT_SECRET as string,
      { expiresIn: expiresInSeconds } as any
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: user.toJSON()
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};