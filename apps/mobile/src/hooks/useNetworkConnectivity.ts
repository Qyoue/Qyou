import { useState, useEffect } from "react";

export function useNetworkConnectivity(): boolean {
  const [isConnected, setIsConnected] = useState(true);
  return isConnected;
}
