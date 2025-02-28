import React from "react";

function ChatHistory({ messages }) {
  return (
    <div className="chat-messages">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`message ${
            message.sender === "Bedrock" ? "bedrock-message" : "user-message"
          }`}
        >
          {message.sender === "Bedrock" && <strong>Bedrock: </strong>}
          {message.sender === "User" && <strong>User: </strong>}
          {message.content}
        </div>
      ))}
    </div>
  );
}

export default ChatHistory;
