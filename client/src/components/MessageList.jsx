import React from 'react';
import Message from './Message';
import '../styles/MessageList.css';

const MessageList = ({ messages }) => {
  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <Message
          key={index}
          role={message.role}
          content={message.content}
          reasoning={message.reasoning}
          timestamp={message.timestamp}
        />
      ))}
    </div>
  );
};

export default MessageList;

