import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
  });

  useEffect(() => {
    // Fetch initial state
    const fetchInitial = async () => {
      const state = await NetInfo.fetch();
      applyState(state);
    };
    fetchInitial();

    // Subscribe to updates
    const unsubscribe = NetInfo.addEventListener(applyState);

    return () => unsubscribe();
  }, []);

  function applyState(state: NetInfoState) {
    setStatus({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    });
  }

  return status;
}
