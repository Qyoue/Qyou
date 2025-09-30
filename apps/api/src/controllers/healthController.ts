import { Request, Response } from 'express';
import { HealthCheckResponse, ApiResponse } from '@qyou/types';

export const getHealth = (req: Request, res: Response): void => {
  const healthData: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  const response: ApiResponse<HealthCheckResponse> = {
    success: true,
    data: healthData,
    message: 'Qyou API is healthy!'
  };

  res.status(200).json(response);
};
