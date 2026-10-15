import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { DpadButton } from "./src/components/DpadButton";
import { GamepadButton } from "./src/components/GamepadButton";
import { getHistory, log, subscribe } from "./src/logger";
import { ButtonName, ControlName, DpadDirection, encodeControl } from "./src/protocol";
import { sendBluetooth, startBluetooth, stopBluetooth } from "./src/bluetooth";
import { Transport, TransportStatus, startClientTransport, startHostTransport } from "./src/transport";

type Mode = "host" | "client" | "bluetooth";

const DEFAULT_HOST = "192.168.1.10";
const DEFAULT_PORT = "8765";

export default function App() {
  const [mode, setMode] = useState<Mode>("host");
  const [host, setHost] = useState(DEFAULT_HOST);
  const [port, setPort] = useState(DEFAULT_PORT);
  const [status, setStatus] = useState<TransportStatus>("disconnected");
  const [detail, setDetail] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const transportRef = useRef<Transport | null>(null);

  const isRunning = status === "connected" || status === "connecting";

  const handleStatus = (next: TransportStatus, message?: string) => {
    // La reference est liberee des que la session se termine
    if (next === "error" || next === "disconnected") {
      transportRef.current = null;
    }
    setStatus(next);
    setDetail(message ?? "");
  };

  useEffect(() => {
    setLogs(getHistory());
    return subscribe((line) => setLogs((previous) => [...previous, line]));
  }, []);

  useEffect(() => {
    return () => transportRef.current?.close();
  }, []);

  const stop = () => {
    if (mode === "bluetooth") {
      stopBluetooth();
    } else {
      const transport = transportRef.current;
      transportRef.current = null;
      transport?.close();
    }
    setStatus("disconnected");
    setDetail("");
  };

  const start = () => {
    if (mode === "host") {
      transportRef.current = startHostTransport(port.trim(), handleStatus);
    } else if (mode === "client") {
      transportRef.current = startClientTransport(host.trim(), port.trim(), handleStatus);
    } else {
      startBluetooth();
      setStatus("connecting");
      setDetail("apparie la manette depuis le Chromebook");
    }
  };

  const toggle = () => (isRunning ? stop() : start());

  const isEditable = !isRunning;

  const send = (name: ControlName, pressed: boolean) => {
    log(`${name} ${pressed ? "appuye" : "relache"}`);
    if (mode === "bluetooth") {
      sendBluetooth(name, pressed);
    } else {
      transportRef.current?.send(encodeControl(name, pressed));
    }
  };

  const sendButton = (name: ButtonName, pressed: boolean) => send(name, pressed);
  const sendDpad = (direction: DpadDirection, pressed: boolean) => send(direction, pressed);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeButton, mode === "bluetooth" && styles.modeButtonActive]}
          onPress={() => !isRunning && setMode("bluetooth")}
        >
          <Text style={styles.modeLabel}>Bluetooth</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === "host" && styles.modeButtonActive]}
          onPress={() => !isRunning && setMode("host")}
        >
          <Text style={styles.modeLabel}>Wi-Fi serveur</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === "client" && styles.modeButtonActive]}
          onPress={() => !isRunning && setMode("client")}
        >
          <Text style={styles.modeLabel}>Wi-Fi client</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topBar}>
        {mode === "client" ? (
          <TextInput
            style={styles.hostInput}
            value={host}
            onChangeText={setHost}
            placeholder="Adresse IP du serveur"
            placeholderTextColor="#666666"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
            editable={isEditable}
          />
        ) : null}
        <TextInput
          style={styles.portInput}
          value={port}
          onChangeText={setPort}
          placeholder="Port"
          placeholderTextColor="#666666"
          keyboardType="number-pad"
          editable={isEditable}
        />
        <TouchableOpacity style={styles.connectButton} onPress={toggle}>
          <Text style={styles.connectLabel}>
            {isRunning ? "Arreter" : mode === "bluetooth" ? "Activer" : mode === "host" ? "Demarrer" : "Connecter"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.status}>{status}</Text>
        <TouchableOpacity onPress={() => setShowLogs((v) => !v)} style={styles.logToggle}>
          <Text style={styles.logToggleLabel}>{showLogs ? "Masquer" : "Journal"}</Text>
        </TouchableOpacity>
      </View>

      {detail ? <Text style={styles.detail}>{detail}</Text> : null}

      {showLogs ? (
        <ScrollView style={styles.logPanel}>
          {logs.length === 0 ? (
            <Text style={styles.logLine}>Aucun evenement</Text>
          ) : (
            logs.map((line, index) => (
              <Text key={index} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </ScrollView>
      ) : null}

      <View style={styles.pad}>
        <View style={styles.side}>
          <DpadButton onChange={sendDpad} />
          <View style={styles.centerRow}>
            <GamepadButton label="SEL" name="SELECT" onChange={sendButton} size={48} color="#555555" />
            <GamepadButton label="STA" name="START" onChange={sendButton} size={48} color="#555555" />
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
  modeBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#222222",
  },
  modeButtonActive: {
    backgroundColor: "#2b4a6f",
  },
  modeLabel: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  hostInput: {
    flex: 1,
    color: "#ffffff",
    backgroundColor: "#222222",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  portInput: {
    width: 80,
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
  logToggle: {
    backgroundColor: "#222222",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  logToggleLabel: {
    color: "#ffffff",
  },
  detail: {
    color: "#dc322f",
    marginBottom: 8,
  },
  logPanel: {
    maxHeight: 120,
    backgroundColor: "#000000",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  logLine: {
    color: "#8ab4f8",
    fontSize: 11,
    fontFamily: "monospace",
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