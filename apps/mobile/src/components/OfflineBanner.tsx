import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface OfflineBannerProps {
  isOffline: boolean;
  /** Set when the screen is showing cached data. */
  showingCachedFrom?: number | null;
}

export function OfflineBanner({ isOffline, showingCachedFrom }: OfflineBannerProps) {
  if (!isOffline && !showingCachedFrom) return null;
  const when = showingCachedFrom ? ` Showing data from ${new Date(showingCachedFrom).toLocaleTimeString()}.` : '';
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>
        {isOffline ? 'You are offline.' : 'Showing saved data.'}
        {when}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#fef3c7', paddingVertical: 8, paddingHorizontal: 12 },
  text: { color: '#92400e', fontSize: 13 },
});
