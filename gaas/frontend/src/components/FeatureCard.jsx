import { Link } from "react-router-dom";

export default function FeatureCard({ icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="glass-card p-5 block text-left no-underline hover:border-gaas-accent/40 hover:shadow-glow transition-all duration-300 cursor-pointer group rounded-xl shadow-card"
    >
      {icon != null && icon !== "" && <div className="text-2xl mb-2" aria-hidden>{icon}</div>}
      <h2 className="text-base font-semibold text-gaas-heading group-hover:text-gaas-accent transition-colors">
        {title}
      </h2>
      <p className="text-sm text-gaas-muted mt-1.5 leading-relaxed">{description}</p>
    </Link>
  );
}
