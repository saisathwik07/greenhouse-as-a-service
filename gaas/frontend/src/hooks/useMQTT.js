import { useEffect, useMemo, useRef, useState } from "react";
import mqtt from "mqtt";

const DEFAULT_TOPICS = [
  "greenhouse/temperature",
  "greenhouse/humidity",
  "greenhouse/light"
];

const MAX_MESSAGES = 50;

function normalizeBrokerUrl(inputUrl) {
  if (!inputUrl) return "ws://localhost:9001";
  if (inputUrl.startsWith("ws://") || inputUrl.startsWith("wss://")) return inputUrl;
  if (inputUrl.startsWith("mqtt://")) {
    const host = inputUrl.replace("mqtt://", "").replace(/:\d+$/, "");
    return `ws://${host}:9001`;
  }
  return inputUrl;
}

export function useMQTT(initialBrokerUrl = "mqtt://localhost:1883") {
  const clientRef = useRef(null);
  const simulatorRef = useRef(null);

  const [brokerUrl, setBrokerUrl] = useState(initialBrokerUrl);
  const [topicInput, setTopicInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [lastError, setLastError] = useState("");

  const latestByTopic = useMemo(() => {
    const byTopic = {};
    for (const msg of messages) {
      if (!byTopic[msg.topic]) byTopic[msg.topic] = msg;
    }
    return byTopic;
  }, [messages]);

  const pushMessage = (topic, rawMessage) => {
    const value = typeof rawMessage === "string" ? rawMessage : rawMessage?.toString?.() ?? "";
    const msg = {
      topic,
      value,
      time: new Date().toLocaleTimeString()
    };
    setMessages((prev) => [msg, ...prev].slice(0, MAX_MESSAGES));
  };

  const subscribeTopic = (topic) => {
    const trimmed = topic.trim();
    if (!trimmed || !clientRef.current || !connected) return;
    clientRef.current.subscribe(trimmed, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      setSubscriptions((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    });
  };

  const unsubscribeTopic = (topic) => {
    if (!clientRef.current || !connected) return;
    clientRef.current.unsubscribe(topic, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      setSubscriptions((prev) => prev.filter((t) => t !== topic));
    });
  };

  const startSimulation = () => {
    if (!clientRef.current || simulatorRef.current) return;
    simulatorRef.current = setInterval(() => {
      if (!clientRef.current || !connected) return;
      const simulated = [
        ["greenhouse/temperature", JSON.stringify({ value: +(25 + Math.random() * 5).toFixed(2) })],
        ["greenhouse/humidity", JSON.stringify({ value: +(55 + Math.random() * 15).toFixed(2) })],
        ["greenhouse/light", JSON.stringify({ value: +(300 + Math.random() * 100).toFixed(0) })]
      ];
      for (const [topic, payload] of simulated) {
        clientRef.current.publish(topic, payload);
      }
    }, 2000);
  };

  const stopSimulation = () => {
    if (simulatorRef.current) {
      clearInterval(simulatorRef.current);
      simulatorRef.current = null;
    }
  };

  const handleConnect = () => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }

    setConnecting(true);
    setLastError("");
    const client = mqtt.connect(normalizeBrokerUrl(brokerUrl), {
      reconnectPeriod: 2000,
      connectTimeout: 5000
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConnected(true);
      setConnecting(false);
      DEFAULT_TOPICS.forEach((topic) => subscribeTopic(topic));
      startSimulation();
    });

    client.on("reconnect", () => {
      console.log("Reconnecting...");
      setConnecting(true);
    });

    client.on("message", (topic, message) => {
      pushMessage(topic, message);
    });

    client.on("error", (err) => {
      console.error(err);
      setLastError(err?.message || "MQTT error");
    });

    client.on("offline", () => {
      setConnected(false);
    });

    client.on("close", () => {
      setConnected(false);
      setConnecting(false);
      stopSimulation();
    });
  };

  const handleDisconnect = () => {
    stopSimulation();
    if (clientRef.current) {
      clientRef.current.end();
      clientRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    setSubscriptions([]);
  };

  const handleSubscribe = () => {
    subscribeTopic(topicInput);
    setTopicInput("");
  };

  const handleUnsubscribe = (topic) => {
    unsubscribeTopic(topic);
  };

  useEffect(() => () => {
    stopSimulation();
    if (clientRef.current) clientRef.current.end(true);
  }, []);

  return {
    brokerUrl,
    setBrokerUrl,
    topicInput,
    setTopicInput,
    connected,
    connecting,
    subscriptions,
    messages,
    latestByTopic,
    lastError,
    handleConnect,
    handleDisconnect,
    handleSubscribe,
    handleUnsubscribe
  };
}
