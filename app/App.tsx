import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ConnectionStatus, GamepadConnection, connectToServer } from "./src/connection";
import { DpadButton } from "./src/components/DpadButton";
import { GamepadButton } from "./src/components/GamepadButton";
import { ButtonName, DpadValue, buttonMessage, dpadMessage } from "./src/protocol";

const DEFAULT_URL = "ws://192.168.1.10:8765";

export default function App() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const connectionRef = useRef<GamepadConnection | null>(null);

  // Ferme la connexion quand l'application est demontee
  useEffect(() => {
    return () => connectionRef.current?.close();
  }, []);

  const toggleConnection = () => {
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
      setStatus("disconnected");
      return;
    }
    connectionRef.current = connectToServer(url, setStatus);
  };

  const sendButton = (name: ButtonName, pressed: boolean) => {
    connectionRef.current?.send(buttonMessage(name, pressed));
  };

  const sendDpad = (x: DpadValue, y: DpadValue) => {
    connectionRef.current?.send(dpadMessage(x, y));
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <TextInput
          style={styles.urlInput}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          editable={status === "disconnected" || status === "error"}
        />
        <TouchableOpacity style={styles.connectButton} onPress={toggleConnection}>
          <Text style={styles.connectLabel}>
            {connectionRef.current ? "Deconnecter" : "Connecter"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.status}>{status}</Text>
      </View>

      <View style={styles.pad}>
        <View style={styles.side}>
          <DpadButton onChange={sendDpad} />
          <View style={styles.centerRow}>
            <GamepadButton label="SEL" name="SELECT" onChange={sendButton} size={48} color="#555" />
            <GamepadButton label="STA" name="START" onChange={sendButton} size={48} color="#555" />
          </View>
        </View>

        <View style={styles.side}>
          <View style={styles.shoulders}>
            <GamepadButton label="L1" name="L1" onChange={sendButton} size={56} color="#2b4a6f" />
            <GamepadButton label="R1" name="R1" onChange={sendButton} size={56} color="#2b4a6f" />
          </View>
          <View style={styles.faceButtons}>
            <View style={styles.faceRow}>
              <GamepadButton label="Y" name="Y" onChange={sendButton} color="#b58900" />
            </View>
            <View style={styles.faceRow}>
              <GamepadButton label="X" name="X" onChange={sendButton} color="#268bd2" />
              <GamepadButton label="B" name="B" onChange={sendButton} color="#dc322f" />
            </View>
            <View style={styles.faceRow}>
              <GamepadButton label="A" name="A" onChange={sendButton} color="#859900" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  urlInput: {
    flex: 1,
    color: "#ffffff",
    backgroundColor: "#222222",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connectButton: {
    backgroundColor: "#2b4a6f",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  connectLabel: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  status: {
    color: "#aaaaaa",
    width: 90,
  },
  pad: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  side: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  centerRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  shoulders: {
    flexDirection: "row",
    marginBottom: 12,
  },
  faceButtons: {
    alignItems: "center",
  },
  faceRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
