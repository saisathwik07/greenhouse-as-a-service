import FeatureCard from "../components/FeatureCard";

const FEATURES = [
  {
    to: "/",
    title: "Dashboard",
    description: "Greenhouse overview, rows, bags, and at-a-glance health.",
    icon: "📊",
  },
  {
    to: "/data",
    title: "Data",
    description: "Sensor history, charts, and time-range exploration.",
    icon: "📈",
  },
  {
    to: "/agriculture",
    title: "Agricultural Services",
    description: "Crop prediction, fertilizer guidance, and fertigation tools.",
    icon: "🌾",
  },
  {
    to: "/mqtt",
    title: "IoT / MQTT",
    description: "Broker topics, connection status, and live message context.",
    icon: "📡",
  },
  {
    to: "/ai",
    title: "AI Analytics",
    description: "Predictions, anomaly detection, and clustering insights.",
    icon: "🤖",
  },
  {
    to: "/pro",
    title: "Premium hub",
    description: "Plans, upgrades, and Premium feature access.",
    icon: "⭐",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-gaas-heading">Navigation hub</h1>
        <p className="text-sm text-gaas-muted mt-0.5">
          Jump to any section of Greenhouse as a Service.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <FeatureCard key={f.to} icon={f.icon} title={f.title} description={f.description} to={f.to} />
        ))}
      </div>
    </div>
  );
}
