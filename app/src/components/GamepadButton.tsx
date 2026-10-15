import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import type { ButtonName } from "../protocol";

interface Props {
  label: string;
  name: ButtonName;
  onChange: (name: ButtonName, pressed: boolean) => void;
  color?: string;
  size?: number;
}

export function GamepadButton({ label, name, onChange, color = "#3a3a3a", size = 64 }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => onChange(name, true)}
      onPressOut={() => onChange(name, false)}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    margin: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 18,
  },
});
