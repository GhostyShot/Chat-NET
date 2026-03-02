import type { Server } from "socket.io";
import type { RealtimeClientToServerEvents, RealtimeServerToClientEvents } from "@chatnet/shared";

let ioInstance: Server<RealtimeClientToServerEvents, RealtimeServerToClientEvents> | null = null;

export function setRealtimeServer(io: Server<RealtimeClientToServerEvents, RealtimeServerToClientEvents>) {
  ioInstance = io;
}

export function getRealtimeServer(): Server<RealtimeClientToServerEvents, RealtimeServerToClientEvents> | null {
  return ioInstance;
}