import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { AuthResponse } from "@chatnet/shared";
import {
  addGroupMemberByUsername,
  blockUser,
  createDirectByUsername,
  createGroupChannel,
  deleteGroupChannel,
  deleteMessage,
  leaveChannel,
  listChannelMembers,
  listChannels,
  searchMessages,
  sendMessage,
  setPlatformUploadsEnabled,
  transferChannelOwnership,
  removeChannelMember,
  updateChannelMemberRole,
  updateMessage,
  updateProfile,
  uploadFile,
  type ChannelItem,
  type ChannelMemberItem,
  type MessageItem
} from "../lib/api";

type UseChatActionsParams = {
  auth: AuthResponse | null;
  activeChannelId: string | null;
  activeChannel: ChannelItem | null;
  ownMembershipRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  canModerateMembers: boolean;
  canManageRoles: boolean;
  canManagePlatformSettings: boolean;
  openChannel: (channelId: string) => void;
  setMessage: Dispatch<SetStateAction<string>>;
  setChannels: Dispatch<SetStateAction<ChannelItem[]>>;
  setMessages: Dispatch<SetStateAction<MessageItem[]>>;
  setEditingMessageId: Dispatch<SetStateAction<string | null>>;
  setEditingContent: Dispatch<SetStateAction<string>>;
  setComposerText: Dispatch<SetStateAction<string>>;
  setReplyingToMessageId: Dispatch<SetStateAction<string | null>>;
  setSearchResults: Dispatch<SetStateAction<MessageItem[]>>;
  setDirectUsername: Dispatch<SetStateAction<string>>;
  setDirectModalOpen: Dispatch<SetStateAction<boolean>>;
  setAddMemberUsername: Dispatch<SetStateAction<string>>;
  setAddMemberModalOpen: Dispatch<SetStateAction<boolean>>;
  setChannelMembers: Dispatch<SetStateAction<ChannelMemberItem[]>>;
  setActiveChannelId: Dispatch<SetStateAction<string | null>>;
  setNewChannelName: Dispatch<SetStateAction<string>>;
  setCreateChannelModalOpen: Dispatch<SetStateAction<boolean>>;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setUploadsEnabledForAll: Dispatch<SetStateAction<boolean>>;
  setPlatformToggleLoading: Dispatch<SetStateAction<boolean>>;
  setAuth: Dispatch<SetStateAction<AuthResponse | null>>;
  searchQuery: string;
  composerText: string;
  replyingToMessageId: string | null;
  editingContent: string;
  newChannelName: string;
  directUsername: string;
  addMemberUsername: string;
  profileNickname: string;
  profileUsername: string;
  uploadsEnabledForAll: boolean;
};

export function useChatActions({
  auth,
  activeChannelId,
  activeChannel,
  ownMembershipRole,
  canModerateMembers,
  canManageRoles,
  canManagePlatformSettings,
  openChannel,
  setMessage,
  setChannels,
  setMessages,
  setEditingMessageId,
  setEditingContent,
  setComposerText,
  setReplyingToMessageId,
  setSearchResults,
  setDirectUsername,
  setDirectModalOpen,
  setAddMemberUsername,
  setAddMemberModalOpen,
  setChannelMembers,
  setActiveChannelId,
  setNewChannelName,
  setCreateChannelModalOpen,
  setSettingsOpen,
  setUploadsEnabledForAll,
  setPlatformToggleLoading,
  setAuth,
  searchQuery,
  composerText,
  replyingToMessageId,
  editingContent,
  newChannelName,
  directUsername,
  addMemberUsername,
  profileNickname,
  profileUsername,
  uploadsEnabledForAll
}: UseChatActionsParams) {
  const onToggleGlobalUploads = async (enabled: boolean) => {
    if (!auth || !canManagePlatformSettings) {
      return;
    }
    setPlatformToggleLoading(true);
    try {
      await setPlatformUploadsEnabled(auth.tokens.accessToken, enabled);
      setUploadsEnabledForAll(enabled);
      setMessage(enabled ? "Datei-Uploads wurden für alle aktiviert." : "Datei-Uploads wurden für alle deaktiviert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload-Einstellung konnte nicht geändert werden");
    } finally {
      setPlatformToggleLoading(false);
    }
  };

  const onCreateChannel = async () => {
    if (!auth || !newChannelName.trim()) {
      return;
    }

    try {
      const channel = await createGroupChannel(auth.tokens.accessToken, newChannelName.trim(), []);
      setChannels((previous) => [channel, ...previous]);
      openChannel(channel.id);
      setNewChannelName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Channel konnte nicht erstellt werden");
    }
  };

  const onCreateChannelFromModal = async () => {
    if (!auth || !newChannelName.trim()) {
      return;
    }
    await onCreateChannel();
    setCreateChannelModalOpen(false);
  };

  const onSendMessage = async () => {
    if (!auth || !activeChannelId || !composerText.trim()) {
      return;
    }

    try {
      await sendMessage(auth.tokens.accessToken, activeChannelId, composerText.trim(), replyingToMessageId ?? undefined);
      setComposerText("");
      setReplyingToMessageId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden");
    }
  };

  const onSearch = async () => {
    if (!auth || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchMessages(auth.tokens.accessToken, searchQuery.trim(), activeChannelId ?? undefined);
      setSearchResults(results);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suche fehlgeschlagen");
    }
  };

  const onBlockSender = async (senderId: string) => {
    if (!auth) {
      return;
    }
    try {
      await blockUser(auth.tokens.accessToken, senderId);
      setMessage("User wurde blockiert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Blockieren fehlgeschlagen");
    }
  };

  const onEditMessage = (entry: MessageItem) => {
    setEditingMessageId(entry.id);
    setEditingContent(entry.content);
  };

  const onSaveEdit = async (messageId: string) => {
    if (!auth || !activeChannelId || !editingContent.trim()) {
      return;
    }

    try {
      await updateMessage(auth.tokens.accessToken, activeChannelId, messageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bearbeiten fehlgeschlagen");
    }
  };

  const onDeleteMessage = async (messageId: string) => {
    if (!auth || !activeChannelId) {
      return;
    }
    try {
      await deleteMessage(auth.tokens.accessToken, activeChannelId, messageId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Löschen fehlgeschlagen");
    }
  };

  const onUploadSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!auth) {
      return;
    }
    if (!uploadsEnabledForAll) {
      setMessage("Datei-Uploads sind aktuell vom Owner deaktiviert.");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const uploaded = await uploadFile(auth.tokens.accessToken, file);
      setComposerText((previous) => `${previous}${previous ? "\n" : ""}${uploaded.url}`);
      event.target.value = "";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload fehlgeschlagen");
    }
  };

  const onStartDirectByUsername = async () => {
    if (!auth || !directUsername.trim()) {
      return;
    }

    try {
      const channel = await createDirectByUsername(auth.tokens.accessToken, directUsername.trim());
      setChannels((previous) => {
        if (previous.some((entry) => entry.id === channel.id)) {
          return previous;
        }
        return [channel, ...previous];
      });
      openChannel(channel.id);
      setDirectUsername("");
      setDirectModalOpen(false);
      setMessage("Direktchat wurde erstellt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Direktchat konnte nicht erstellt werden");
    }
  };

  const onAddMemberByUsername = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP" || !addMemberUsername.trim()) {
      return;
    }

    try {
      await addGroupMemberByUsername(auth.tokens.accessToken, activeChannelId, addMemberUsername.trim());
      setAddMemberUsername("");
      setAddMemberModalOpen(false);
      setMessage("Person wurde zur Gruppe hinzugefügt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Person konnte nicht hinzugefügt werden");
    }
  };

  const refreshChannelList = async (preferredChannelId?: string | null) => {
    if (!auth) {
      return;
    }
    const list = await listChannels(auth.tokens.accessToken);
    setChannels(list);
    setActiveChannelId((current) => {
      if (preferredChannelId === null) {
        return list[0]?.id ?? null;
      }
      const desired = preferredChannelId ?? current;
      if (desired && list.some((entry) => entry.id === desired)) {
        return desired;
      }
      return list[0]?.id ?? null;
    });
  };

  const onToggleMemberRole = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canManageRoles) {
      return;
    }

    const nextRole = member.role === "ADMIN" ? "member" : "admin";
    try {
      const updated = await updateChannelMemberRole(auth.tokens.accessToken, activeChannelId, member.userId, nextRole);
      setChannelMembers((previous) =>
        previous.map((entry) => (entry.userId === member.userId ? { ...entry, role: updated.role } : entry))
      );
      setMessage(`Rolle von @${member.user.username} wurde aktualisiert.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rolle konnte nicht geändert werden");
    }
  };

  const onRemoveMember = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canModerateMembers) {
      return;
    }

    try {
      await removeChannelMember(auth.tokens.accessToken, activeChannelId, member.userId);
      setChannelMembers((previous) => previous.filter((entry) => entry.userId !== member.userId));
      setMessage(`@${member.user.username} wurde entfernt.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mitglied konnte nicht entfernt werden");
    }
  };

  const onTransferOwnership = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canManageRoles) {
      return;
    }

    try {
      await transferChannelOwnership(auth.tokens.accessToken, activeChannelId, member.userId);
      const members = await listChannelMembers(auth.tokens.accessToken, activeChannelId);
      setChannelMembers(members);
      await refreshChannelList(activeChannelId);
      setMessage(`Owner wurde an @${member.user.username} übertragen.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Owner konnte nicht übertragen werden");
    }
  };

  const onLeaveGroup = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP") {
      return;
    }

    try {
      await leaveChannel(auth.tokens.accessToken, activeChannelId);
      setChannelMembers([]);
      await refreshChannelList(null);
      setMessage("Du hast die Gruppe verlassen.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gruppe konnte nicht verlassen werden");
    }
  };

  const onDeleteGroup = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP" || ownMembershipRole !== "OWNER") {
      return;
    }

    const confirmed = window.confirm(`Willst du die Gruppe \"${activeChannel.name ?? "Unbenannt"}\" wirklich löschen?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteGroupChannel(auth.tokens.accessToken, activeChannelId);
      setChannelMembers([]);
      await refreshChannelList(null);
      setMessage("Gruppe wurde gelöscht.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gruppe konnte nicht gelöscht werden");
    }
  };

  const onSaveProfile = async () => {
    if (!auth) {
      return;
    }

    try {
      const profile = await updateProfile(auth.tokens.accessToken, {
        displayName: profileNickname,
        username: profileUsername
      });
      setAuth((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                ...profile,
                avatarUrl: profile.avatarUrl ?? undefined
              }
            }
          : current
      );
      setMessage("Profil gespeichert.");
      setSettingsOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden");
    }
  };

  return {
    onToggleGlobalUploads,
    onCreateChannel,
    onCreateChannelFromModal,
    onSendMessage,
    onSearch,
    onBlockSender,
    onEditMessage,
    onSaveEdit,
    onDeleteMessage,
    onUploadSelected,
    onStartDirectByUsername,
    onAddMemberByUsername,
    onToggleMemberRole,
    onRemoveMember,
    onTransferOwnership,
    onLeaveGroup,
    onDeleteGroup,
    onSaveProfile
  };
}
