export default function ExternalLinkButton({ label, filePath }) {
  return (
    <button
      type="button"
      onClick={() => window.open(filePath, "_blank")}
      className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gaas-accent text-white shadow-card hover:bg-gaas-accent-dark hover:shadow-glow transition-all duration-200 active:scale-[0.98]"
    >
      {label}
    </button>
  );
}
