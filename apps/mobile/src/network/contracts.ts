import type {
  ApiResponse,
  ContributionSummary,
  LocationDetailsItem,
  NearbyLocationItem,
  SessionTokens,
  UserPublic,
} from "@qyou/types";

export type LocationDetailsResponse = ApiResponse<{
  item?: LocationDetailsItem;
}>;

export type NearbyLocationsResponse = ApiResponse<{
  items?: NearbyLocationItem[];
}>;

export type AuthSessionResponse = ApiResponse<SessionTokens>;

export type ProfileResponse = ApiResponse<{
  user: UserPublic | null;
  contributionSummary: ContributionSummary;
}>;
