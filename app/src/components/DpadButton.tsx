import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DpadDirection } from "../protocol";

interface Props {
  onChange: (direction: DpadDirection, pressed: boolean) => void;
}

/**
 * Croix directionnelle. Chaque case envoie sa direction a l'appui et au relachement.
 * Maintenir deux cases en diagonale fonctionne naturellement.
 */
export function DpadButton({ onChange }: Props) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <Arm label="^" direction="UP" onChange={onChange} />
      </View>
      <View style={styles.row}>
        <Arm label="<" direction="LEFT" onChange={onChange} />
        <View style={styles.center} />
        <Arm label=">" direction="RIGHT" onChange={onChange} />
      </View>
      <View style={styles.row}>
        <Arm label="v" direction="DOWN" onChange={onChange} />
      </View>
    </View>
  );
}

interface ArmProps {
  label: string;
  direction: DpadDirection;
  onChange: (direction: DpadDirection, pressed: boolean) => void;
}

function Arm({ label, direction, onChange }: ArmProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Direction ${label}`}
      onPressIn={() => onChange(direction, true)}
      onPressOut={() => onChange(direction, false)}
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