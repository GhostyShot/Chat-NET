import { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import type {
  RealtimeClientToServerEvents,
  RealtimeVoiceAnswerPayload,
  RealtimeVoiceIceCandidatePayload,
  RealtimeVoiceJoinPayload,
  RealtimeVoiceLeavePayload,
  RealtimeVoiceOfferPayload,
  RealtimeReadReceiptEvent,
  RealtimeServerToClientEvents,
  RealtimeTypingPayload
} from "@chatnet/shared";
import { REALTIME_EVENTS as events } from "@chatnet/shared";
import { appConfig } from "./config.js";
import { setRealtimeServer } from "./realtime.state.js";
import { markConnected, markDisconnected } from "./realtime.presence.js";

const voiceParticipantsByRoom = new Map<string, Map<string, number>>();

function listVoiceParticipants(roomId: string): string[] {
  return Array.from(voiceParticipantsByRoom.get(roomId)?.keys() ?? []);
}

function incrementVoiceParticipant(roomId: string, userId: string): boolean {
  const roomState = voiceParticipantsByRoom.get(roomId) ?? new Map<string, number>();
  const previousCount = roomState.get(userId) ?? 0;
  roomState.set(userId, previousCount + 1);
  voiceParticipantsByRoom.set(roomId, roomState);
  return previousCount === 0;
}

function decrementVoiceParticipant(roomId: string, userId: string): boolean {
  const roomState = voiceParticipantsByRoom.get(roomId);
  if (!roomState) {
    return false;
  }
  const previousCount = roomState.get(userId) ?? 0;
  if (previousCount <= 1) {
    roomState.delete(userId);
    if (roomState.size === 0) {
      voiceParticipantsByRoom.delete(roomId);
    }
    return previousCount > 0;
  }
  roomState.set(userId, previousCount - 1);
  return false;
}

function clearVoiceParticipants(roomId: string) {
  voiceParticipantsByRoom.delete(roomId);
}

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
    socket.data.voiceRooms = new Set<string>();

    const getVoiceRooms = () => (socket.data.voiceRooms as Set<string> | undefined) ?? new Set<string>();
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

    socket.on(events.VC_JOIN, (payload: RealtimeVoiceJoinPayload) => {
      if (!userId || !payload?.roomId) {
        return;
      }
      const voiceRooms = getVoiceRooms();
      if (voiceRooms.has(payload.roomId)) {
        socket.emit(events.VC_PARTICIPANTS, { roomId: payload.roomId, userIds: listVoiceParticipants(payload.roomId) });
        return;
      }

      voiceRooms.add(payload.roomId);
      socket.data.voiceRooms = voiceRooms;
      socket.join(payload.roomId);

      const becameActive = incrementVoiceParticipant(payload.roomId, userId);

      socket.emit(events.VC_PARTICIPANTS, {
        roomId: payload.roomId,
        userIds: listVoiceParticipants(payload.roomId)
      });

      if (becameActive) {
        socket.to(payload.roomId).emit(events.VC_PARTICIPANT_JOINED, {
          roomId: payload.roomId,
          userId
        });
      }
    });

    socket.on(events.VC_LEAVE, (payload: RealtimeVoiceLeavePayload) => {
      if (!userId || !payload?.roomId) {
        return;
      }
      const voiceRooms = getVoiceRooms();
      if (!voiceRooms.has(payload.roomId)) {
        return;
      }

      voiceRooms.delete(payload.roomId);
      socket.data.voiceRooms = voiceRooms;

      const removed = decrementVoiceParticipant(payload.roomId, userId);
      if (removed) {
        socket.to(payload.roomId).emit(events.VC_PARTICIPANT_LEFT, {
          roomId: payload.roomId,
          userId
        });
      }
    });

    socket.on(events.VC_END, (payload) => {
      if (!userId || !payload?.roomId) {
        return;
      }

      clearVoiceParticipants(payload.roomId);
      io.to(payload.roomId).emit(events.VC_ENDED, {
        roomId: payload.roomId,
        endedByUserId: userId
      });
    });

    socket.on(events.VC_OFFER, (payload: RealtimeVoiceOfferPayload) => {
      if (!userId || !payload?.roomId || !payload?.targetUserId || !payload?.sdp) {
        return;
      }
      const voiceRooms = getVoiceRooms();
      if (!voiceRooms.has(payload.roomId)) {
        return;
      }
      socket.to(payload.roomId).emit(events.VC_OFFER, {
        roomId: payload.roomId,
        fromUserId: userId,
        targetUserId: payload.targetUserId,
        sdp: payload.sdp
      });
    });

    socket.on(events.VC_ANSWER, (payload: RealtimeVoiceAnswerPayload) => {
      if (!userId || !payload?.roomId || !payload?.targetUserId || !payload?.sdp) {
        return;
      }
      const voiceRooms = getVoiceRooms();
      if (!voiceRooms.has(payload.roomId)) {
        return;
      }
      socket.to(payload.roomId).emit(events.VC_ANSWER, {
        roomId: payload.roomId,
        fromUserId: userId,
        targetUserId: payload.targetUserId,
        sdp: payload.sdp
      });
    });

    socket.on(events.VC_ICE_CANDIDATE, (payload: RealtimeVoiceIceCandidatePayload) => {
      if (!userId || !payload?.roomId || !payload?.targetUserId || !payload?.candidate) {
        return;
      }
      const voiceRooms = getVoiceRooms();
      if (!voiceRooms.has(payload.roomId)) {
        return;
      }
      socket.to(payload.roomId).emit(events.VC_ICE_CANDIDATE, {
        roomId: payload.roomId,
        fromUserId: userId,
        targetUserId: payload.targetUserId,
        candidate: payload.candidate
      });
    });

    socket.on("disconnect", () => {
      if (userId) {
        const voiceRooms = getVoiceRooms();
        for (const roomId of voiceRooms) {
          const removed = decrementVoiceParticipant(roomId, userId);
          if (removed) {
            socket.to(roomId).emit(events.VC_PARTICIPANT_LEFT, {
              roomId,
              userId
            });
          }
        }
      }

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