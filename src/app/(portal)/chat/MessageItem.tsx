import React, { useMemo, useState } from "react";
import { Button, Popover, Space, Dropdown, message, Modal } from "antd";
import {
  FiFile,
  FiDownload,
  FiCheck,
  FiCheckCircle,
  FiMoreVertical,
  FiCornerUpLeft,
  FiSmile,
} from "react-icons/fi";
import { ChatUser, MessageType } from "./types";
import { renderMessageText, formatBytes } from "./chatUtils";

interface MessageItemProps {
  msg: MessageType;
  isOwn: boolean;
  isChannelView: boolean;
  senderName?: string;
  currentUserId: string | null;
  users: ChatUser[];
  onPreviewImage: (url: string) => void;
  onReact: (messageId: string, emoji: string, alreadyReacted: boolean) => void;
  onReply: (msg: MessageType) => void;
  onEdit: (msg: MessageType) => void;
  onDelete: (messageId: string, scope: "me" | "everyone") => void;
}

const ALL_PICKER_EMOJIS = [
  "👍", "❤️", "😂", "😮", "😢", "🙏",
  "🎉", "🔥", "👏", "💖", "✨", "💯",
  "💩", "🚀", "😍", "🥳", "🤔", "👀",
  "🥺", "😎", "😭", "😡", "😱", "🤮",
  "😴", "🤐", "🤯", "🤩", "😜", "🌟",
  "🌈", "🎈", "🎁", "🎂", "🥇", "🏆"
];

function MessageItem({
  msg,
  isOwn,
  isChannelView,
  senderName,
  currentUserId,
  users,
  onPreviewImage,
  onReact,
  onReply,
  onEdit,
  onDelete,
}: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isRead = msg.readBy && msg.readBy.length > 0;

  const reactionGroups = useMemo(() => {
    return (msg.reactions || []).reduce((acc: { [emoji: string]: string[] }, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      if (!acc[r.emoji].includes(r.userId)) {
        acc[r.emoji].push(r.userId);
      }
      return acc;
    }, {});
  }, [msg.reactions]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(msg.message);
    message.success("Copied to clipboard!");
  };

  const handleShowInfo = () => {
    Modal.info({
      title: "Message Details",
      icon: <span>📄</span>,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
          <div><strong>Sender:</strong> {isOwn ? "You" : senderName || "Unknown colleague"}</div>
          <div><strong>Sent Time:</strong> {new Date(msg.createdAt).toLocaleString()}</div>
          <div><strong>Message Type:</strong> {msg.messageType || "TEXT"}</div>
          {msg.readBy && msg.readBy.length > 0 && (
            <div>
              <strong>Read By:</strong> {msg.readBy.length} member(s)
            </div>
          )}
        </div>
      ),
      okText: "Close",
    });
  };

  const contextMenuItems = [
    {
      key: "reply",
      label: "Reply",
      icon: <FiCornerUpLeft />,
      onClick: () => onReply(msg),
    },
    {
      key: "react",
      label: "React",
      icon: <FiSmile />,
      children: [
        ...["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => {
          const alreadyReactedWithThisEmoji = (msg.reactions || []).some(
            (r) => r.userId === currentUserId && r.emoji === emoji
          );
          return {
            key: `react_${emoji}`,
            label: emoji,
            onClick: () => onReact(msg.id, emoji, alreadyReactedWithThisEmoji),
          };
        }),
      ],
    },
    {
      key: "copy",
      label: "Copy",
      icon: <FiFile />,
      onClick: handleCopyText,
    },
    ...(isOwn && !msg.deleted
      ? [
          {
            key: "edit",
            label: "Edit",
            icon: <span>✏️</span>,
            onClick: () => onEdit(msg),
          },
          {
            key: "delete",
            label: "Delete",
            icon: <span>🗑️</span>,
            danger: true,
            onClick: () => onDelete(msg.id, "everyone"),
          },
        ]
      : []),
    {
      key: "info",
      label: "Message Info",
      icon: <span>📄</span>,
      onClick: handleShowInfo,
    },
  ];

  const quickReactContent = (
    <div style={{ display: "flex", gap: "8px", fontSize: "18px", alignItems: "center" }}>
      {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => {
        const alreadyReactedWithThisEmoji = (msg.reactions || []).some(
          (r) => r.userId === currentUserId && r.emoji === emoji
        );
        return (
          <span
            key={emoji}
            style={{ cursor: "pointer", transition: "transform 0.1s", display: "inline-block" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onClick={() => onReact(msg.id, emoji, alreadyReactedWithThisEmoji)}
          >
            {emoji}
          </span>
        );
      })}
      
      <Popover
        placement="top"
        trigger="click"
        content={
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "8px",
              fontSize: "20px",
              padding: "4px",
              maxWidth: "200px"
            }}
          >
            {ALL_PICKER_EMOJIS.map((emoji) => {
              const alreadyReactedWithThisEmoji = (msg.reactions || []).some(
                (r) => r.userId === currentUserId && r.emoji === emoji
              );
              return (
                <span
                  key={emoji}
                  style={{ cursor: "pointer", textAlign: "center", transition: "transform 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onClick={() => onReact(msg.id, emoji, alreadyReactedWithThisEmoji)}
                >
                  {emoji}
                </span>
              );
            })}
          </div>
        }
      >
        <span
          style={{
            cursor: "pointer",
            fontSize: "14px",
            background: "#f0f2f5",
            borderRadius: "50%",
            width: "24px",
            height: "24px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: "4px"
          }}
        >
          ➕
        </span>
      </Popover>
    </div>
  );

  if (msg.senderId === "system" || msg.senderId === "SYSTEM" || (msg.messageType as string) === "SYSTEM") {
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0", width: "100%" }}>
        <div
          style={{
            background: "rgba(0, 0, 0, 0.06)",
            color: "#54656f",
            padding: "4px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            textAlign: "center",
            maxWidth: "85%",
          }}
        >
          {msg.message}
        </div>
      </div>
    );
  }

  const reactionEntries = Object.entries(reactionGroups);
  const displayReactions = reactionEntries.slice(0, 3);
  const extraReactions = reactionEntries.slice(3);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        justifyContent: isOwn ? "flex-end" : "flex-start",
        marginBottom: "8px",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ maxWidth: "70%", position: "relative" }}>
        {!isOwn && isChannelView && (
          <span
            style={{
              fontSize: "12px",
              color: "#8c8c8c",
              marginLeft: "8px",
              marginBottom: "2px",
              display: "block",
            }}
          >
            {senderName || "Unknown colleague"}
          </span>
        )}

        {/* Hover Action Bar */}
        {(isHovered || isPopoverOpen || isDropdownOpen) && !msg.deleted && (
          <div
            style={{
              position: "absolute",
              top: "-20px",
              [isOwn ? "left" : "right"]: "8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "#ffffff",
              border: "1px solid #f0f0f0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              borderRadius: "20px",
              padding: "2px 6px",
              zIndex: 100,
              animation: "fadeIn 0.2s ease-in-out",
            }}
          >
            <Popover
              trigger="click"
              content={quickReactContent}
              placement="top"
              onOpenChange={(visible) => setIsPopoverOpen(visible)}
            >
              <Button
                type="text"
                size="small"
                shape="circle"
                icon={<FiSmile style={{ fontSize: "14px", color: "#8c8c8c" }} />}
              />
            </Popover>
            <Button
              type="text"
              size="small"
              shape="circle"
              icon={<FiCornerUpLeft style={{ fontSize: "14px", color: "#8c8c8c" }} />}
              onClick={() => onReply(msg)}
            />
            <Dropdown
              menu={{ items: contextMenuItems }}
              trigger={["click"]}
              onOpenChange={(visible) => setIsDropdownOpen(visible)}
            >
              <Button
                type="text"
                size="small"
                shape="circle"
                icon={<FiMoreVertical style={{ fontSize: "14px", color: "#8c8c8c" }} />}
              />
            </Dropdown>
          </div>
        )}

        {/* Message Bubble Wrapped with Right-Click Context Menu */}
        {msg.deleted ? (
          <div
            style={{
              background: isOwn ? "#d9fdd3" : "#ffffff",
              color: "#111b21",
              padding: "8px 12px",
              borderRadius: isOwn ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              boxShadow: "0 1px 0.5px rgba(0,0,0,0.12)",
              position: "relative",
              border: "none",
            }}
          >
            <span style={{ fontStyle: "italic", opacity: 0.6 }}>{msg.message}</span>
          </div>
        ) : (
          <Dropdown menu={{ items: contextMenuItems }} trigger={["contextMenu"]}>
            <div
              style={{
                background: isOwn ? "#d9fdd3" : "#ffffff",
                color: "#111b21",
                padding: "8px 12px",
                borderRadius: isOwn ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                boxShadow: "0 1px 0.5px rgba(0,0,0,0.12)",
                position: "relative",
                border: "none",
                cursor: "context-menu",
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

              {msg.messageType === "IMAGE" && msg.attachmentUrl && (
                <div
                  style={{ marginBottom: "6px", cursor: "pointer" }}
                  onClick={() => onPreviewImage(msg.attachmentUrl || "")}
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

              {msg.messageType === "VIDEO" && msg.attachmentUrl && (
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

              {msg.messageType === "AUDIO" && msg.attachmentUrl && (
                <div style={{ marginBottom: "6px" }}>
                  <audio src={msg.attachmentUrl} controls style={{ maxWidth: "100%" }} />
                </div>
              )}

              {msg.messageType === "DOCUMENT" && msg.attachmentUrl && (
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
                    <span style={{ fontSize: "10px", opacity: 0.6 }}>
                      {formatBytes(msg.attachmentSize || 0)}
                    </span>
                  </div>
                  <a href={msg.attachmentUrl} download={msg.attachmentName}>
                    <Button type="text" shape="circle" icon={<FiDownload />} />
                  </a>
                </div>
              )}

              <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                {renderMessageText(msg.message)}
              </div>

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
                {isOwn && !msg.deleted && (isRead ? <FiCheckCircle style={{ color: "#52c41a" }} /> : <FiCheck />)}
              </div>

              {/* Emoji Reactions Layout below Bubble */}
              {reactionEntries.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    marginTop: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  {displayReactions.map(([emoji, userIds]) => {
                    const hasReacted = userIds.includes(currentUserId || "");
                    const userNames = userIds.map((uid) => {
                      if (uid === currentUserId) return "You";
                      const u = users.find((user) => user.id === uid);
                      return u ? u.name : "Unknown Colleague";
                    });

                    const popoverContent = (
                      <div style={{ padding: "4px 8px" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "13px" }}>
                          {emoji} Reacted by:
                        </div>
                        <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "12px", color: "#595959" }}>
                          {userNames.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    );

                    return (
                      <Popover key={emoji} content={popoverContent} trigger="hover" placement="top">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onReact(msg.id, emoji, hasReacted);
                          }}
                          style={{
                            background: hasReacted ? "#d9fdd3" : "rgba(0,0,0,0.05)",
                            border: hasReacted ? "1px solid #10b981" : "1px solid transparent",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.2s",
                          }}
                        >
                          <span>{emoji}</span>
                          <span style={{ fontWeight: "bold", opacity: 0.8 }}>{userIds.length}</span>
                        </span>
                      </Popover>
                    );
                  })}

                  {extraReactions.length > 0 && (
                    <Popover
                      content={
                        <div style={{ padding: "4px 8px" }}>
                          <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "13px" }}>
                            Other Reactions:
                          </div>
                          {extraReactions.map(([emoji, userIds]) => {
                            const userNames = userIds.map((uid) => {
                              if (uid === currentUserId) return "You";
                              const u = users.find((user) => user.id === uid);
                              return u ? u.name : "Unknown Colleague";
                            });
                            return (
                              <div key={emoji} style={{ marginBottom: "6px" }}>
                                <strong>{emoji}</strong> by: {userNames.join(", ")}
                              </div>
                            );
                          })}
                        </div>
                      }
                      trigger="hover"
                      placement="top"
                    >
                      <span
                        style={{
                          background: "rgba(0,0,0,0.05)",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          display: "inline-flex",
                          alignItems: "center",
                          fontWeight: "bold",
                          opacity: 0.8,
                          cursor: "default",
                        }}
                      >
                        +{extraReactions.length}
                      </span>
                    </Popover>
                  )}
                </div>
              )}
            </div>
          </Dropdown>
        )}
      </div>
    </div>
  );
}

export default React.memo(MessageItem);
