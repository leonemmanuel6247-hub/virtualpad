import TcpSocket from "react-native-tcp-socket";
import type Server from "react-native-tcp-socket/lib/types/Server";
import type Socket from "react-native-tcp-socket/lib/types/Socket";

import { log } from "./logger";

export type TransportStatus = "disconnected" | "connecting" | "connected" | "error";

export interface Transport {
  send(line: string): void;
  close(): void;
}

/**
 * Mode "host" : le telephone heberge un serveur TCP.
 * Le PC se connecte en sortant (contourne le filtrage des connexions entrantes).
 */
export function startHostTransport(
  port: string,
  onStatus: (status: TransportStatus, detail?: string) => void,
): Transport {
  const portNumber = parsePort(port);
  if (portNumber === null) {
    log(`port invalide : ${port}`);
    onStatus("error", "port invalide");
    return { send: () => undefined, close: () => undefined };
  }

  const clients = new Set<Socket>();
  log(`ouverture du serveur sur le port ${portNumber}`);
  onStatus("connecting", `en attente du PC sur le port ${portNumber}`);

  const server: Server = TcpSocket.createServer({}, (socket: Socket) => {
    log("client connecte");
    clients.add(socket);
    onStatus("connected");

    socket.on("data", (data: Buffer | string) => log(`message recu : ${String(data).trim()}`));
    socket.on("error", (error: Error) => log(`erreur socket : ${error.message}`));
    socket.on("close", () => {
      log("client deconnecte");
      clients.delete(socket);
      if (clients.size === 0) {
        onStatus("connecting", `en attente du PC sur le port ${portNumber}`);
      }
    });
  });

  server.on("listening", () => log(`serveur en ecoute sur 0.0.0.0:${portNumber}`));
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
    send(line) {
      if (clients.size === 0) {
        return;
      }
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

/**
 * Mode "client" : le telephone se connecte a un serveur TCP heberge ailleurs.
 */
export function startClientTransport(
  host: string,
  port: string,
  onStatus: (status: TransportStatus, detail?: string) => void,
): Transport {
  const portNumber = parsePort(port);
  if (portNumber === null) {
    log(`port invalide : ${port}`);
    onStatus("error", "port invalide");
    return { send: () => undefined, close: () => undefined };
  }

  log(`connexion vers ${host}:${portNumber}`);
  onStatus("connecting");
  let isOpen = false;

  const socket = TcpSocket.createConnection(
    { host, port: portNumber, connectTimeout: 10000 },
    () => {
      isOpen = true;
      log("connecte");
      onStatus("connected");
    },
  );

  socket.on("data", (data: Buffer | string) => log(`message recu : ${String(data).trim()}`));
  socket.on("error", (error: Error) => {
    log(`erreur : ${error.message}`);
    onStatus("error", error.message);
  });
  socket.on("close", () => {
    isOpen = false;
    log("connexion fermee");
    onStatus("disconnected");
  });

  return {
    send(line) {
      if (isOpen) {
        socket.write(line);
      }
    },
    close() {
      log("fermeture demandee");
      socket.destroy();
    },
  };
}

function parsePort(port: string): number | null {
  const value = Number.parseInt(port.trim(), 10);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    return null;
  }
  return value;
}