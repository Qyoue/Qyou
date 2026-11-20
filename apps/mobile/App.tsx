import { StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from './src/config/env';
import { WalletNavigator } from './src/navigation/WalletNavigator';

/**
 * Mobile has no sign-in flow yet, so there is no access token. In development a
 * token can be supplied with EXPO_PUBLIC_DEV_AUTH_TOKEN; production builds ignore it.
 */
const authToken = __DEV__ ? process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN : undefined;

export default function App() {
  if (!authToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Qyou Mobile</Text>
        <Text style={styles.subtitle}>Sign-in is not available in the mobile app yet.</Text>
      </View>
    );
  }
  return <WalletNavigator apiBaseUrl={`${API_BASE_URL}/api/v1/stellar`} authToken={authToken} />;
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
});
