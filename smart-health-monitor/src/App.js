import React, { useState, useEffect } from "react";
import "./App.css";
import ChatHistory from "./components/ChatHistory";
import ChatPrompt from "./components/ChatPrompt";
import AlertPanel from "./components/AlertPanel";
import HealthAnalysis from "./components/HealthAnalysis";
import ActionButtons from "./components/ActionButtons";
import axios from "axios";

function App() {
  const [messages, setMessages] = useState([]);

  const [conId, setConId] = useState("");

  const healthData = {
    weight: {
      value: 72,
      unit: "kg",
      avg: 70,
    },
    steps: {
      value: 8500,
      avg: 7800,
    },
    heartRate: {
      value: 95,
      unit: "BPM",
      avg: 80,
    },
    calories: {
      value: 2200,
      unit: "kcal",
      avg: 2000,
    },
    sleep: {
      value: 6.5,
      unit: "hrs",
      avg: 7.0,
    },
  };

  const invokeBedrock = async (message) => {
    try {
      const payload = {
        userId: "12345",
        conversationId: conId,
        userMessage: message,
        symptoms: [message],
      };

      const response = await axios.post(
        "https://6wj4r38msb.execute-api.us-west-2.amazonaws.com/default/submit-symptoms",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      console.log(response);

      // ✅ Return the message instead of setting state
      if (response.data?.messages) {
        return { sender: "Bedrock", content: response.data.messages[0].text };
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      return null; // Return null in case of an error
    }
  };

  const startConversation = async () => {
    try {
      const payload = {
        userId: "12345",
      };

      const response = await axios.post(
        "https://nhwl24b7le.execute-api.us-west-2.amazonaws.com/default/start-conversation",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      console.log(response);
      setConId(response.data.conversationId);
      if (response.data?.messages) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "Bedrock", content: response.data.messages[0].text },
        ]);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  useEffect(() => {
    startConversation();
  }, []);

  const handleSendMessage = (message) => {
    // Add user message
    const newMessages = [...messages, { sender: "User", content: message }];
    setMessages(newMessages);

    var msg = invokeBedrock(message);

    // Simulate AI response (in a real app, this would be an API call)
    setTimeout(() => {
      setMessages([...newMessages, msg]);
    }, 1000);
  };

  return (
    <div className="app">
      <header>
        <h1>Smart Health Consultant</h1>
      </header>

      <div className="container">
        <div className="chat-container">
          <h2>Chat with AIxpert</h2>
          <ChatHistory messages={messages} />
          <ChatPrompt onSendMessage={handleSendMessage} />
        </div>

        <div className="health-dashboard">
          <AlertPanel message="Your heart rate is 25% above normal." />
          <HealthAnalysis healthData={healthData} />
          <ActionButtons />
        </div>
      </div>
    </div>
  );
}

export default App;
