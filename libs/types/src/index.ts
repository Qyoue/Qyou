export type ApiError = {
  code: string;
  message: string;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiFailureResponse = {
  success: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

export type UserRole = 'USER' | 'ADMIN';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  deviceId?: string;
};

export type QueueSnapshot = {
  locationId: string;
  level: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  estimatedWaitMinutes?: number;
  reportCount: number;
  confidence: number;
  lastUpdatedAt: string | null;
  isStale: boolean;
};

export type AdminLocationRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  coordinates: [number, number] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type NearbyLocationItem = {
  _id?: string;
  id?: string;
  name: string;
  type: string;
  address: string;
  distanceFromUser?: number;
  location?: {
    coordinates: [number, number];
  };
  queueSnapshot?: QueueSnapshot;
};

