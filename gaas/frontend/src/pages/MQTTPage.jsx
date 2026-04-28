import ExternalLinkButton from "../components/ExternalLinkButton";
import { useMQTT } from "../hooks/useMQTT";
import UpgradeLock from "../components/UpgradeLock";
import { useSubscription } from "../hooks/useSubscription";

export default function MQTTPage() {
  const { canAccess } = useSubscription();
  const allowed = canAccess("mqtt");
  const {
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
  } = useMQTT("mqtt://localhost:1883");

  const connectionStatus = connecting ? "checking" : connected ? "connected" : "disconnected";

  const statusColor = {
    connected: "text-gaas-healthy",
    disconnected: "text-gaas-unhealthy",
    checking: "text-gaas-moderate"
  };

  const statusBg = {
    connected: "bg-gaas-healthy/15",
    disconnected: "bg-gaas-unhealthy/15",
    checking: "bg-gaas-moderate/15"
  };

  return (
    <div className="relative space-y-6 animate-in">
      <div className={allowed ? "" : "pointer-events-none blur-[1px] select-none"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gaas-heading">IoT / MQTT</h1>
          <p className="text-sm text-gaas-muted mt-0.5">MQTT broker status and topic monitoring</p>
        </div>
        <ExternalLinkButton label="Open MQTT Panel" filePath="/MQTT.html" />
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${connected ? "bg-gaas-healthy animate-pulse-slow" : "bg-gaas-unhealthy"}`} />
          <div>
            <p className={`text-sm font-semibold capitalize ${statusColor[connectionStatus]}`}>
              MQTT {connectionStatus}
            </p>
            <p className="text-xs text-gaas-muted">
              {connected ? "Connected to broker and listening to topics" : "Disconnected from broker"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
          <input
            type="text"
            value={brokerUrl}
            onChange={(e) => setBrokerUrl(e.target.value)}
            className="input-field w-full"
            placeholder="mqtt://localhost:1883"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleConnect} className="btn-primary" disabled={connected || connecting}>
              Connect
            </button>
            <button type="button" onClick={handleDisconnect} className="btn-secondary" disabled={!connected && !connecting}>
              Disconnect
            </button>
          </div>
        </div>
        {lastError && <p className="text-xs text-gaas-unhealthy mt-2">{lastError}</p>}
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-gaas-muted uppercase tracking-wider mb-3">Topic Subscription</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mb-4">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="input-field w-full"
            placeholder="greenhouse/temperature"
          />
          <button type="button" onClick={handleSubscribe} className="btn-primary" disabled={!connected || !topicInput.trim()}>
            Subscribe
          </button>
        </div>

        <h3 className="text-xs font-semibold text-gaas-muted uppercase tracking-wider mb-2">
          Active Subscriptions ({subscriptions.length})
        </h3>
        {subscriptions.length === 0 ? (
          <div className="text-center py-6 text-gaas-muted">No active subscriptions</div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((topic) => (
              <div key={topic} className="flex items-center justify-between bg-gaas-bg rounded-lg px-4 py-3">
                <code className="text-xs font-mono text-gaas-accent">{topic}</code>
                <div className="flex items-center gap-2">
                  <span className={`badge ${statusBg[connectionStatus]} ${statusColor[connectionStatus]}`}>
                    {connected ? "Active" : "Inactive"}
                  </span>
                  <button type="button" onClick={() => handleUnsubscribe(topic)} className="btn-secondary text-xs px-2.5 py-1">
                    Unsubscribe
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-gaas-muted uppercase tracking-wider mb-3">
          Latest Per Topic ({Object.keys(latestByTopic).length})
        </h2>
        {Object.keys(latestByTopic).length === 0 ? (
          <div className="text-center py-6 text-gaas-muted">No topic data yet</div>
        ) : (
          <div className="space-y-2">
            {Object.values(latestByTopic).map((msg, i) => (
              <div key={`${msg.topic}-${i}`} className="flex items-center justify-between bg-gaas-bg rounded-lg px-4 py-3">
                <div>
                  <code className="text-xs font-mono text-gaas-accent">{msg.topic}</code>
                  <p className="text-[11px] text-gaas-muted mt-0.5">{msg.time}</p>
                </div>
                <p className="text-xs text-gaas-heading tabular-nums text-right">{msg.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-gaas-muted uppercase tracking-wider mb-3">
          Recent Messages ({messages.length})
        </h2>
        {messages.length === 0 ? (
          <div className="text-center py-6 text-gaas-muted">No recent messages</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gaas-border">
                  <th className="text-left text-xs text-gaas-muted font-medium py-2 px-3">Time</th>
                  <th className="text-left text-xs text-gaas-muted font-medium py-2 px-3">Topic</th>
                  <th className="text-left text-xs text-gaas-muted font-medium py-2 px-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg, i) => (
                  <tr key={i} className="border-b border-gaas-border/50 hover:bg-gaas-bg/50 transition-colors">
                    <td className="py-2 px-3 text-xs tabular-nums">{msg.time}</td>
                    <td className="py-2 px-3"><code className="text-[10px] text-gaas-accent font-mono">{msg.topic}</code></td>
                    <td className="py-2 px-3 text-xs">{msg.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      {!allowed && (
        <UpgradeLock
          title="Upgrade Required"
          message="MQTT / Real-time IoT Dashboard is available on the Premium plan."
        />
      )}
    </div>
  );
}
