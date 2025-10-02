// File: apps/api/src/config/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Configure dotenv to load variables from .env file
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    await mongoose.connect(mongoURI);

    console.log('[api]: MongoDB Connected...');
  } catch (err: any) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;