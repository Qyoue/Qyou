import { Stack } from "expo-router";
import { useEffect } from "react";
import { initializeApiClient, shutdownApiClient } from "@/src/network/apiClient";

export default function RootLayout() {
  useEffect(() => {
    void initializeApiClient();
    return () => {
      shutdownApiClient();
    };
  }, []);

  return <Stack />;
}
