
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  PaperProvider,
  Text,
  Button,
  Appbar,
  useTheme,
} from 'react-native-paper';
import { theme } from './src/theme';

function Main() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text variant="displayMedium" style={{ color: colors.primary }}>
        Welcome to Qyou!
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        This screen confirms that React Native Paper is set up correctly with
        our custom theme.
      </Text>
      <Button
        mode="contained"
        onPress={() => console.log('Button Pressed!')}
        icon="check-circle"
        style={styles.button}
      >
        Setup Complete
      </Button>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="Qyou Monorepo" />
      </Appbar.Header>
      <Main />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  subtitle: {
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
  },
  button: {
    marginTop: 10,
  },
});