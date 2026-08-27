import { StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';

export default function App() {
  const { isConnected, isInternetReachable, type } = useNetworkStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Qyou Mobile</Text>
      <Text style={styles.subtitle}>Foundation ready</Text>
      <View style={styles.statusBar}>
        <View style={[styles.dot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Offline'} · {type}
          {isInternetReachable === false ? ' (no internet)' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#666666',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#333333',
  },
});
