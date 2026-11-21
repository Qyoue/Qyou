import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { API_BASE_URL } from './src/config/env';
import { LoginScreen } from './src/screens/LoginScreen';

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <LoginScreen onNavigateRegister={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
