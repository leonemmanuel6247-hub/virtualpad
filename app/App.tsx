import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ConnectionStatus, GamepadConnection, connectToServer } from "./src/connection";
import { DpadButton } from "./src/components/DpadButton";
import { GamepadButton } from "./src/components/GamepadButton";
import { HostStatus, HostedServer, startHostServer } from "./src/hostServer";
import { getHistory, log, subscribe } from "./src/logger";
import { ButtonName, DpadValue, buttonMessage, dpadMessage } from "./src/protocol";

type Mode = "host" | "connect";

const DEFAULT_HOST = "192.168.1.10";
const DEFAULT_PORT = "8765";

// Le mode "host" est le seul fiable sur ChromeOS : le PC se connecte en
// sortant vers le telephone, ce qui contourne le filtrage des connexions
// entrantes de ChromeOS.
export default function App() {
  const [mode, setMode] = useState<Mode>("host");
  const [host, setHost] = useState(DEFAULT_HOST);
  const [port, setPort] = useState(DEFAULT_PORT);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [hostStatus, setHostStatus] = useState<HostStatus>("disconnected");
  const [detail, setDetail] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const connectionRef = useRef<GamepadConnection | null>(null);
  const serverRef = useRef<HostedServer | null>(null);

  // En mode host, le telephone est pret des que le PC est connecte.
  const activeStatus = mode === "host" ? hostStatus : status;
  const isRunning = activeStatus === "connected" || activeStatus === "connecting";

  const handleStatus = (next: ConnectionStatus, message?: string) => {
    // La reference est liberee des que la connexion se termine, pour permettre
    // de relancer une connexion meme apres une erreur.
    if (next === "error" || next === "disconnected") {
      connectionRef.current = null;
    }
    setStatus(next);
    setDetail(message ?? "");
  };

  const handleHostStatus = (next: HostStatus, message?: string) => {
    setHostStatus(next);
    setDetail(message ?? "");
  };

  // Suit le journal pour l'afficher a l'ecran
  useEffect(() => {
    setLogs(getHistory());
    return subscribe((line) => setLogs((previous) => [...previous, line]));
  }, []);

  // Ferme tout quand l'application est demontee
  useEffect(() => {
    return () => {
      connectionRef.current?.close();
      serverRef.current?.close();
    };
  }, []);

  const stop = () => {
    if (mode === "host") {
      serverRef.current?.close();
      serverRef.current = null;
      setHostStatus("disconnected");
    } else {
      const connection = connectionRef.current;
      connectionRef.current = null;
      connection?.close();
      setStatus("disconnected");
    }
    setDetail("");
  };

  const start = () => {
    if (mode === "host") {
      serverRef.current = startHostServer(port.trim(), handleHostStatus);
    } else {
      const url = `ws://${host.trim()}:${port.trim()}`;
      connectionRef.current = connectToServer(url, handleStatus);
    }
  };

  const toggle = () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  const isEditable = !isRunning;

  const sendButton = (name: ButtonName, pressed: boolean) => {
    log(`bouton ${name} ${pressed ? "appuye" : "relache"}`);
    const message = buttonMessage(name, pressed);
    if (mode === "host") {
      serverRef.current?.send(message);
    } else {
      connectionRef.current?.send(message);
    }
  };

  const sendDpad = (x: DpadValue, y: DpadValue) => {
    log(`dpad (${x}, ${y})`);
    const message = dpadMessage(x, y);
    if (mode === "host") {
      serverRef.current?.send(message);
    } else {
      connectionRef.current?.send(message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeButton, mode === "host" && styles.modeButtonActive]}
          onPress={() => !isRunning && setMode("host")}
        >
          <Text style={styles.modeLabel}>Heberger (recommande)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === "connect" && styles.modeButtonActive]}
          onPress={() => !isRunning && setMode("connect")}
        >
          <Text style={styles.modeLabel}>Se connecter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topBar}>
        {mode === "connect" ? (
          <TextInput
            style={styles.hostInput}
            value={host}
            onChangeText={setHost}
            placeholder="Adresse IP du PC"
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
            {isRunning ? "Arreter" : mode === "host" ? "Demarrer" : "Connecter"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.status}>{activeStatus}</Text>
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
