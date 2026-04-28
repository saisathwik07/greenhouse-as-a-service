/** Maps DB/API plan values to user-facing labels (Premium, not "Pro"). */
export function formatPlanDisplayName(plan) {
  const p = String(plan ?? "").toLowerCase().trim();
  if (p === "pro" || p === "premium") return "Premium";
  if (p === "basic" || p === "free") return "Basic";
  if (p === "standard") return "Standard";
  if (p === "none" || p === "") return "Guest";
  return plan ? String(plan).replace(/^./, (c) => c.toUpperCase()) : "Basic";
}

export function isPaidPremiumPlan(plan) {
  const p = String(plan ?? "").toLowerCase();
  return p === "pro" || p === "premium";
}
