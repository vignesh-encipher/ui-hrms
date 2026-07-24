"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RootState, store } from "@/store";
import API from "@/services/api";
import { getStorage, setStorage } from "@/utils/storages";
import { chatSocket } from "@/lib/chatSocket";
import {
  setUsers as setUsersAction,
  setChannels as setChannelsAction,
  setConversations as setConversationsAction,
  setActiveConversation as setActiveConversationAction,
  clearActiveConversation,
  setTypingUsers as setTypingUsersAction,
  setOnlineStatuses as setOnlineStatusesAction,
  setNotificationSettings as setNotificationSettingsAction,
} from "@/store/chatSlice";
import { ChatUser, ChatChannel, MessageType } from "./types";
import { formatBytes } from "./chatUtils";
import MessageItem from "./MessageItem";
import {
  Layout,
  Input,
  Button,
  Avatar,
  List,
  Badge,
  Tooltip,
  Tabs,
  Modal,
  Form,
  Radio,
  Drawer,
  Space,
  Popover,
  Spin,
  Progress,
  Upload,
  message,
  Tag,
  Select,
  Dropdown,
  Switch,
} from "antd";
import {
  FiSearch,
  FiPlus,
  FiSend,
  FiSmile,
  FiPaperclip,
  FiMic,
  FiMoreVertical,
  FiPhone,
  FiVideo,
  FiInfo,
  FiUser,
  FiUsers,
  FiStar,
  FiCornerUpLeft,
  FiTrash2,
  FiEdit3,
  FiArrowRight,
  FiCopy,
  FiCheck,
  FiCheckCircle,
  FiFile,
  FiPlay,
  FiDownload,
  FiX,
  FiSquare,
  FiLogOut,
  FiVolume2,
  FiVolumeX,
  FiSettings,
} from "react-icons/fi";
import { MdPushPin } from "react-icons/md";

const { Sider } = Layout;
const { Option } = Select;

// Define interfaces
interface NotificationSettings {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  mutedAll: boolean;
  mutedConversations: string[];
  playSoundForActiveConversation: boolean;
}

export default function ChatPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    id: reduxUserId,
    username: currentUserName,
  } = useSelector((state: RootState) => state.auth);
  const currentUserId =
    reduxUserId ||
    (typeof window !== "undefined" ? getStorage("userId") : null);

  // Global chat state (shared app-wide, owned by the global socket/provider)
  const {
    users,
    channels,
    conversations,
    activeConversation,
    typingUsers,
    onlineStatuses,
    notificationSettings,
  } = useSelector((state: RootState) => state.chat) as {
    users: ChatUser[];
    channels: ChatChannel[];
    conversations: any[];
    activeConversation: {
      id: string;
      type: "dm" | "channel";
      name: string;
      avatar?: string;
      status?: string;
    } | null;
    typingUsers: { [convId: string]: string[] };
    onlineStatuses: { [userId: string]: string };
    notificationSettings: NotificationSettings;
  };

  // useState-shaped wrappers over the global slice so the rest of this file
  // (written against local setState calls) doesn't need to change call sites.
  const setUsers = (value: ChatUser[] | ((prev: ChatUser[]) => ChatUser[])) => {
    const next = typeof value === "function" ? (value as any)(store.getState().chat.users) : value;
    dispatch(setUsersAction(next));
  };
  const setChannels = (value: ChatChannel[] | ((prev: ChatChannel[]) => ChatChannel[])) => {
    const next = typeof value === "function" ? (value as any)(store.getState().chat.channels) : value;
    dispatch(setChannelsAction(next));
  };
  const setConversations = (value: any[] | ((prev: any[]) => any[])) => {
    const next = typeof value === "function" ? (value as any)(store.getState().chat.conversations) : value;
    dispatch(setConversationsAction(next));
  };
  const setActiveConversation = (
    value:
      | { id: string; type: "dm" | "channel"; name: string; avatar?: string; status?: string }
      | null
      | ((prev: typeof activeConversation) => typeof activeConversation)
  ) => {
    const prev = store.getState().chat.activeConversation;
    const next = typeof value === "function" ? (value as any)(prev) : value;
    if (next === null) dispatch(clearActiveConversation());
    else dispatch(setActiveConversationAction(next));
  };
  const setTypingUsers = (
    value:
      | { [convId: string]: string[] }
      | ((prev: { [convId: string]: string[] }) => { [convId: string]: string[] })
  ) => {
    const next = typeof value === "function" ? (value as any)(store.getState().chat.typingUsers) : value;
    dispatch(setTypingUsersAction(next));
  };
  const setOnlineStatuses = (
    value:
      | { [userId: string]: string }
      | ((prev: { [userId: string]: string }) => { [userId: string]: string })
  ) => {
    const next = typeof value === "function" ? (value as any)(store.getState().chat.onlineStatuses) : value;
    dispatch(setOnlineStatusesAction(next));
  };
  const saveNotificationSettings = (settings: NotificationSettings) => {
    dispatch(setNotificationSettingsAction(settings));
    if (currentUserId) {
      setStorage(`chat_settings_${currentUserId}`, JSON.stringify(settings));
    }
  };

  // States
  const [activeTab, setActiveTab] = useState<string>("all"); // all, direct, channels, starred, archived

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [messageSearchQuery, setMessageSearchQuery] = useState<string>("");
  const [isSearchingInChat, setIsSearchingInChat] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");

  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState<boolean>(false);
  const [newChatSearch, setNewChatSearch] = useState<string>("");

  // Modals & Drawers
  const [isChannelModalVisible, setIsChannelModalVisible] =
    useState<boolean>(false);
  const [isEditChannelModalVisible, setIsEditChannelModalVisible] =
    useState<boolean>(false);
  const [channelForm] = Form.useForm();
  const [editChannelForm] = Form.useForm();
  const [isInfoDrawerVisible, setIsInfoDrawerVisible] =
    useState<boolean>(false);
  const [selectedUserForProfile, setSelectedUserForProfile] =
    useState<ChatUser | null>(null);
  const [sharedAttachments, setSharedAttachments] = useState<MessageType[]>([]);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [membersToAdd, setMembersToAdd] = useState<string[]>([]);

  // Message modifications
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageType | null>(
    null,
  );

  // File Upload states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string>("");

  // Audio Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordTime, setRecordTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // Image zoom modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Notification settings: sourced from global state (loaded/persisted by GlobalChatProvider on login)
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState<boolean>(false);

  // Virtualized message list plumbing
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isPrependingRef = useRef(false);
  const anchorMessageIdRef = useRef<string | null>(null);
  const hasScrolledInitiallyRef = useRef(false);
  const prevMessageCountRef = useRef(0);

  // Load baseline data (also loaded globally on login; this covers manual refresh / direct navigation)
  useEffect(() => {
    fetchUsers();
    fetchConversations();
    fetchChannels();
  }, []);

  // Reset the "have we done the initial scroll yet" bookkeeping whenever the open
  // conversation changes, so each conversation gets its own unread-anchor/bottom-scroll.
  useEffect(() => {
    hasScrolledInitiallyRef.current = false;
    prevMessageCountRef.current = 0;
  }, [activeConversation?.id]);

  // Load messages when conversation changes. The unread boundary/firstUnreadMessageId
  // returned by fetchMessages reflects the read cursor as of the GET - only mark the
  // conversation read *after* that response lands, otherwise a fast-resolving read POST
  // could advance the cursor before we compute where the unread divider goes.
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation.id).then(() => {
      API.post(`/chat/conversations/${activeConversation.id}/read`).catch(() => {});
    });
    fetchSharedAttachments(activeConversation.id);

    // Clear typing indicators for this channel
    setTypingUsers((prev) => {
      const copy = { ...prev };
      delete copy[activeConversation.id];
      return copy;
    });
  }, [activeConversation]);

  // Fetch channel members when info drawer is opened
  useEffect(() => {
    if (isInfoDrawerVisible && activeConversation?.type === "channel") {
      fetchChannelMembers(activeConversation.id);
    }
  }, [isInfoDrawerVisible, activeConversation]);

  // Fetch functions
  const fetchUsers = async () => {
    try {
      const res = await API.get("/chat/users");
      setUsers(res.data);
      const statusMap: { [userId: string]: string } = {};
      res.data.forEach((u: ChatUser) => {
        statusMap[u.id] = u.status || "offline";
      });
      setOnlineStatuses(statusMap);
    } catch (err) {
      message.error("Failed to load employee list");
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await API.get("/chat/channels");
      setChannels(res.data);
    } catch (err) {
      message.error("Failed to load channels");
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await API.get("/chat/conversations");
      setConversations(res.data || []);
    } catch (err) {
      console.error("Failed to load active conversations", err);
    }
  };

  const fetchChannelMembers = async (channelId: string) => {
    try {
      const res = await API.get(`/chat/channels/${channelId}/members`);
      setChannelMembers(res.data);
    } catch (err) {
      message.error("Failed to load channel members");
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await API.get(`/chat/messages/${convId}`);
      const { messages: msgs, oldestCursor: cursor, hasMoreOlder: more, firstUnreadMessageId: firstUnread } = res.data;
      setMessages(msgs || []);
      setOldestCursor(cursor);
      setHasMoreOlder(!!more);
      setFirstUnreadMessageId(firstUnread || null);
    } catch (err) {
      message.error("Failed to load message history");
    }
  };

  const loadOlderMessages = async () => {
    if (!activeConversation || isLoadingOlder || !hasMoreOlder || !oldestCursor) return;
    setIsLoadingOlder(true);
    anchorMessageIdRef.current = messages[0]?.id || null;
    try {
      const res = await API.get(`/chat/messages/${activeConversation.id}`, {
        params: { before: oldestCursor },
      });
      const { messages: older, oldestCursor: newCursor, hasMoreOlder: more } = res.data;
      if (older && older.length > 0) {
        isPrependingRef.current = true;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const deduped = older.filter((m: MessageType) => !existingIds.has(m.id));
          return [...deduped, ...prev];
        });
      }
      setOldestCursor(newCursor);
      setHasMoreOlder(!!more);
    } catch (err) {
      message.error("Failed to load older messages");
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const fetchSharedAttachments = async (convId: string) => {
    try {
      const res = await API.get(`/chat/attachments/${convId}`);
      setSharedAttachments(res.data);
    } catch (err) {
      // Ignore
    }
  };

  // Global unread counts, presence, typing, and channel-list refresh are handled
  // by chatSocket.ts / the chat Redux slice regardless of whether this page is
  // mounted. Here we only patch the locally-loaded message list for the
  // conversation that's currently open.
  useEffect(() => {
    const unsubscribe = chatSocket.subscribe((event: any) => {
      if (!activeConversation) return;
      switch (event.type) {
        case "CHAT_MESSAGE": {
          const newMsg: MessageType = event.message;
          if (newMsg.conversationId !== activeConversation.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          break;
        }

        case "CONVERSATION_READ": {
          const { conversationId: readConvId, readerId } = event;
          if (readConvId !== activeConversation.id) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.senderId !== readerId && (!m.readBy || !m.readBy.includes(readerId))) {
                return { ...m, readBy: [...(m.readBy || []), readerId] };
              }
              return m;
            })
          );
          break;
        }

        case "READ_RECEIPT": {
          const { messageId } = event;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === messageId || m.createdAt <= event.timestamp) {
                if (!m.readBy.includes(event.readerId)) {
                  return { ...m, readBy: [...m.readBy, event.readerId] };
                }
              }
              return m;
            }),
          );
          break;
        }

        case "MESSAGE_EDITED": {
          const editedMsg: MessageType = event.message;
          setMessages((prev) =>
            prev.map((m) => (m.id === editedMsg.id ? editedMsg : m)),
          );
          break;
        }

        case "MESSAGE_DELETED": {
          const { messageId: delId } = event;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === delId
                ? {
                    ...m,
                    deleted: true,
                    message: "This message was deleted",
                    attachmentUrl: undefined,
                  }
                : m,
            ),
          );
          break;
        }

        case "MESSAGE_PINNED_TOGGLE": {
          const pinnedMsg: MessageType = event.message;
          setMessages((prev) =>
            prev.map((m) => (m.id === pinnedMsg.id ? pinnedMsg : m)),
          );
          break;
        }

        case "MESSAGE_REACTION": {
          const reactedMsg: MessageType = event.message;
          setMessages((prev) =>
            prev.map((m) => (m.id === reactedMsg.id ? reactedMsg : m)),
          );
          break;
        }

        default:
          break;
      }
    });
    return unsubscribe;
  }, [activeConversation?.id]);

  // REST API Actions
  const handleSendMessage = async () => {
    if (!inputText.trim() && !replyingTo) return;
    if (!activeConversation) return;

    const payload: Partial<MessageType> = {
      conversationId: activeConversation.id,
      message: inputText,
      messageType: "TEXT",
      replyTo: replyingTo ? replyingTo.id : undefined,
    };

    try {
      setInputText("");
      setReplyingTo(null);
      const res = await API.post("/chat/messages", payload, { skipSuccessNotification: true });
      const savedMsg = res.data;
      setMessages((prev) => {
        if (prev.some((m) => m.id === savedMsg.id)) return prev;
        return [...prev, savedMsg];
      });
      fetchConversations();
    } catch (err) {
      message.error("Failed to send message");
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !inputText.trim()) return;
    try {
      await API.put(`/chat/messages/${editingMessage.id}`, {
        message: inputText,
      });
      setEditingMessage(null);
      setInputText("");
    } catch (err) {
      message.error("Failed to edit message");
    }
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (!activeConversation) return;
    chatSocket.send({
      type: "TYPING",
      conversationId: activeConversation.id,
      isTyping: isTyping,
    });
  };

  const typingTimeoutRef = useRef<any>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTypingStatus(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  const handleAddReaction = useCallback(async (messageId: string, emoji: string, alreadyReacted: boolean) => {
    try {
      const emojiToSend = alreadyReacted ? "" : emoji;
      await API.post(`/chat/messages/${messageId}/react`, { emoji: emojiToSend });
    } catch (err) {
      message.error("Reaction failed");
    }
  }, []);

  const handleToggleStar = async (messageId: string) => {
    try {
      await API.post(`/chat/messages/${messageId}/star`);
      message.success("Star preference updated");
      fetchMessages(activeConversation!.id);
    } catch (err) {
      message.error("Star failed");
    }
  };

  const handleTogglePin = async (messageId: string) => {
    try {
      await API.post(`/chat/messages/${messageId}/pin`);
      message.success("Pin updated");
    } catch (err) {
      message.error("Pin failed");
    }
  };

  const handleDeleteMessage = useCallback(async (
    messageId: string,
    scope: "me" | "everyone",
  ) => {
    try {
      await API.delete(`/chat/messages/${messageId}`, {
        params: { type: scope },
      });
      message.success("Message deleted");
      if (scope === "me") {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err) {
      message.error("Delete failed");
    }
  }, []);

  const handleEditClick = useCallback((msg: MessageType) => {
    setEditingMessage(msg);
    setInputText(msg.message);
  }, []);

  const handleCreateChannel = async (values: any) => {
    try {
      const res = await API.post("/chat/channels", {
        name: values.name,
        description: values.description,
        type: values.isPrivate ? "PRIVATE" : "PUBLIC",
        initialMembers: values.initialMembers || [],
      });
      message.success("Channel created successfully!");
      setIsChannelModalVisible(false);
      channelForm.resetFields();
      fetchChannels();
      setActiveConversation({
        id: res.data.id,
        type: "channel",
        name: res.data.name,
      });
    } catch (err) {
      message.error("Failed to create channel");
    }
  };

  // Add Members
  const handleAddMembers = async () => {
    if (!membersToAdd || membersToAdd.length === 0 || !activeConversation)
      return;
    try {
      await Promise.all(
        membersToAdd.map((userId) =>
          API.post(`/chat/channels/${activeConversation.id}/members`, {
            userId,
          }),
        ),
      );
      message.success("Members added successfully");
      setMembersToAdd([]);
      fetchChannelMembers(activeConversation.id);
      fetchChannels();
    } catch (err) {
      message.error("Failed to add some members");
      fetchChannelMembers(activeConversation.id);
      fetchChannels();
    }
  };

  // Remove Member
  const handleRemoveMember = async (userId: string) => {
    if (!activeConversation) return;
    try {
      await API.delete(
        `/chat/channels/${activeConversation.id}/members/${userId}`,
      );
      message.success("Member removed");
      fetchChannelMembers(activeConversation.id);
      fetchChannels();
    } catch (err) {
      message.error("Failed to remove member");
    }
  };

  // Leave Channel
  const handleLeaveChannel = async () => {
    if (!activeConversation) return;
    try {
      await API.delete(
        `/chat/channels/${activeConversation.id}/members/${currentUserId}`,
      );
      message.success("You left the channel");
      setIsInfoDrawerVisible(false);
      setActiveConversation(null);
      fetchChannels();
    } catch (err) {
      message.error("Failed to leave channel");
    }
  };

  // Delete Channel
  const handleDeleteChannel = async () => {
    if (!activeConversation) return;
    try {
      await API.delete(`/chat/channels/${activeConversation.id}`);
      message.success("Channel deleted successfully");
      setIsInfoDrawerVisible(false);
      setActiveConversation(null);
      fetchChannels();
    } catch (err) {
      message.error("Failed to delete channel");
    }
  };

  // Edit Channel
  const handleEditChannel = async (values: any) => {
    if (!activeConversation) return;
    try {
      const res = await API.put(`/chat/channels/${activeConversation.id}`, {
        name: values.name,
        description: values.description,
        type: values.isPrivate ? "PRIVATE" : "PUBLIC",
      });
      message.success("Channel updated successfully");
      setIsEditChannelModalVisible(false);
      setActiveConversation((prev) =>
        prev ? { ...prev, name: res.data.name } : null,
      );
      fetchChannels();
    } catch (err) {
      message.error("Failed to update channel");
    }
  };

  // File Upload Helper
  const customFileUpload = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;
    const formData = new FormData();
    formData.append("file", file);
    setUploadingName(file.name);

    try {
      const res = await API.post("/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(percent);
            onProgress({ percent });
          }
        },
      });

      setUploadProgress(null);
      onSuccess(res.data);

      const payload: Partial<MessageType> = {
        conversationId: activeConversation!.id,
        message: `Shared an attachment: ${file.name}`,
        messageType: res.data.messageType,
        attachmentUrl: res.data.attachmentUrl,
        attachmentName: res.data.attachmentName,
        attachmentSize: res.data.attachmentSize,
      };
      await API.post("/chat/messages", payload, { skipSuccessNotification: true });
      message.success(`${file.name} shared successfully`);
    } catch (err) {
      setUploadProgress(null);
      onError(err);
      message.error("File upload failed");
    }
  };

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const file = new File([audioBlob], `voice_${Date.now()}.webm`, {
          type: "audio/webm",
        });

        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await API.post("/chat/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const payload: Partial<MessageType> = {
            conversationId: activeConversation!.id,
            message: "Voice Message",
            messageType: "AUDIO",
            attachmentUrl: res.data.attachmentUrl,
            attachmentName: "Voice message.webm",
            attachmentSize: audioBlob.size,
          };
          await API.post("/chat/messages", payload, { skipSuccessNotification: true });
        } catch (err) {
          message.error("Failed to upload voice message");
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordTime(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      message.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
    setIsRecording(false);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
  };

  const getDMConversationId = (userId: string) => {
    const sorted = [currentUserId, userId].sort();
    return `${sorted[0]}_${sorted[1]}`;
  };

  // Deep-link support: a notification/toast click navigates here as
  // /chat?user=<id> or /chat?channel=<id>. Open the right conversation once
  // users/channels have loaded, then clean up the URL. Guarded by a ref so it
  // only fires once per distinct link (a later channels/users refetch won't
  // re-open a conversation the person has since navigated away from).
  const appliedDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    const userParam = searchParams?.get("user") ?? null;
    const channelParam = searchParams?.get("channel") ?? null;
    const key = userParam ? `user:${userParam}` : channelParam ? `channel:${channelParam}` : null;
    if (!key || appliedDeepLinkRef.current === key) return;

    if (userParam) {
      const target = users.find((u) => u.id === userParam);
      if (!target) return; // retry once `users` finishes loading
      appliedDeepLinkRef.current = key;
      setActiveConversation({
        id: getDMConversationId(userParam),
        type: "dm",
        name: target.name,
        avatar: target.photo,
        status: onlineStatuses[target.id] || target.status,
      });
      router.replace("/chat");
    } else if (channelParam) {
      const channel = channels.find((c) => c.id === channelParam);
      if (!channel) return; // retry once `channels` finishes loading
      appliedDeepLinkRef.current = key;
      setActiveConversation({
        id: channel.id,
        type: "channel",
        name: channel.name,
        avatar: channel.avatar,
      });
      router.replace("/chat");
    }
  }, [searchParams, users, channels]);

  const getMoreOptionsItems = () => {
    if (!activeConversation) return [];
    
    if (activeConversation.type === "channel") {
      const items = [];
      if (isCurrentChannelAdmin) {
        items.push({
          key: "rename",
          label: "Rename Channel",
          icon: <FiEdit3 />,
          onClick: () => {
            editChannelForm.setFieldsValue({
              name: activeConversation.name,
              description: channels.find(c => c.id === activeConversation.id)?.description || "",
              isPrivate: channels.find(c => c.id === activeConversation.id)?.type === "PRIVATE",
            });
            setIsEditChannelModalVisible(true);
          }
        });
        items.push({
          key: "add_members",
          label: "Add Members",
          icon: <FiPlus />,
          onClick: () => setIsInfoDrawerVisible(true),
        });
      }
      items.push({
        key: "leave",
        label: "Leave Channel",
        icon: <FiLogOut />,
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: "Leave Channel",
            content: "Are you sure you want to leave this channel?",
            okText: "Yes, Leave",
            cancelText: "Cancel",
            onOk: handleLeaveChannel,
          });
        }
      });
      if (isCurrentChannelAdmin) {
        items.push({
          key: "delete",
          label: "Delete Channel",
          icon: <FiTrash2 />,
          danger: true,
          onClick: () => {
            Modal.confirm({
              title: "Delete Channel",
              content: "Are you sure you want to delete this channel? This action cannot be undone.",
              okText: "Yes, Delete",
              cancelText: "Cancel",
              onOk: handleDeleteChannel,
            });
          }
        });
      }
      const isMuted = notificationSettings.mutedConversations.includes(activeConversation.id);
      items.push({
        key: "mute",
        label: isMuted ? "Unmute Notifications" : "Mute Notifications",
        icon: isMuted ? <FiVolume2 /> : <FiVolumeX />,
        onClick: () => {
          const list = notificationSettings.mutedConversations;
          const newList = isMuted
            ? list.filter((id) => id !== activeConversation.id)
            : [...list, activeConversation.id];
          saveNotificationSettings({
            ...notificationSettings,
            mutedConversations: newList,
          });
          message.success(isMuted ? "Notifications unmuted" : "Notifications muted");
        }
      });
      return items;
    } else {
      const isMuted = notificationSettings.mutedConversations.includes(activeConversation.id);
      return [
        {
          key: "profile",
          label: "View Profile",
          icon: <FiInfo />,
          onClick: () => {
            const parts = activeConversation.id.split("_");
            const targetId = parts[0] === currentUserId ? parts[1] : parts[0];
            const target = users.find((u) => u.id === targetId);
            if (target) {
              setSelectedUserForProfile(target);
              setIsInfoDrawerVisible(true);
            }
          }
        },
        {
          key: "mute",
          label: isMuted ? "Unmute Notifications" : "Mute Notifications",
          icon: isMuted ? <FiVolume2 /> : <FiVolumeX />,
          onClick: () => {
            const list = notificationSettings.mutedConversations;
            const newList = isMuted
              ? list.filter((id) => id !== activeConversation.id)
              : [...list, activeConversation.id];
            saveNotificationSettings({
              ...notificationSettings,
              mutedConversations: newList,
            });
            message.success(isMuted ? "Notifications unmuted" : "Notifications muted");
          }
        }
      ];
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredNewChatUsers = users.filter((u) => {
    const term = newChatSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    );
  });

  const filteredMessages = useMemo(() => {
    if (!messageSearchQuery) return messages;
    return messages.filter((m) => {
      return (
        m.message.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
        (m.attachmentName &&
          m.attachmentName
            .toLowerCase()
            .includes(messageSearchQuery.toLowerCase()))
      );
    });
  }, [messages, messageSearchQuery]);

  const rowVirtualizer = useVirtualizer({
    count: filteredMessages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 90,
    overscan: 8,
    getItemKey: (index) => filteredMessages[index]?.id ?? index,
  });

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || isLoadingOlder || !hasMoreOlder || !oldestCursor || !activeConversation) return;
    if (el.scrollTop < 150) {
      loadOlderMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingOlder, hasMoreOlder, oldestCursor, activeConversation]);

  // Single source of truth for scroll position: restores the anchor after prepending
  // older messages, jumps to the first unread message (or the bottom, if none) on the
  // initial load of a conversation, and follows new messages only while already near
  // the bottom - never yanks the view while the user is reading history.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || filteredMessages.length === 0) return;

    if (isPrependingRef.current) {
      isPrependingRef.current = false;
      const anchorId = anchorMessageIdRef.current;
      const idx = anchorId ? filteredMessages.findIndex((m) => m.id === anchorId) : -1;
      if (idx !== -1) rowVirtualizer.scrollToIndex(idx, { align: "start" });
      prevMessageCountRef.current = filteredMessages.length;
      return;
    }

    if (!hasScrolledInitiallyRef.current) {
      hasScrolledInitiallyRef.current = true;
      const unreadIdx = firstUnreadMessageId
        ? filteredMessages.findIndex((m) => m.id === firstUnreadMessageId)
        : -1;
      if (unreadIdx !== -1) {
        rowVirtualizer.scrollToIndex(unreadIdx, { align: "start" });
      } else {
        rowVirtualizer.scrollToIndex(filteredMessages.length - 1, { align: "end" });
      }
      prevMessageCountRef.current = filteredMessages.length;
      return;
    }

    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = filteredMessages.length;
    if (filteredMessages.length > prevCount) {
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (nearBottom) {
        rowVirtualizer.scrollToIndex(filteredMessages.length - 1, { align: "end" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMessages, firstUnreadMessageId]);

  // Check if current user is admin of active channel
  const isCurrentChannelAdmin = channelMembers.some(
    (m) => m.userId === currentUserId && m.role === "ADMIN",
  );

  return (
    <Layout
      style={{
        height: "calc(100vh - 140px)",
        background: "#fff",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      {/* Sidebar Navigation */}
      <Sider
        width={280}
        theme="light"
        style={{
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0, fontWeight: "bold" }}>Chat Rooms</h3>
            <Space size={8}>
              <Button
                shape="circle"
                icon={<FiSettings />}
                onClick={() => setIsSettingsModalVisible(true)}
              />
              <Button
                type="primary"
                shape="circle"
                icon={<FiPlus />}
                onClick={() => {
                  channelForm.setFieldsValue({ initialMembers: [currentUserId] });
                  setIsChannelModalVisible(true);
                }}
              />
            </Space>
          </div>

          <Input
            placeholder="Search channels or colleagues..."
            prefix={<FiSearch />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: "8px" }}
          />

          <Tabs
            size="small"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: "all", label: "All" },
              { key: "direct", label: "1-to-1" },
              { key: "channels", label: "Groups" },
            ]}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {/* Channels List */}
          {(activeTab === "all" || activeTab === "channels") && (
            <List
              header={
                <span
                  style={{
                    padding: "0 12px",
                    fontSize: "12px",
                    color: "#8c8c8c",
                    fontWeight: "bold",
                  }}
                >
                  CHANNELS
                </span>
              }
              dataSource={filteredChannels}
              renderItem={(channel) => {
                const isSelected = activeConversation?.id === channel.id;
                return (
                  <List.Item
                    onClick={() =>
                      setActiveConversation({
                        id: channel.id,
                        type: "channel",
                        name: channel.name,
                        avatar: channel.avatar,
                      })
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: isSelected ? "#e6f7ff" : "transparent",
                      border: "none",
                      margin: "2px 0",
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={<FiUsers />}
                          src={channel.avatar}
                          style={{ backgroundColor: "#0ea5e9" }}
                        />
                      }
                      title={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Space>
                            <span style={{ fontWeight: (channel.unreadCount || 0) > 0 ? "bold" : "normal" }}>
                              {channel.name}
                            </span>
                            {channel.type === "PRIVATE" && (
                              <Tag
                                color="warning"
                                style={{ fontSize: "10px", margin: 0, padding: "0 4px" }}
                              >
                                Private
                              </Tag>
                            )}
                          </Space>
                          {channel.lastMessageTime && (
                            <span style={{ fontSize: "10px", color: "#8c8c8c", fontWeight: "normal" }}>
                              {new Date(channel.lastMessageTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      }
                      description={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            style={{
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                              maxWidth: "140px",
                              fontSize: "12px",
                              color: (channel.unreadCount || 0) > 0 ? "#111b21" : "#8c8c8c",
                              fontWeight: (channel.unreadCount || 0) > 0 ? "600" : "normal",
                            }}
                          >
                            {channel.lastMessage || `${channel.memberCount || 1} members`}
                          </span>
                          {(channel.unreadCount || 0) > 0 && (
                            <Badge
                              count={channel.unreadCount}
                              style={{ backgroundColor: "#10b981" }}
                            />
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}

          {/* Direct Messages List */}
          {(activeTab === "all" || activeTab === "direct") && (
            <>
              {filteredConversations.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center" }}>
                  <div style={{ color: "#8c8c8c", marginBottom: "12px", fontSize: "13px" }}>
                    No conversations yet. Start a new chat.
                  </div>
                  <Button
                    type="primary"
                    onClick={() => setIsNewChatModalVisible(true)}
                  >
                    New Chat
                  </Button>
                </div>
              ) : (
                <List
                  header={
                    <div
                      style={{
                        padding: "0 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#8c8c8c",
                          fontWeight: "bold",
                        }}
                      >
                        DIRECT MESSAGES
                      </span>
                      <Button
                        type="text"
                        size="small"
                        icon={<FiPlus />}
                        onClick={() => setIsNewChatModalVisible(true)}
                        style={{ color: "#10b981" }}
                      />
                    </div>
                  }
                  dataSource={filteredConversations}
                  renderItem={(c) => {
                    const status = onlineStatuses[c.otherUserId] || c.status || "offline";
                    const isSelected = activeConversation?.id === c.conversationId;
                    return (
                      <List.Item
                        onClick={() =>
                          setActiveConversation({
                            id: c.conversationId,
                            type: "dm",
                            name: c.name,
                            avatar: c.avatar,
                            status,
                          })
                        }
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: isSelected ? "#e6f7ff" : "transparent",
                          border: "none",
                          margin: "2px 0",
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Badge
                              dot
                              status={
                                status === "online"
                                  ? "success"
                                  : status === "away"
                                    ? "warning"
                                    : "default"
                              }
                            >
                              <Avatar
                                icon={<FiUser />}
                                src={c.avatar}
                                style={{ backgroundColor: "#10b981" }}
                              />
                            </Badge>
                          }
                          title={
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: c.unreadCount > 0 ? "bold" : "normal" }}>{c.name}</span>
                              {c.lastMessageTime && (
                                <span style={{ fontSize: "10px", color: "#8c8c8c", fontWeight: "normal" }}>
                                  {new Date(c.lastMessageTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                          }
                          description={
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span
                                style={{
                                  textOverflow: "ellipsis",
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                  maxWidth: "140px",
                                  fontSize: "12px",
                                  color: c.unreadCount > 0 ? "#111b21" : "#8c8c8c",
                                  fontWeight: c.unreadCount > 0 ? "600" : "normal",
                                }}
                              >
                                {c.lastMessage || "No messages"}
                              </span>
                              {c.unreadCount > 0 && (
                                <Badge
                                  count={c.unreadCount}
                                  style={{ backgroundColor: "#10b981" }}
                                />
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </>
          )}
        </div>
      </Sider>

      {/* Main Chat Workspace */}
      <Layout
        style={{
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {activeConversation ? (
          <>
            {/* Header */}
            <div
              style={{
                height: "64px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
                background: "#ffffff",
                zIndex: 10,
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Avatar
                  src={activeConversation.avatar}
                  icon={
                    activeConversation.type === "channel" ? (
                      <FiUsers />
                    ) : (
                      <FiUser />
                    )
                  }
                  style={{
                    backgroundColor:
                      activeConversation.type === "channel"
                        ? "#0ea5e9"
                        : "#10b981",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontWeight: "bold",
                      fontSize: "15px",
                      lineHeight: "1.4",
                    }}
                  >
                    {activeConversation.name}
                  </h4>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#8c8c8c",
                      lineHeight: "1.2",
                    }}
                  >
                    {activeConversation.type === "channel"
                      ? `${channelMembers.length} members`
                      : activeConversation.status || "offline"}
                  </span>
                </div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Button
                  type="text"
                  shape="circle"
                  icon={<FiSearch />}
                  onClick={() => setIsSearchingInChat(!isSearchingInChat)}
                />
                <Button
                  type="text"
                  shape="circle"
                  icon={<FiInfo />}
                  onClick={() => {
                    if (activeConversation.type === "dm") {
                      const parts = activeConversation.id.split("_");
                      const targetId =
                        parts[0] === currentUserId ? parts[1] : parts[0];
                      const target = users.find((u) => u.id === targetId);
                      if (target) {
                        setSelectedUserForProfile(target);
                        setIsInfoDrawerVisible(true);
                      }
                    } else {
                      setIsInfoDrawerVisible(true);
                    }
                  }}
                />
                <Dropdown
                  menu={{ items: getMoreOptionsItems() }}
                  placement="bottomRight"
                  trigger={["click"]}
                >
                  <Button
                    type="text"
                    shape="circle"
                    icon={<FiMoreVertical />}
                  />
                </Dropdown>
              </div>
            </div>

            {/* Chat Search Header */}
            {isSearchingInChat && (
              <div
                style={{
                  padding: "8px 24px",
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  gap: "8px",
                  flexShrink: 0,
                }}
              >
                <Input
                  placeholder="Search messages in this conversation..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  style={{ borderRadius: "8px" }}
                />
                <Button
                  icon={<FiX />}
                  onClick={() => {
                    setMessageSearchQuery("");
                    setIsSearchingInChat(false);
                  }}
                />
              </div>
            )}

            {/* Messages Area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              style={{
                flex: 1,
                padding: "24px",
                overflowY: "auto",
                background: "#efeae2",
              }}
            >
              {isLoadingOlder && (
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
                  <Spin size="small" />
                </div>
              )}

              <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const msg = filteredMessages[virtualRow.index];
                  if (!msg) return null;
                  const isOwn = String(msg.senderId) === String(currentUserId);
                  const sender = users.find((u) => u.id === msg.senderId);
                  const showUnreadDivider = msg.id === firstUnreadMessageId;

                  return (
                    <div
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {showUnreadDivider && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            margin: "16px 0",
                          }}
                        >
                          <div style={{ flex: 1, height: 1, background: "#ff4d4f" }} />
                          <span style={{ fontSize: "12px", color: "#ff4d4f", fontWeight: 600 }}>
                            Unread messages
                          </span>
                          <div style={{ flex: 1, height: 1, background: "#ff4d4f" }} />
                        </div>
                      )}
                      <MessageItem
                        msg={msg}
                        isOwn={isOwn}
                        isChannelView={activeConversation.type === "channel"}
                        senderName={sender?.name}
                        currentUserId={currentUserId}
                        users={users}
                        onPreviewImage={setPreviewImage}
                        onReact={handleAddReaction}
                        onReply={setReplyingTo}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteMessage}
                      />
                    </div>
                  );
                })}
              </div>

              {typingUsers[activeConversation.id] &&
                typingUsers[activeConversation.id].length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      opacity: 0.6,
                      fontSize: "12px",
                      margin: "8px 0",
                    }}
                  >
                    <Spin size="small" />
                    <span>
                      {typingUsers[activeConversation.id].join(", ")}{" "}
                      typing...
                    </span>
                  </div>
                )}
            </div>

            {/* Input Panel */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #f0f0f0",
                background: "#fff",
                flexShrink: 0,
              }}
            >
              {replyingTo && (
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "bold", fontSize: "12px" }}>
                      Replying to message:
                    </span>
                    <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
                      {replyingTo.message}
                    </p>
                  </div>
                  <Button
                    type="text"
                    shape="circle"
                    icon={<FiX />}
                    onClick={() => setReplyingTo(null)}
                  />
                </div>
              )}

              {editingMessage && (
                <div
                  style={{
                    background: "#fffbe6",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "12px",
                        color: "#d4b106",
                      }}
                    >
                      Editing your message:
                    </span>
                    <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>
                      {editingMessage.message}
                    </p>
                  </div>
                  <Button
                    type="text"
                    shape="circle"
                    icon={<FiX />}
                    onClick={() => {
                      setEditingMessage(null);
                      setInputText("");
                    }}
                  />
                </div>
              )}

              {uploadProgress !== null && (
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Uploading {uploadingName}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress
                    percent={uploadProgress}
                    showInfo={false}
                    size="small"
                    strokeColor="#0ea5e9"
                  />
                </div>
              )}

              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <Upload customRequest={customFileUpload} showUploadList={false}>
                  <Button shape="circle" icon={<FiPaperclip />} />
                </Upload>

                <Input
                  value={inputText}
                  onChange={handleInputChange}
                  onPressEnter={
                    editingMessage ? handleEditMessage : handleSendMessage
                  }
                  placeholder={
                    isRecording ? "Recording audio..." : "Type a message..."
                  }
                  disabled={isRecording}
                  style={{ borderRadius: "20px", height: "40px" }}
                />

                {isRecording ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      {recordTime}s
                    </span>
                    <Button
                      type="primary"
                      danger
                      shape="circle"
                      icon={<FiSquare />}
                      onClick={stopRecording}
                    />
                  </div>
                ) : (
                  <Button
                    shape="circle"
                    icon={<FiMic />}
                    onClick={startRecording}
                  />
                )}

                <Button
                  type="primary"
                  shape="circle"
                  icon={<FiSend />}
                  onClick={
                    editingMessage ? handleEditMessage : handleSendMessage
                  }
                  style={{ background: "#0ea5e9", borderColor: "#0ea5e9" }}
                />
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <FiUsers style={{ fontSize: "48px", color: "#d9d9d9" }} />
            <h3>No conversation selected</h3>
            <p style={{ color: "#8c8c8c" }}>
              Choose a group channel or message a colleague to start chatting.
            </p>
          </div>
        )}
      </Layout>

      {/* Info Panel / Drawer for Channels or Users */}
      <Drawer
        title={
          activeConversation?.type === "channel"
            ? "Channel Properties"
            : "Colleague Profile"
        }
        placement="right"
        onClose={() => setIsInfoDrawerVisible(false)}
        open={isInfoDrawerVisible}
        width={360}
      >
        {activeConversation?.type === "channel" ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <h3 style={{ margin: 0, fontWeight: "bold" }}>
                {activeConversation.name}
              </h3>
              <p style={{ color: "#8c8c8c", margin: "4px 0 0 0" }}>
                Welcome to the channel room.
              </p>
            </div>

            {/* Actions for channel admins and users */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Button
                type="dashed"
                icon={<FiEdit3 />}
                onClick={() => {
                  editChannelForm.setFieldsValue({
                    name: activeConversation.name,
                    description:
                      channels.find((c) => c.id === activeConversation.id)
                        ?.description || "",
                    isPrivate:
                      channels.find((c) => c.id === activeConversation.id)
                        ?.type === "PRIVATE",
                  });
                  setIsEditChannelModalVisible(true);
                }}
              >
                Edit Channel
              </Button>
              <Button
                danger
                type="dashed"
                icon={<FiLogOut />}
                onClick={handleLeaveChannel}
              >
                Leave
              </Button>
              {(isCurrentChannelAdmin ||
                currentUserId ===
                  channels.find((c) => c.id === activeConversation.id)
                    ?.createdBy) && (
                <Button
                  danger
                  type="primary"
                  icon={<FiTrash2 />}
                  onClick={handleDeleteChannel}
                >
                  Delete Channel
                </Button>
              )}
            </div>

            <hr
              style={{
                border: "none",
                borderBottom: "1px solid #f0f0f0",
                margin: 0,
              }}
            />

            {/* Add Team Members Section */}
            <div>
              <h4 style={{ fontWeight: "bold", marginBottom: "8px" }}>
                Add Team Members
              </h4>
              <div style={{ display: "flex", gap: "8px" }}>
                <Select
                  mode="multiple"
                  placeholder="Select colleagues"
                  style={{ flex: 1 }}
                  optionFilterProp="children"
                  onChange={(val) => setMembersToAdd(val)}
                  value={membersToAdd}
                >
                  {users
                    .filter(
                      (u) => !channelMembers.some((m) => m.userId === u.id),
                    )
                    .map((u) => (
                      <Option key={u.id} value={u.id}>
                        {u.name}
                      </Option>
                    ))}
                </Select>
                <Button type="primary" onClick={handleAddMembers}>
                  Add
                </Button>
              </div>
            </div>

            {/* Member List */}
            <div>
              <h4 style={{ fontWeight: "bold", marginBottom: "8px" }}>
                Members ({channelMembers.length})
              </h4>
              <List
                size="small"
                dataSource={channelMembers}
                renderItem={(member) => (
                  <List.Item
                    actions={[
                      isCurrentChannelAdmin &&
                        member.userId !== currentUserId && (
                          <Button
                            key="remove"
                            type="link"
                            danger
                            size="small"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            Remove
                          </Button>
                        ),
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={member.photo}
                          size="small"
                          icon={<FiUser />}
                        />
                      }
                      title={
                        <span>
                          {member.name}{" "}
                          {member.userId === currentUserId && (
                            <Tag color="blue">You</Tag>
                          )}
                        </span>
                      }
                      description={
                        <Tag
                          color={member.role === "ADMIN" ? "red" : "default"}
                          style={{ fontSize: "10px" }}
                        >
                          {member.role}
                        </Tag>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>

            <hr
              style={{
                border: "none",
                borderBottom: "1px solid #f0f0f0",
                margin: 0,
              }}
            />

            <div>
              <h4 style={{ fontWeight: "bold", marginBottom: "8px" }}>
                Shared Media / Attachments
              </h4>
              <List
                dataSource={sharedAttachments}
                locale={{ emptyText: "No attachments shared" }}
                renderItem={(att) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <a
                          href={att.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: "13px" }}
                        >
                          {att.attachmentName}
                        </a>
                      }
                      description={formatBytes(att.attachmentSize || 0)}
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>
        ) : selectedUserForProfile ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <Avatar
              size={96}
              src={selectedUserForProfile.photo}
              icon={<FiUser />}
              style={{ backgroundColor: "#10b981" }}
            />
            <h3 style={{ margin: 0 }}>{selectedUserForProfile.name}</h3>
            <Tag
              color={
                onlineStatuses[selectedUserForProfile.id] === "online"
                  ? "success"
                  : "default"
              }
            >
              {onlineStatuses[selectedUserForProfile.id] || "offline"}
            </Tag>

            <div style={{ width: "100%", marginTop: "16px" }}>
              <div>
                <strong>Employee ID:</strong>{" "}
                {selectedUserForProfile.employeeId}
              </div>
              <div>
                <strong>Email:</strong> {selectedUserForProfile.email}
              </div>
              <div>
                <strong>Phone:</strong> {selectedUserForProfile.phone || "N/A"}
              </div>
              <div>
                <strong>Department:</strong>{" "}
                {selectedUserForProfile.departmentId || "Operations"}
              </div>
              <div>
                <strong>Designation:</strong>{" "}
                {selectedUserForProfile.designationId || "Executive"}
              </div>
            </div>

            <hr
              style={{
                border: "none",
                borderBottom: "1px solid #f0f0f0",
                width: "100%",
                margin: "16px 0",
              }}
            />

            <h4 style={{ alignSelf: "flex-start" }}>
              Shared Media / Attachments
            </h4>
            <List
              style={{ width: "100%" }}
              dataSource={sharedAttachments}
              renderItem={(att) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <a
                        href={att.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {att.attachmentName}
                      </a>
                    }
                    description={formatBytes(att.attachmentSize || 0)}
                  />
                </List.Item>
              )}
            />
          </div>
        ) : null}
      </Drawer>

      {/* Image Preview Modal */}
      <Modal
        open={previewImage !== null}
        footer={null}
        onCancel={() => setPreviewImage(null)}
        width={800}
      >
        {previewImage && (
          <img
            src={previewImage}
            alt="preview"
            style={{ width: "100%", borderRadius: "8px" }}
          />
        )}
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        title="Notification Settings"
        open={isSettingsModalVisible}
        onCancel={() => setIsSettingsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsSettingsModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: "600", fontSize: "14px" }}>Mute All Notifications</div>
              <div style={{ fontSize: "12px", color: "#8c8c8c" }}>Silence all sounds and alerts globally</div>
            </div>
            <Switch
              checked={notificationSettings.mutedAll}
              onChange={(checked) => saveNotificationSettings({ ...notificationSettings, mutedAll: checked })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: "600", fontSize: "14px" }}>Notification Sounds</div>
              <div style={{ fontSize: "12px", color: "#8c8c8c" }}>Play a chime when new messages arrive</div>
            </div>
            <Switch
              checked={notificationSettings.soundEnabled}
              disabled={notificationSettings.mutedAll}
              onChange={(checked) => saveNotificationSettings({ ...notificationSettings, soundEnabled: checked })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: "600", fontSize: "14px" }}>Desktop Notifications</div>
              <div style={{ fontSize: "12px", color: "#8c8c8c" }}>Show browser popups for new messages</div>
            </div>
            <Switch
              checked={notificationSettings.browserNotificationsEnabled}
              disabled={notificationSettings.mutedAll}
              onChange={(checked) => {
                if (checked && typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
                  Notification.requestPermission().then((permission) => {
                    saveNotificationSettings({
                      ...notificationSettings,
                      browserNotificationsEnabled: permission === "granted",
                    });
                    if (permission !== "granted") {
                      message.warning("Notification permission denied by browser.");
                    }
                  });
                } else {
                  saveNotificationSettings({
                    ...notificationSettings,
                    browserNotificationsEnabled: checked,
                  });
                }
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: "600", fontSize: "14px" }}>Sound for Open Conversation</div>
              <div style={{ fontSize: "12px", color: "#8c8c8c" }}>Play the chime even while you're viewing that chat</div>
            </div>
            <Switch
              checked={notificationSettings.playSoundForActiveConversation}
              disabled={notificationSettings.mutedAll || !notificationSettings.soundEnabled}
              onChange={(checked) =>
                saveNotificationSettings({ ...notificationSettings, playSoundForActiveConversation: checked })
              }
            />
          </div>

          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "16px" }}>
            <h4 style={{ marginBottom: "12px", fontWeight: "600" }}>Muted Chats & Rooms</h4>
            {notificationSettings.mutedConversations.length === 0 ? (
              <span style={{ color: "#8c8c8c", fontSize: "13px" }}>No muted chats.</span>
            ) : (
              <List
                size="small"
                bordered
                dataSource={notificationSettings.mutedConversations}
                renderItem={(id) => {
                  const isDm = id.includes("_");
                  let name = "Unknown Chat";
                  if (isDm) {
                    const parts = id.split("_");
                    const otherUserId = parts[0] === currentUserId ? parts[1] : parts[0];
                    const userObj = users.find((u) => u.id === otherUserId);
                    name = userObj ? userObj.name : "Direct Message";
                  } else {
                    const chan = channels.find((c) => c.id === id);
                    name = chan ? `# ${chan.name}` : "Group Chat";
                  }
                  return (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => {
                            const newList = notificationSettings.mutedConversations.filter(x => x !== id);
                            saveNotificationSettings({ ...notificationSettings, mutedConversations: newList });
                            message.success("Unmuted " + name);
                          }}
                        >
                          Unmute
                        </Button>
                      ]}
                    >
                      <span style={{ fontSize: "13px" }}>{name}</span>
                    </List.Item>
                  );
                }}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Channel Creation Modal */}
      <Modal
        title="Create New Channel"
        open={isChannelModalVisible}
        onCancel={() => setIsChannelModalVisible(false)}
        footer={null}
      >
        <Form
          form={channelForm}
          onFinish={handleCreateChannel}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Channel Name"
            rules={[{ required: true, message: "Please input channel name" }]}
          >
            <Input placeholder="e.g. general-tech-talk" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Describe the channel topic" />
          </Form.Item>

          <Form.Item
            name="initialMembers"
            label="Select Members"
          >
            <Select
              mode="multiple"
              placeholder="Search by name, employee ID or email"
              optionFilterProp="children"
              filterOption={(input, option) => {
                const label = (option?.label || "").toString().toLowerCase();
                return label.includes(input.toLowerCase());
              }}
              style={{ width: "100%" }}
            >
              <Option
                key={currentUserId}
                value={currentUserId}
                disabled
                label={`${currentUserName || "You"} (Creator)`}
              >
                <Space>
                  <Avatar size="small" />
                  <span>{currentUserName || "You"} (Creator)</span>
                </Space>
              </Option>
              {users.map((u) => (
                <Option
                  key={u.id}
                  value={u.id}
                  label={`${u.name} (${u.employeeId || ""} - ${u.email || ""})`}
                >
                  <Space>
                    <Avatar size="small" src={u.photo} />
                    <span>{u.name}</span>
                    <span style={{ fontSize: "11px", opacity: 0.6 }}>
                      ({u.employeeId || "No ID"} - {u.email})
                    </span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="isPrivate"
            label="Privacy Setting"
            valuePropName="checked"
          >
            <Radio.Group>
              <Radio value={false}>
                Public (All employees can search and join)
              </Radio>
              <Radio value={true}>Private (Invitation only)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsChannelModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* New Chat Dialog Modal */}
      <Modal
        title="Start a new chat"
        open={isNewChatModalVisible}
        onCancel={() => {
          setIsNewChatModalVisible(false);
          setNewChatSearch("");
        }}
        footer={null}
        styles={{ body: { maxHeight: "400px", overflowY: "auto" } }}
      >
        <Input
          placeholder="Search by name, employee ID, or email..."
          prefix={<FiSearch />}
          value={newChatSearch}
          onChange={(e) => setNewChatSearch(e.target.value)}
          style={{ marginBottom: "16px" }}
          allowClear
        />
        <List
          dataSource={filteredNewChatUsers}
          renderItem={(user) => {
            const status = onlineStatuses[user.id] || "offline";
            return (
              <List.Item
                onClick={() => {
                  const convId = getDMConversationId(user.id);
                  setActiveConversation({
                    id: convId,
                    type: "dm",
                    name: user.name,
                    avatar: user.photo,
                    status,
                  });
                  setIsNewChatModalVisible(false);
                  setNewChatSearch("");
                }}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  transition: "background 0.2s",
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge
                      dot
                      status={
                        status === "online"
                          ? "success"
                          : status === "away"
                            ? "warning"
                            : "default"
                      }
                    >
                      <Avatar src={user.photo} icon={<FiUser />} />
                    </Badge>
                  }
                  title={user.name}
                  description={
                    <span style={{ fontSize: "11px", opacity: 0.6 }}>
                      {user.employeeId || "No ID"} • {user.email}
                    </span>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Modal>

      {/* Edit Channel Modal */}
      <Modal
        title="Edit Channel Details"
        open={isEditChannelModalVisible}
        onCancel={() => setIsEditChannelModalVisible(false)}
        footer={null}
      >
        <Form
          form={editChannelForm}
          onFinish={handleEditChannel}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Channel Name"
            rules={[{ required: true, message: "Please input channel name" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            name="isPrivate"
            label="Privacy Setting"
            valuePropName="checked"
          >
            <Radio.Group>
              <Radio value={false}>Public</Radio>
              <Radio value={true}>Private</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsEditChannelModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
