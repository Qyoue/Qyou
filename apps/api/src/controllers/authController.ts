import { Request, Response } from 'express';
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