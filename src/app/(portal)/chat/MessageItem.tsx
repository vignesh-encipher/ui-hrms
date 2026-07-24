import React, { useMemo } from "react";
import { Button, Popover, Space } from "antd";
import { FiFile, FiDownload, FiCheck, FiCheckCircle } from "react-icons/fi";
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

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "🎉"];

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

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isOwn ? "flex-end" : "flex-start",
        marginBottom: "8px",
      }}
    >
      <div style={{ maxWidth: "70%" }}>
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
            <span style={{ fontStyle: "italic", opacity: 0.6 }}>{msg.message}</span>
          ) : (
            <>
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
            {isOwn && !msg.deleted && (isRead ? <FiCheckCircle style={{ color: "#52c41a" }} /> : <FiCheck />)}
          </div>

          <div
            style={{
              display: "flex",
              gap: "6px",
              marginTop: "6px",
              flexWrap: "wrap",
            }}
          >
            {Object.entries(reactionGroups).map(([emoji, userIds]) => {
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
          </div>
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
                  <div style={{ display: "flex", gap: "8px", fontSize: "16px" }}>
                    {REACTION_EMOJIS.map((emoji) => {
                      const alreadyReactedWithThisEmoji = (msg.reactions || []).some(
                        (r) => r.userId === currentUserId && r.emoji === emoji
                      );
                      return (
                        <span
                          key={emoji}
                          style={{ cursor: "pointer" }}
                          onClick={() => onReact(msg.id, emoji, alreadyReactedWithThisEmoji)}
                        >
                          {emoji}
                        </span>
                      );
                    })}
                  </div>
                }
              >
                <Button type="link" size="small" style={{ padding: 0 }}>
                  React
                </Button>
              </Popover>

              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onReply(msg)}>
                Reply
              </Button>

              {isOwn && (
                <>
                  <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onEdit(msg)}>
                    Edit
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    style={{ padding: 0 }}
                    onClick={() => onDelete(msg.id, "everyone")}
                  >
                    Delete
                  </Button>
                </>
              )}
            </Space>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(MessageItem);
