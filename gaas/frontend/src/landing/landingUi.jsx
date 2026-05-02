/** Minimal substitutes for `@/components/ui/*` — landing route only */

export function LCard({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function LCardContent({ className = "p-6", children, ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
