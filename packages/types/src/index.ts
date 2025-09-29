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
