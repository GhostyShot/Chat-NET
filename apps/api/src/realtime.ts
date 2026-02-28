import { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { config } from "./config.js";
import { setRealtimeServer } from "./realtime.state.js";
import { markConnected, markDisconnected } from "./realtime.presence.js";

export function setupRealtime(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: config.webOrigin,
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
      const payload = jwt.verify(token, config.jwtAccessSecret) as { sub?: string };
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
      io.emit("presence_update", { userId, online: true, lastSeenAt: null });
    }

    socket.on("join_room", (roomId: string) => socket.join(roomId));
    socket.on("typing", (payload: { roomId: string; userId: string }) => {
      socket.to(payload.roomId).emit("typing", payload);
    });
    socket.on("read_receipt", (payload: { roomId: string; messageId: string; userId: string }) => {
      socket.to(payload.roomId).emit("read_receipt", payload);
    });

    socket.on("disconnect", () => {
      if (!userId) {
        return;
      }
      markDisconnected(userId, socket.id);
      io.emit("presence_update", { userId, online: false, lastSeenAt: Date.now() });
    });
  });

  setRealtimeServer(io);

  return io;
}