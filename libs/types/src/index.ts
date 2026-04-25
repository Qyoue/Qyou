export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR'
  | string;

export type ApiError = {
  code: ApiErrorCode;
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

export type UserPublic = {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export type LocationStatus = 'active' | 'inactive';
export type LocationType =
  | 'bank'
  | 'hospital'
  | 'atm'
  | 'government'
  | 'fuel_station'
  | 'other';

export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
};

export type Location = {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  status: LocationStatus;
  location: GeoPoint;
  createdAt?: string;
  updatedAt?: string;
};

export type QueueLevel = 'none' | 'low' | 'medium' | 'high' | 'unknown';

export type QueueReport = {
  id: string;
  locationId: string;
  userId: string;
  waitTimeMinutes?: number;
  level: QueueLevel;
  notes?: string;
  reportedAt: string; // ISO
};

export type QueueSnapshot = {
  locationId: string;
  level: QueueLevel;
  estimatedWaitMinutes?: number;
  reportCount: number;
  confidence: number; // 0..1
  lastUpdatedAt: string | null; // ISO
  isStale: boolean;
};

export type NearbyLocationItem = {
  _id: string;
  name: string;
  type: LocationType;
  address: string;
  status: LocationStatus;
  location: GeoPoint;
  distanceFromUser: number;
  queueSnapshot?: QueueSnapshot;
};

export type LocationDetailsItem = {
  _id: string;
  name: string;
  type: LocationType;
  address: string;
  status: LocationStatus;
  location: GeoPoint;
  queueSnapshot?: QueueSnapshot;
  createdAt?: string;
  updatedAt?: string;
};

export type ContributionSummary = {
  reportCount: number;
  activeSessions: number;
  rewardBalance: number;
};

export type RewardTransactionType = 'EARN' | 'SPEND' | 'CLAIM';
export type RewardTransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export type RewardTransaction = {
  id: string;
  userId: string;
  amount: number;
  type: RewardTransactionType;
  status: RewardTransactionStatus;
  timestamp: number;
  memo?: string;
  reference?: string;
};

export type RewardBalance = {
  userId: string;
  balance: number;
  lifetimeEarned?: number;
  lastUpdatedAt?: string;
};
