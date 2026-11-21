import React from "react";
import { Text, TouchableOpacity, AccessibilityRole } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  disabled = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
