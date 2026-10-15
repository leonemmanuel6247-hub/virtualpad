import type { GamepadMessage } from "./protocol";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface GamepadConnection {
  send(message: GamepadMessage): void;
  close(): void;
}

/**
 * Ouvre une connexion WebSocket vers le serveur.
 * Les messages envoyes pendant une deconnexion sont ignores (pas de file d'attente :
 * un appui rejoue apres reconnexion serait dangereux).
 */
export function connectToServer(
  url: string,
  onStatus: (status: ConnectionStatus) => void,
): GamepadConnection {
  onStatus("connecting");
  const socket = new WebSocket(url);
  let isOpen = false;

  socket.onopen = () => {
    isOpen = true;
    onStatus("connected");
  };
  socket.onclose = () => {
    isOpen = false;
    onStatus("disconnected");
  };
  socket.onerror = () => {
    onStatus("error");
  };

  return {
    send(message) {
      if (isOpen) {
        socket.send(JSON.stringify(message));
      }
    },
    close() {
      socket.close();
    },
  };
}
