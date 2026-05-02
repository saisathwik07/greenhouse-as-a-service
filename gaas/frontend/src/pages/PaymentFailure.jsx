import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

/**
 * Reached when Razorpay reports a failed payment, the signature verification
 * fails, or the user closes the checkout modal after a real attempt.
 *
 * `location.state` may contain { reason, code, paymentId, orderId, plan }.
 * Query string carries the same values for direct/manual navigation.
 */
export default function PaymentFailure() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const reason =
    location.state?.reason ||
    params.get("reason") ||
    "Your payment did not complete. No charge has been made.";
  const code = location.state?.code || params.get("code") || null;
  const paymentId = location.state?.paymentId || params.get("paymentId") || null;
  const orderId = location.state?.orderId || params.get("orderId") || null;
  const plan = location.state?.plan || params.get("plan") || null;

  return (
    <div className="max-w-2xl mx-auto animate-in">
      <div className="glass-card p-7 border-red-300 bg-red-50/40">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-red-500 text-white flex items-center justify-center text-2xl font-bold shrink-0">
            !
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-red-900">Payment failed</h1>
            <p className="text-sm text-red-900/80 mt-1">{reason}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-sm">
          {code && (
            <p className="text-gaas-text">
              <span className="text-gaas-muted">Code:</span>{" "}
              <span className="font-mono">{code}</span>
            </p>
          )}
          {plan && (
            <p className="text-gaas-text">
              <span className="text-gaas-muted">Selected plan:</span> {plan}
            </p>
          )}
          {orderId && (
            <p className="text-gaas-text break-all">
              <span className="text-gaas-muted">Order ID:</span>{" "}
              <span className="font-mono">{orderId}</span>
            </p>
          )}
          {paymentId && (
            <p className="text-gaas-text break-all">
              <span className="text-gaas-muted">Payment ID:</span>{" "}
              <span className="font-mono">{paymentId}</span>
            </p>
          )}
        </div>

        <div className="mt-6 rounded-lg bg-white/80 border border-red-200 p-3 text-xs text-gaas-muted">
          <p className="font-semibold text-gaas-heading mb-1">What to do next</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Try again with a different card or UPI app.</li>
            <li>If the amount was deducted, it will be auto-reversed within 5–7 business days.</li>
            <li>Still stuck? <Link to="/help" className="text-gaas-accent font-semibold">Contact support</Link> with your order ID.</li>
          </ul>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/subscription", { replace: true })}
          >
            Try again
          </button>
          <Link to="/billing" className="btn-secondary">
            View billing
          </Link>
          <Link to="/" className="btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
