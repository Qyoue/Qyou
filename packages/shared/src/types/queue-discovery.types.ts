export type QueueCategory = 'bank' | 'hospital' | 'fuel_station' | 'service_center' | 'other';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface QueueItem {
  id: string;
  name: string;
  category: QueueCategory;
  location: LocationCoordinates;
  currentWaitTimeMinutes: number;
  activeCount: number;
  createdAt: string;
}

export interface QueueFilterParams {
  category?: QueueCategory;
  maxDistanceKm?: number;
  maxWaitTimeMinutes?: number;
  searchQuery?: string;
}
