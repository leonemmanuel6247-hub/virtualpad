import TcpSocket from "react-native-tcp-socket";
import type Server from "react-native-tcp-socket/lib/types/Server";
import type Socket from "react-native-tcp-socket/lib/types/Socket";

import { log } from "./logger";
import type { GamepadMessage } from "./protocol";

export type HostStatus = "disconnected" | "connecting" | "connected" | "error";

export interface HostedServer {
  send(message: GamepadMessage): void;
  close(): void;
}

/**
 * Le telephone heberge un serveur TCP. Le PC s'y connecte en sortant et pilote
 * la manette. Cela contourne le filtrage des connexions entrantes de ChromeOS.
 *
 * Protocole : un message JSON par ligne, termine par '\n'.
 */
export function startHostServer(
  port: string,
  onStatus: (status: HostStatus, detail?: string) => void,
): HostedServer {
  const portNumber = Number.parseInt(port, 10);
  if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
    log(`port invalide : ${port}`);
    onStatus("error", "port invalide");
    return { send: () => undefined, close: () => undefined };
  }

  const clients = new Set<Socket>();
  log(`ouverture du serveur sur le port ${portNumber}`);
  onStatus("connecting", `en attente du PC sur le port ${portNumber}`);

  const server: Server = TcpSocket.createServer({}, (socket: Socket) => {
    log("PC connecte");
    clients.add(socket);
    onStatus("connected");

    socket.on("data", (data: Buffer | string) => {
      log(`message du PC : ${String(data).trim()}`);
    });
    socket.on("error", (error: Error) => {
      log(`erreur socket : ${error.message}`);
    });
    socket.on("close", () => {
      log("PC deconnecte");
      clients.delete(socket);
      if (clients.size === 0) {
        onStatus("disconnected");
      }
    });
  });

  server.on("listening", () => {
    log(`serveur en ecoute sur 0.0.0.0:${portNumber}`);
    onStatus("connecting", `en attente du PC sur le port ${portNumber}`);
  });

  server.on("error", (error: Error) => {
    log(`erreur serveur : ${error.message}`);
    onStatus("error", error.message);
  });

  try {
    server.listen({ port: portNumber, host: "0.0.0.0" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`echec ouverture serveur : ${message}`);
    onStatus("error", message);
  }

  return {
    send(message) {
      if (clients.size === 0) {
        return;
      }
      const line = `${JSON.stringify(message)}\n`;
      clients.forEach((socket) => socket.write(line));
    },
    close() {
      log("fermeture du serveur");
      clients.forEach((socket) => socket.destroy());
      clients.clear();
      server.close();
    },
  };
}