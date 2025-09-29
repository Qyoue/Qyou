import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

const customColors = {
  primary: '#10B981',
  secondary: '#6366F1',
  accent: '#F59E0B',
  background: '#F8FAFC',
  error: '#EF4444',
  text: '#0F172A',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: customColors.primary,
    secondary: customColors.secondary,
    accent: customColors.accent,
    background: customColors.background,
    error: customColors.error,
    text: customColors.text,
  },
};
