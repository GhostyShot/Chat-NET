import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { AuthResponse, RealtimeClientToServerEvents, RealtimeServerToClientEvents } from "@chatnet/shared";
import { REALTIME_EVENTS } from "@chatnet/shared";
import type { Socket } from "socket.io-client";

type VoiceCallState = "idle" | "connecting" | "active";

type UseVoiceChatParams = {
  auth: AuthResponse | null;
  activeChannelId: string | null;
  socketRef: MutableRefObject<Socket<RealtimeServerToClientEvents, RealtimeClientToServerEvents> | null>;
  realtimeState: "connecting" | "online" | "offline";
  setMessage: Dispatch<SetStateAction<string>>;
};

type LeaveOptions = {
  emitLeave: boolean;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
};

export function useVoiceChat({ auth, activeChannelId, socketRef, realtimeState, setMessage }: UseVoiceChatParams) {
  const [voiceCallState, setVoiceCallState] = useState<VoiceCallState>("idle");
  const [voiceParticipants, setVoiceParticipants] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const participantsRef = useRef<Set<string>>(new Set());
  const activeVoiceRoomRef = useRef<string | null>(null);
  const boundSocketRef = useRef<Socket<RealtimeServerToClientEvents, RealtimeClientToServerEvents> | null>(null);

  const voiceSupported = useMemo(
    () => typeof window !== "undefined" && typeof RTCPeerConnection !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    []
  );

  const syncParticipantState = useCallback(() => {
    setVoiceParticipants(participantsRef.current.size);
    if (participantsRef.current.size === 0) {
      setVoiceCallState("idle");
      return;
    }
    setVoiceCallState("active");
  }, []);

  const stopLocalStream = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    for (const track of stream.getTracks()) {
      track.stop();
    }
    localStreamRef.current = null;
    setIsVoiceMuted(false);
  }, []);

  const clearRemoteAudioForUser = useCallback((userId: string) => {
    const audioElement = remoteAudioElementsRef.current.get(userId);
    if (!audioElement) {
      return;
    }
    audioElement.pause();
    audioElement.srcObject = null;
    remoteAudioElementsRef.current.delete(userId);
  }, []);

  const removePeerConnection = useCallback(
    (userId: string) => {
      const connection = peerConnectionsRef.current.get(userId);
      if (connection) {
        connection.onicecandidate = null;
        connection.ontrack = null;
        connection.onconnectionstatechange = null;
        connection.close();
        peerConnectionsRef.current.delete(userId);
      }
      clearRemoteAudioForUser(userId);
    },
    [clearRemoteAudioForUser]
  );

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }
    if (!voiceSupported) {
      throw new Error("Voicechat wird von diesem Browser nicht unterstützt.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  }, [voiceSupported]);

  const createPeerConnection = useCallback(
    async (
      remoteUserId: string,
      roomId: string,
      socket: Socket<RealtimeServerToClientEvents, RealtimeClientToServerEvents>
    ): Promise<RTCPeerConnection> => {
      const existing = peerConnectionsRef.current.get(remoteUserId);
      if (existing) {
        return existing;
      }

      const connection = new RTCPeerConnection(rtcConfig);
      const localStream = await ensureLocalStream();
      for (const track of localStream.getTracks()) {
        connection.addTrack(track, localStream);
      }

      connection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }
        socket.emit(REALTIME_EVENTS.VC_ICE_CANDIDATE, {
          roomId,
          targetUserId: remoteUserId,
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          }
        });
      };

      connection.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) {
          return;
        }
        const existingAudio = remoteAudioElementsRef.current.get(remoteUserId) ?? new Audio();
        existingAudio.autoplay = true;
        existingAudio.srcObject = stream;
        remoteAudioElementsRef.current.set(remoteUserId, existingAudio);
        void existingAudio.play().catch(() => undefined);
      };

      connection.onconnectionstatechange = () => {
        if (connection.connectionState === "failed" || connection.connectionState === "closed" || connection.connectionState === "disconnected") {
          removePeerConnection(remoteUserId);
        }
      };

      peerConnectionsRef.current.set(remoteUserId, connection);
      return connection;
    },
    [ensureLocalStream, removePeerConnection]
  );

  const createOfferForUser = useCallback(
    async (
      remoteUserId: string,
      roomId: string,
      socket: Socket<RealtimeServerToClientEvents, RealtimeClientToServerEvents>
    ) => {
      if (!auth?.user.id || remoteUserId === auth.user.id) {
        return;
      }
      const connection = await createPeerConnection(remoteUserId, roomId, socket);
      if (connection.signalingState !== "stable") {
        return;
      }
      const offer = await connection.createOffer({ offerToReceiveAudio: true });
      if (!offer.sdp) {
        return;
      }
      await connection.setLocalDescription(offer);

      socket.emit(REALTIME_EVENTS.VC_OFFER, {
        roomId,
        targetUserId: remoteUserId,
        sdp: offer.sdp
      });
    },
    [auth?.user.id, createPeerConnection]
  );

  const leaveVoiceCall = useCallback(
    ({ emitLeave }: LeaveOptions) => {
      const roomId = activeVoiceRoomRef.current;
      const socket = socketRef.current;

      if (emitLeave && roomId && socket) {
        socket.emit(REALTIME_EVENTS.VC_LEAVE, { roomId });
      }

      for (const remoteUserId of Array.from(peerConnectionsRef.current.keys())) {
        removePeerConnection(remoteUserId);
      }
      stopLocalStream();
      participantsRef.current.clear();
      activeVoiceRoomRef.current = null;
      setVoiceParticipants(0);
      setVoiceCallState("idle");
    },
    [removePeerConnection, socketRef, stopLocalStream]
  );

  const onStartVoiceCall = useCallback(async () => {
    const socket = socketRef.current;
    if (!auth || !activeChannelId || !socket) {
      setMessage("Voicechat ist gerade nicht verfügbar.");
      return;
    }
    if (!voiceSupported) {
      setMessage("Dein Browser unterstützt Voicechat nicht.");
      return;
    }

    try {
      setVoiceCallState("connecting");
      await ensureLocalStream();
      participantsRef.current = new Set([auth.user.id]);
      setVoiceParticipants(1);
      activeVoiceRoomRef.current = activeChannelId;
      socket.emit(REALTIME_EVENTS.VC_JOIN, { roomId: activeChannelId });
      setMessage("Voicechat verbunden.");
    } catch (error) {
      setVoiceCallState("idle");
      setMessage(error instanceof Error ? error.message : "Mikrofonzugriff fehlgeschlagen.");
    }
  }, [activeChannelId, auth, ensureLocalStream, setMessage, socketRef, voiceSupported]);

  const onLeaveVoiceCall = useCallback(() => {
    leaveVoiceCall({ emitLeave: true });
    setMessage("Voicechat verlassen.");
  }, [leaveVoiceCall, setMessage]);

  const onToggleVoiceMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    const nextMuted = !isVoiceMuted;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !nextMuted;
    }
    setIsVoiceMuted(nextMuted);
  }, [isVoiceMuted]);

  useEffect(() => {
    if (!auth || !activeChannelId) {
      leaveVoiceCall({ emitLeave: false });
      return;
    }

    if (activeVoiceRoomRef.current && activeVoiceRoomRef.current !== activeChannelId) {
      leaveVoiceCall({ emitLeave: true });
      setMessage("Voicechat wurde beim Kanalwechsel beendet.");
    }
  }, [activeChannelId, auth, leaveVoiceCall, setMessage]);

  useEffect(() => {
    if (!auth || realtimeState === "offline") {
      leaveVoiceCall({ emitLeave: false });
      boundSocketRef.current = null;
      return;
    }

    const socket = socketRef.current;
    if (!socket || boundSocketRef.current === socket) {
      return;
    }

    const onParticipants = async (payload: { roomId: string; userIds: string[] }) => {
      if (!auth?.user.id || payload.roomId !== activeVoiceRoomRef.current) {
        return;
      }

      participantsRef.current = new Set(payload.userIds);
      participantsRef.current.add(auth.user.id);
      syncParticipantState();

      for (const userId of participantsRef.current) {
        if (userId === auth.user.id) {
          continue;
        }
        try {
          await createOfferForUser(userId, payload.roomId, socket);
        } catch {
          setMessage("Voicechat-Verbindung wird aufgebaut …");
        }
      }

      for (const remoteUserId of Array.from(peerConnectionsRef.current.keys())) {
        if (!participantsRef.current.has(remoteUserId)) {
          removePeerConnection(remoteUserId);
        }
      }
    };

    const onParticipantJoined = async (payload: { roomId: string; userId: string }) => {
      if (!auth?.user.id || payload.roomId !== activeVoiceRoomRef.current || payload.userId === auth.user.id) {
        return;
      }
      participantsRef.current.add(payload.userId);
      syncParticipantState();
      try {
        await createOfferForUser(payload.userId, payload.roomId, socket);
      } catch {
        setMessage("Voicechat-Verbindung wird aufgebaut …");
      }
    };

    const onParticipantLeft = (payload: { roomId: string; userId: string }) => {
      if (payload.roomId !== activeVoiceRoomRef.current) {
        return;
      }
      participantsRef.current.delete(payload.userId);
      removePeerConnection(payload.userId);
      syncParticipantState();
    };

    const onVoiceOffer = async (payload: { roomId: string; fromUserId: string; targetUserId: string; sdp: string }) => {
      if (!auth?.user.id || payload.targetUserId !== auth.user.id || payload.roomId !== activeVoiceRoomRef.current) {
        return;
      }
      const connection = await createPeerConnection(payload.fromUserId, payload.roomId, socket);
      await connection.setRemoteDescription({ type: "offer", sdp: payload.sdp });
      const answer = await connection.createAnswer();
      if (!answer.sdp) {
        return;
      }
      await connection.setLocalDescription(answer);
      socket.emit(REALTIME_EVENTS.VC_ANSWER, {
        roomId: payload.roomId,
        targetUserId: payload.fromUserId,
        sdp: answer.sdp
      });
      participantsRef.current.add(payload.fromUserId);
      syncParticipantState();
    };

    const onVoiceAnswer = async (payload: { roomId: string; fromUserId: string; targetUserId: string; sdp: string }) => {
      if (!auth?.user.id || payload.targetUserId !== auth.user.id || payload.roomId !== activeVoiceRoomRef.current) {
        return;
      }
      const connection = peerConnectionsRef.current.get(payload.fromUserId);
      if (!connection) {
        return;
      }
      await connection.setRemoteDescription({ type: "answer", sdp: payload.sdp });
      participantsRef.current.add(payload.fromUserId);
      syncParticipantState();
    };

    const onVoiceIceCandidate = async (payload: {
      roomId: string;
      fromUserId: string;
      targetUserId: string;
      candidate: {
        candidate: string;
        sdpMid?: string | null;
        sdpMLineIndex?: number | null;
        usernameFragment?: string | null;
      };
    }) => {
      if (!auth?.user.id || payload.targetUserId !== auth.user.id || payload.roomId !== activeVoiceRoomRef.current) {
        return;
      }
      const connection = peerConnectionsRef.current.get(payload.fromUserId);
      if (!connection) {
        return;
      }
      await connection.addIceCandidate(payload.candidate);
    };

    const onVoiceEnded = (payload: { roomId: string; endedByUserId: string }) => {
      if (payload.roomId !== activeVoiceRoomRef.current) {
        return;
      }
      leaveVoiceCall({ emitLeave: false });
      setMessage(payload.endedByUserId === auth?.user.id ? "Voicechat beendet." : "Voicechat wurde beendet.");
    };

    socket.on(REALTIME_EVENTS.VC_PARTICIPANTS, onParticipants);
    socket.on(REALTIME_EVENTS.VC_PARTICIPANT_JOINED, onParticipantJoined);
    socket.on(REALTIME_EVENTS.VC_PARTICIPANT_LEFT, onParticipantLeft);
    socket.on(REALTIME_EVENTS.VC_OFFER, onVoiceOffer);
    socket.on(REALTIME_EVENTS.VC_ANSWER, onVoiceAnswer);
    socket.on(REALTIME_EVENTS.VC_ICE_CANDIDATE, onVoiceIceCandidate);
    socket.on(REALTIME_EVENTS.VC_ENDED, onVoiceEnded);

    boundSocketRef.current = socket;

    return () => {
      socket.off(REALTIME_EVENTS.VC_PARTICIPANTS, onParticipants);
      socket.off(REALTIME_EVENTS.VC_PARTICIPANT_JOINED, onParticipantJoined);
      socket.off(REALTIME_EVENTS.VC_PARTICIPANT_LEFT, onParticipantLeft);
      socket.off(REALTIME_EVENTS.VC_OFFER, onVoiceOffer);
      socket.off(REALTIME_EVENTS.VC_ANSWER, onVoiceAnswer);
      socket.off(REALTIME_EVENTS.VC_ICE_CANDIDATE, onVoiceIceCandidate);
      socket.off(REALTIME_EVENTS.VC_ENDED, onVoiceEnded);
      if (boundSocketRef.current === socket) {
        boundSocketRef.current = null;
      }
    };
  }, [
    activeChannelId,
    auth,
    createOfferForUser,
    createPeerConnection,
    leaveVoiceCall,
    realtimeState,
    removePeerConnection,
    setMessage,
    socketRef,
    syncParticipantState
  ]);

  useEffect(
    () => () => {
      leaveVoiceCall({ emitLeave: false });
    },
    [leaveVoiceCall]
  );

  return {
    voiceSupported,
    voiceCallState,
    voiceParticipants,
    isVoiceMuted,
    onStartVoiceCall,
    onLeaveVoiceCall,
    onToggleVoiceMute
  };
}
