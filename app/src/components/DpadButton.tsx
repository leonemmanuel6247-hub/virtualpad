import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DpadValue } from "../protocol";

interface Props {
  onChange: (x: DpadValue, y: DpadValue) => void;
}

/**
 * Croix directionnelle : chaque case envoie la direction tant qu'elle est maintenue.
 * Le relachement envoie (0, 0). Les diagonales sont obtenues en maintenant deux cases.
 */
export function DpadButton({ onChange }: Props) {
  const press = (x: DpadValue, y: DpadValue) => () => onChange(x, y);
  const release = () => onChange(0, 0);

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <Arm label="^" onIn={press(0, -1)} onOut={release} />
      </View>
      <View style={styles.row}>
        <Arm label="<" onIn={press(-1, 0)} onOut={release} />
        <View style={styles.center} />
        <Arm label=">" onIn={press(1, 0)} onOut={release} />
      </View>
      <View style={styles.row}>
        <Arm label="v" onIn={press(0, 1)} onOut={release} />
      </View>
    </View>
  );
}

interface ArmProps {
  label: string;
  onIn: () => void;
  onOut: () => void;
}

function Arm({ label, onIn, onOut }: ArmProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Direction ${label}`}
      onPressIn={onIn}
      onPressOut={onOut}
      style={({ pressed }) => [styles.arm, pressed && styles.armPressed]}
    >
      <Text style={styles.armLabel}>{label}</Text>
    </Pressable>
  );
}

const ARM = 54;

const styles = StyleSheet.create({
  grid: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
  },
  center: {
    width: ARM,
    height: ARM,
  },
  arm: {
    width: ARM,
    height: ARM,
    margin: 2,
    borderRadius: 8,
    backgroundColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  armPressed: {
    opacity: 0.6,
  },
  armLabel: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
  },
});
