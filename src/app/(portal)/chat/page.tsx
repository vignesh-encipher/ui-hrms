"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import API from "@/services/api";
import { getStorage } from "@/utils/storages";
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
} from "react-icons/fi";
import { MdPushPin } from "react-icons/md";

const { Sider, Content } = Layout;
const { Option } = Select;

// Define interfaces
interface ChatUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  photo?: string;
  status: string; // online, offline, away, busy, dnd
  departmentId?: string;
  designationId?: string;
  phone?: string;
}

interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: "PUBLIC" | "PRIVATE";
  createdBy: string;
  createdAt: string;
  avatar?: string;
  isMember: boolean;
  memberCount: number;
}

interface Reaction {
  userId: string;
  emoji: string;
}

interface MessageType {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  messageType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  replyTo?: string; // ID of message
  edited: boolean;
  deleted: boolean;
  pinned: boolean;
  reactions: Reaction[];
  starredBy: string[];
  readBy: string[];
  deliveredTo: string[];
  createdAt: string;
}

export default function ChatPage() {
  const {
    id: reduxUserId,
    token,
    username: currentUserName,
  } = useSelector((state: RootState) => state.auth);
  const currentUserId =
    reduxUserId ||
    (typeof window !== "undefined" ? getStorage("userId") : null);

  // States
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all"); // all, direct, channels, starred, archived
  const [activeConversation, setActiveConversation] = useState<{
    id: string;
    type: "dm" | "channel";
    name: string;
    avatar?: string;
    status?: string;
  } | null>(null);

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [messageSearchQuery, setMessageSearchQuery] = useState<string>("");
  const [isSearchingInChat, setIsSearchingInChat] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [reconnectKey, setReconnectKey] = useState<number>(0);

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

  // Typing & Receipts states
  const [typingUsers, setTypingUsers] = useState<{
    [convId: string]: string[];
  }>({});
  const [onlineStatuses, setOnlineStatuses] = useState<{
    [userId: string]: string;
  }>({});

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

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversationRef = useRef(activeConversation);
  const usersRef = useRef(users);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Load baseline data
  useEffect(() => {
    fetchUsers();
    fetchChannels();
  }, []);

  // Set up WebSocket connection
  useEffect(() => {
    if (!token) return;

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://be-hrms-x40s.onrender.com";
    const wsHost = apiBaseUrl.replace(/^http/, "ws");
    const wsUrl = `${wsHost}/ws-chat?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleWebSocketEvent(payload);
      } catch (err) {
        console.error("Failed to parse WebSocket event", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected, reconnecting in 5s...");
      setTimeout(() => {
        if (token) setReconnectKey((prev) => prev + 1);
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, [token, reconnectKey]);

  // Handle auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation.id);
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
      const res = await API.get(`/chat/messages/${convId}`, {
        params: { page: 0, size: 100 },
      });
      setMessages(res.data.content.reverse());

      if (res.data.content.length > 0) {
        const lastMsg = res.data.content[0];
        if (lastMsg.senderId !== currentUserId) {
          sendReadReceipt(lastMsg.id, convId);
        }
      }
    } catch (err) {
      message.error("Failed to load message history");
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

  const handleWebSocketEvent = (event: any) => {
    const { type } = event;

    switch (type) {
      case "CHAT_MESSAGE":
        const newMsg: MessageType = event.message;
        if (
          activeConversationRef.current &&
          newMsg.conversationId === activeConversationRef.current.id
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.senderId !== currentUserId) {
            sendReadReceipt(newMsg.id, activeConversationRef.current.id);
          }
        }
        break;

      case "TYPING":
        const { conversationId, senderId, isTyping } = event;
        const sender = usersRef.current.find((u) => u.id === senderId);
        if (!sender) return;

        setTypingUsers((prev) => {
          const list = prev[conversationId] || [];
          if (isTyping) {
            if (!list.includes(sender.name)) {
              return { ...prev, [conversationId]: [...list, sender.name] };
            }
          } else {
            return {
              ...prev,
              [conversationId]: list.filter((n) => n !== sender.name),
            };
          }
          return prev;
        });
        break;

      case "PRESENCE":
        const { userId, status } = event;
        setOnlineStatuses((prev) => ({ ...prev, [userId]: status }));
        break;

      case "READ_RECEIPT":
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

      case "MESSAGE_EDITED":
        const editedMsg: MessageType = event.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === editedMsg.id ? editedMsg : m)),
        );
        break;

      case "MESSAGE_DELETED":
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

      case "MESSAGE_PINNED_TOGGLE":
        const pinnedMsg: MessageType = event.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === pinnedMsg.id ? pinnedMsg : m)),
        );
        break;

      case "MESSAGE_REACTION":
        const reactedMsg: MessageType = event.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === reactedMsg.id ? reactedMsg : m)),
        );
        break;

      case "CHANNEL_INVITATION":
        fetchChannels();
        break;

      case "REMOVED_FROM_CHANNEL":
        fetchChannels();
        if (
          activeConversationRef.current &&
          activeConversationRef.current.id === event.channelId
        ) {
          setActiveConversation(null);
          message.info("You have been removed from this channel");
        }
        break;

      default:
        break;
    }
  };

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
      const res = await API.post("/chat/messages", payload);
      const savedMsg = res.data;
      setMessages((prev) => {
        if (prev.some((m) => m.id === savedMsg.id)) return prev;
        return [...prev, savedMsg];
      });
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

  const sendReadReceipt = (messageId: string, convId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "READ_RECEIPT",
          conversationId: convId,
          messageId: messageId,
          readerId: currentUserId,
        }),
      );
    }
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (!activeConversation) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "TYPING",
          conversationId: activeConversation.id,
          isTyping: isTyping,
        }),
      );
    }
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

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await API.post(`/chat/messages/${messageId}/react`, { emoji });
    } catch (err) {
      message.error("Reaction failed");
    }
  };

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

  const handleDeleteMessage = async (
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
  };

  const handleCreateChannel = async (values: any) => {
    try {
      const res = await API.post("/chat/channels", {
        name: values.name,
        description: values.description,
        type: values.isPrivate ? "PRIVATE" : "PUBLIC",
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
      await API.post("/chat/messages", payload);
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
          await API.post("/chat/messages", payload);
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

  const renderMessageText = (text: string) => {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#0958d9",
              textDecoration: "underline",
              wordBreak: "break-all",
            }}
          >
            {part}
          </a>
        );
      }
      const boldRegex = /\*([^*]+)\*/g;
      if (part.includes("*")) {
        const subparts = part.split(boldRegex);
        return subparts.map((sub, i) => {
          if (i % 2 === 1) {
            return <strong key={i}>{sub}</strong>;
          }
          return sub;
        });
      }
      return part;
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getDMConversationId = (userId: string) => {
    const sorted = [currentUserId, userId].sort();
    return `${sorted[0]}_${sorted[1]}`;
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredMessages = messages.filter((m) => {
    if (!messageSearchQuery) return true;
    return (
      m.message.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
      (m.attachmentName &&
        m.attachmentName
          .toLowerCase()
          .includes(messageSearchQuery.toLowerCase()))
    );
  });

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
            <Button
              type="primary"
              shape="circle"
              icon={<FiPlus />}
              onClick={() => setIsChannelModalVisible(true)}
            />
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
              renderItem={(channel) => (
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
                    background:
                      activeConversation?.id === channel.id
                        ? "#e6f7ff"
                        : "transparent",
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
                      <div
                        style={{
                          fontWeight: "semibold",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{channel.name}</span>
                        {channel.type === "PRIVATE" && (
                          <Tag
                            color="warning"
                            style={{ fontSize: "10px", margin: 0 }}
                          >
                            Private
                          </Tag>
                        )}
                      </div>
                    }
                    description={`${channel.memberCount || 1} members`}
                  />
                </List.Item>
              )}
            />
          )}

          {/* Direct Messages List */}
          {(activeTab === "all" || activeTab === "direct") && (
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
                  DIRECT MESSAGES
                </span>
              }
              dataSource={filteredUsers}
              renderItem={(user) => {
                const convId = getDMConversationId(user.id);
                const status = onlineStatuses[user.id] || "offline";
                return (
                  <List.Item
                    onClick={() =>
                      setActiveConversation({
                        id: convId,
                        type: "dm",
                        name: user.name,
                        avatar: user.photo,
                        status,
                      })
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background:
                        activeConversation?.id === convId
                          ? "#e6f7ff"
                          : "transparent",
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
                            src={user.photo}
                            style={{ backgroundColor: "#10b981" }}
                          />
                        </Badge>
                      }
                      title={user.name}
                      description={user.designationId || "Colleague"}
                    />
                  </List.Item>
                );
              }}
            />
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
                      ? "Channel Room"
                      : activeConversation.status || "offline"}
                  </span>
                </div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Tooltip title="Voice Call (Coming Soon)">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<FiPhone />}
                    disabled
                  />
                </Tooltip>
                <Tooltip title="Video Call (Coming Soon)">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<FiVideo />}
                    disabled
                  />
                </Tooltip>
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
            <Content
              style={{
                flex: 1,
                padding: "24px",
                overflowY: "auto",
                background: "#efeae2",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {filteredMessages.map((msg) => {
                  const isOwn = String(msg.senderId) === String(currentUserId);
                  // console.log("ALIGNMENT CHECK:", {
                  //   msgId: msg.id,
                  //   msgSenderId: msg.senderId,
                  //   currentUserId: currentUserId,
                  //   isMatch: isOwn
                  // });
                  const sender = users.find((u) => u.id === msg.senderId);
                  const isRead = msg.readBy && msg.readBy.length > 0;

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isOwn ? "flex-end" : "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ maxWidth: "70%" }}>
                        {!isOwn && activeConversation.type === "channel" && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#8c8c8c",
                              marginLeft: "8px",
                              marginBottom: "2px",
                              display: "block",
                            }}
                          >
                            {sender ? sender.name : "Unknown colleague"}
                          </span>
                        )}

                        <div
                          style={{
                            background: isOwn ? "#d9fdd3" : "#ffffff",
                            color: "#111b21",
                            padding: "8px 12px",
                            borderRadius: isOwn
                              ? "12px 12px 2px 12px"
                              : "12px 12px 12px 2px",
                            boxShadow: "0 1px 0.5px rgba(0,0,0,0.12)",
                            position: "relative",
                            border: "none",
                          }}
                        >
                          {msg.replyTo && (
                            <div
                              style={{
                                background: "rgba(0,0,0,0.05)",
                                borderLeft: "3px solid #6366f1",
                                padding: "4px 8px",
                                marginBottom: "6px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                opacity: 0.8,
                              }}
                            >
                              Ref message
                            </div>
                          )}

                          {msg.deleted ? (
                            <span style={{ fontStyle: "italic", opacity: 0.6 }}>
                              {msg.message}
                            </span>
                          ) : (
                            <>
                              {msg.messageType === "IMAGE" &&
                                msg.attachmentUrl && (
                                  <div
                                    style={{
                                      marginBottom: "6px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      setPreviewImage(msg.attachmentUrl || null)
                                    }
                                  >
                                    <img
                                      src={msg.attachmentUrl}
                                      alt="shared"
                                      style={{
                                        maxWidth: "100%",
                                        borderRadius: "8px",
                                        maxHeight: "200px",
                                      }}
                                    />
                                  </div>
                                )}

                              {msg.messageType === "VIDEO" &&
                                msg.attachmentUrl && (
                                  <div style={{ marginBottom: "6px" }}>
                                    <video
                                      src={msg.attachmentUrl}
                                      controls
                                      style={{
                                        maxWidth: "100%",
                                        borderRadius: "8px",
                                        maxHeight: "200px",
                                      }}
                                    />
                                  </div>
                                )}

                              {msg.messageType === "AUDIO" &&
                                msg.attachmentUrl && (
                                  <div style={{ marginBottom: "6px" }}>
                                    <audio
                                      src={msg.attachmentUrl}
                                      controls
                                      style={{ maxWidth: "100%" }}
                                    />
                                  </div>
                                )}

                              {msg.messageType === "DOCUMENT" &&
                                msg.attachmentUrl && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      background: "rgba(0,0,0,0.03)",
                                      padding: "8px",
                                      borderRadius: "6px",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <FiFile style={{ fontSize: "24px" }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{
                                          textOverflow: "ellipsis",
                                          overflow: "hidden",
                                          whiteSpace: "nowrap",
                                          fontSize: "12px",
                                        }}
                                      >
                                        {msg.attachmentName}
                                      </div>
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          opacity: 0.6,
                                        }}
                                      >
                                        {formatBytes(msg.attachmentSize || 0)}
                                      </span>
                                    </div>
                                    <a
                                      href={msg.attachmentUrl}
                                      download={msg.attachmentName}
                                    >
                                      <Button
                                        type="text"
                                        shape="circle"
                                        icon={<FiDownload />}
                                      />
                                    </a>
                                  </div>
                                )}

                              <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                                {renderMessageText(msg.message)}
                              </div>
                            </>
                          )}

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: "4px",
                              marginTop: "4px",
                              fontSize: "10px",
                              opacity: 0.6,
                            }}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isOwn &&
                              !msg.deleted &&
                              (isRead ? (
                                <FiCheckCircle style={{ color: "#52c41a" }} />
                              ) : (
                                <FiCheck />
                              ))}
                          </div>

                          {msg.reactions && msg.reactions.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                marginTop: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              {msg.reactions.map((r, i) => (
                                <span
                                  key={i}
                                  style={{
                                    background: "rgba(0,0,0,0.05)",
                                    padding: "2px 6px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                  }}
                                >
                                  {r.emoji}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {!msg.deleted && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: isOwn ? "flex-end" : "flex-start",
                              marginTop: "2px",
                            }}
                          >
                            <Space size={12}>
                              <Popover
                                trigger="click"
                                content={
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "8px",
                                      fontSize: "16px",
                                    }}
                                  >
                                    {["👍", "❤️", "😂", "😮", "🎉"].map(
                                      (emoji) => (
                                        <span
                                          key={emoji}
                                          style={{ cursor: "pointer" }}
                                          onClick={() =>
                                            handleAddReaction(msg.id, emoji)
                                          }
                                        >
                                          {emoji}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                }
                              >
                                <Button
                                  type="link"
                                  size="small"
                                  style={{ padding: 0 }}
                                >
                                  React
                                </Button>
                              </Popover>

                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0 }}
                                onClick={() => setReplyingTo(msg)}
                              >
                                Reply
                              </Button>

                              {isOwn && (
                                <>
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{ padding: 0 }}
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setInputText(msg.message);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    type="link"
                                    size="small"
                                    danger
                                    style={{ padding: 0 }}
                                    onClick={() =>
                                      handleDeleteMessage(msg.id, "everyone")
                                    }
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}

                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0 }}
                                onClick={() => handleToggleStar(msg.id)}
                              >
                                {msg.starredBy?.includes(currentUserId!)
                                  ? "Unstar"
                                  : "Star"}
                              </Button>

                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0 }}
                                onClick={() => handleTogglePin(msg.id)}
                              >
                                {msg.pinned ? "Unpin" : "Pin"}
                              </Button>
                            </Space>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

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

                <div ref={messagesEndRef} />
              </div>
            </Content>

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
