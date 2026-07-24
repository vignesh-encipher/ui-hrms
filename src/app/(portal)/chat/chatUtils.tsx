import React from "react";

export const renderMessageText = (text: string) => {
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

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = 2;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
