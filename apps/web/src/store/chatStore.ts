import { create } from "zustand";
import type { ChannelItem, ChannelMemberItem, MessageItem, PollItem } from "@chatnet/shared";

export type RealtimeState = "connecting" | "online" | "offline";

interface ChatState {
  // Channels
  channels: ChannelItem[];
  activeChannelId: string | null;
  channelMembers: ChannelMemberItem[];
  unreadByChannelId: Record<string, number>;

  // Messages
  messages: MessageItem[];
  searchResults: MessageItem[];
  searchQuery: string;

  // Polls
  polls: PollItem[];

  // Presence & realtime
  presenceMap: Record<string, boolean>;
  realtimeState: RealtimeState;
  typingHint: string;
  mentionNotice: string;

  // UI state
  replyingToMessageId: string | null;
  editingMessageId: string | null;
  editingContent: string;
  composerText: string;
  activeMessageId: string | null;

  // Modals
  createChannelModalOpen: boolean;
  directModalOpen: boolean;
  addMemberModalOpen: boolean;
  settingsOpen: boolean;
  settingsTab: "profile" | "owner";
  pollModalOpen: boolean;

  // Form fields (modals)
  newChannelName: string;
  directUsername: string;
  addMemberUsername: string;

  // Profile
  profileNickname: string;
  profileUsername: string;

  // Platform
  uploadsEnabledForAll: boolean;
  canManagePlatformSettings: boolean;
  platformToggleLoading: boolean;

  // Feedback
  message: string;

  // Setters
  setChannels: (channels: ChannelItem[]) => void;
  setActiveChannelId: (id: string | null) => void;
  setChannelMembers: (members: ChannelMemberItem[]) => void;
  setUnreadByChannelId: (map: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setMessages: (messages: MessageItem[] | ((prev: MessageItem[]) => MessageItem[])) => void;
  setSearchResults: (results: MessageItem[]) => void;
  setSearchQuery: (q: string) => void;
  setPolls: (polls: PollItem[] | ((prev: PollItem[]) => PollItem[])) => void;
  setPresenceMap: (map: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setRealtimeState: (state: RealtimeState) => void;
  setTypingHint: (hint: string) => void;
  setMentionNotice: (notice: string) => void;
  setReplyingToMessageId: (id: string | null) => void;
  setEditingMessageId: (id: string | null) => void;
  setEditingContent: (content: string) => void;
  setComposerText: (text: string) => void;
  setActiveMessageId: (id: string | null) => void;
  setCreateChannelModalOpen: (open: boolean) => void;
  setDirectModalOpen: (open: boolean) => void;
  setAddMemberModalOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: "profile" | "owner") => void;
  setPollModalOpen: (open: boolean) => void;
  setNewChannelName: (name: string) => void;
  setDirectUsername: (name: string) => void;
  setAddMemberUsername: (name: string) => void;
  setProfileNickname: (name: string) => void;
  setProfileUsername: (name: string) => void;
  setUploadsEnabledForAll: (enabled: boolean) => void;
  setCanManagePlatformSettings: (can: boolean) => void;
  setPlatformToggleLoading: (loading: boolean) => void;
  setMessage: (msg: string) => void;
  resetChat: () => void;
}

const initialState = {
  channels: [],
  activeChannelId: null,
  channelMembers: [],
  unreadByChannelId: {},
  messages: [],
  searchResults: [],
  searchQuery: "",
  polls: [],
  presenceMap: {},
  realtimeState: "offline" as RealtimeState,
  typingHint: "",
  mentionNotice: "",
  replyingToMessageId: null,
  editingMessageId: null,
  editingContent: "",
  composerText: "",
  activeMessageId: null,
  createChannelModalOpen: false,
  directModalOpen: false,
  addMemberModalOpen: false,
  settingsOpen: false,
  settingsTab: "profile" as const,
  pollModalOpen: false,
  newChannelName: "",
  directUsername: "",
  addMemberUsername: "",
  profileNickname: "",
  profileUsername: "",
  uploadsEnabledForAll: true,
  canManagePlatformSettings: false,
  platformToggleLoading: false,
  message: "",
};

export const useChatStore = create<ChatState>()((set) => ({
  ...initialState,

  setChannels: (channels) => set({ channels }),
  setActiveChannelId: (id) => set({ activeChannelId: id }),
  setChannelMembers: (members) => set({ channelMembers: members }),
  setUnreadByChannelId: (map) =>
    set((state) => ({
      unreadByChannelId: typeof map === "function" ? map(state.unreadByChannelId) : map,
    })),
  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === "function" ? messages(state.messages) : messages,
    })),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setPolls: (polls) =>
    set((state) => ({
      polls: typeof polls === "function" ? polls(state.polls) : polls,
    })),
  setPresenceMap: (map) =>
    set((state) => ({
      presenceMap: typeof map === "function" ? map(state.presenceMap) : map,
    })),
  setRealtimeState: (realtimeState) => set({ realtimeState }),
  setTypingHint: (hint) => set({ typingHint: hint }),
  setMentionNotice: (notice) => set({ mentionNotice: notice }),
  setReplyingToMessageId: (id) => set({ replyingToMessageId: id }),
  setEditingMessageId: (id) => set({ editingMessageId: id }),
  setEditingContent: (content) => set({ editingContent: content }),
  setComposerText: (text) => set({ composerText: text }),
  setActiveMessageId: (id) => set({ activeMessageId: id }),
  setCreateChannelModalOpen: (open) => set({ createChannelModalOpen: open }),
  setDirectModalOpen: (open) => set({ directModalOpen: open }),
  setAddMemberModalOpen: (open) => set({ addMemberModalOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  setPollModalOpen: (open) => set({ pollModalOpen: open }),
  setNewChannelName: (name) => set({ newChannelName: name }),
  setDirectUsername: (name) => set({ directUsername: name }),
  setAddMemberUsername: (name) => set({ addMemberUsername: name }),
  setProfileNickname: (name) => set({ profileNickname: name }),
  setProfileUsername: (name) => set({ profileUsername: name }),
  setUploadsEnabledForAll: (enabled) => set({ uploadsEnabledForAll: enabled }),
  setCanManagePlatformSettings: (can) => set({ canManagePlatformSettings: can }),
  setPlatformToggleLoading: (loading) => set({ platformToggleLoading: loading }),
  setMessage: (msg) => set({ message: msg }),
  resetChat: () => set(initialState),
}));
