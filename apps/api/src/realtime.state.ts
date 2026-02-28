import type { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setRealtimeServer(io: Server) {
  ioInstance = io;
}

export function getRealtimeServer(): Server | null {
  return ioInstance;
}