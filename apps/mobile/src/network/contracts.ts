import type { ApiResponse, NearbyLocationItem, QueueSnapshot } from "@qyou/types";

export type LocationDetailsResponse = ApiResponse<{
  item?: {
    _id?: string;
    name?: string;
    type?: string;
    address?: string;
    status?: string;
    queueSnapshot?: QueueSnapshot;
  };
}>;

export type NearbyLocationsResponse = ApiResponse<{
  items?: NearbyLocationItem[];
}>;

