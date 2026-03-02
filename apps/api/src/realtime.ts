import { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import type {
  RealtimeClientToServerEvents,
  RealtimeReadReceiptEvent,
  RealtimeServerToClientEvents,
  RealtimeTypingPayload
} from "@chatnet/shared";
import { REALTIME_EVENTS as events } from "@chatnet/shared";
import { appConfig } from "./config.js";
import { setRealtimeServer } from "./realtime.state.js";
import { markConnected, markDisconnected } from "./realtime.presence.js";

export function setupRealtime(server: HttpServer) {
  const io = new Server<RealtimeClientToServerEvents, RealtimeServerToClientEvents>(server, {
    cors: {
      origin: appConfig.webOrigins,
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      next(new Error("AUTH_REQUIRED"));
      return;
    }
    try {
      const payload = jwt.verify(token, appConfig.jwtAccessSecret) as { sub?: string };
      if (!payload.sub) {
        next(new Error("INVALID_TOKEN"));
        return;
      }
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("INVALID_TOKEN"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      markConnected(userId, socket.id);
      io.emit(events.PRESENCE_UPDATE, { userId, online: true, lastSeenAt: null });
    }

    socket.on(events.JOIN_ROOM, (roomId: string) => socket.join(roomId));
    socket.on(events.TYPING, (payload: RealtimeTypingPayload) => {
      socket.to(payload.roomId).emit(events.TYPING, payload);
    });
    socket.on(events.READ_RECEIPT, (payload: RealtimeReadReceiptEvent) => {
      socket.to(payload.roomId).emit(events.READ_RECEIPT, payload);
    });

    socket.on("disconnect", () => {
      if (!userId) {
        return;
      }
      markDisconnected(userId, socket.id);
      io.emit(events.PRESENCE_UPDATE, { userId, online: false, lastSeenAt: Date.now() });
    });
  });

  setRealtimeServer(io);

  return io;
}