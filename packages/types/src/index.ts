export interface User {
  id: string;
  email: string;
  fullName?: string;
  reputationScore: number;
}

export interface Report {
  id: string;
  locationId: string;
  userId: string;
  waitTimeMinutes: number;
  timestamp: Date;
}

// API-specific types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
}
