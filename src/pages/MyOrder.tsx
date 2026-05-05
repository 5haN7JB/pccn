import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type OrderStatus = "new" | "preparing" | "ready" | "delivered";

interface OrderItem {
  item_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderData {
  id: string;
  order_code: string;
  customer_name: string;
  status: OrderStatus;
  total_amount: number | null;
}

const statusToStep: Record<string, OrderStatus> = {
  new: "new",
  preparing: "preparing",
  ready: "ready",
  delivered: "delivered",
};

const steps: { key: OrderStatus; label: string }[] = [
  { key: "new", label: "Placed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
];

const statusMessages: Record<OrderStatus, string> = {
  new: "We've got your order!",
  preparing: "Chef is cooking your food",
  ready: "Almost there...",
  delivered: "Enjoy your meal!",
};

const nextStatus: Record<OrderStatus, OrderStatus> = {
  new: "preparing",
  preparing: "ready",
  ready: "delivered",
  delivered: "delivered",
};

type Screen = "tracking" | "bill" | "confirmed";

const MyOrder = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const displayId = orderId ?? "";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [status, setStatus] = useState<OrderStatus>("new");
  const [screen, setScreen] = useState<Screen>("tracking");

  // Fetch order + items from Supabase
  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setNotFound(false);

      // 1. Fetch order row
      const { data: orderRow, error: orderErr } = await supabase
        .from("orders")
        .select("id, order_code, customer_name, status, total_amount")
        .eq("order_code", displayId)
        .single();

      if (orderErr || !orderRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrder(orderRow as OrderData);
      setStatus(statusToStep[orderRow.status] ?? "new");

      // 2. Fetch order items
      const { data: itemRows } = await supabase
        .from("order_items")
        .select("item_name, quantity, unit_price")
        .eq("order_id", orderRow.id);

      setItems((itemRows as OrderItem[]) ?? []);
      setLoading(false);
    };

    if (displayId) {
      fetchOrder();
    } else {
      setNotFound(true);
      setLoading(false);
    }
  }, [displayId]);

  // Realtime subscription for status and total_amount changes
  useEffect(() => {
    if (!order) return;

    const channel = supabase
      .channel(`my-order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const u = payload.new as any;
          if (u.status && statusToStep[u.status]) {
            setStatus(statusToStep[u.status]);
          }
          if (u.total_amount !== undefined) {
            setOrder((prev) =>
              prev ? { ...prev, total_amount: u.total_amount, status: statusToStep[u.status] ?? prev.status } : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const total = order?.total_amount ?? items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const currentIdx = steps.findIndex((s) => s.key === status);

  const advanceStatus = async () => {
    if (status === "delivered") return;
    const next = nextStatus[status];
    // Update locally
    setStatus(next);
    // Also update in Supabase
    if (order) {
      await supabase
        .from("orders")
        .update({ status: next })
        .eq("id", order.id);
    }
  };

  /* ─── Shared styles ─── */
  const accent = "#EB5158";
  const card: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
    padding: 24,
  };
  const primaryBtn: React.CSSProperties = {
    width: "100%",
    padding: "14px 0",
    backgroundColor: accent,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: 600,
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    transition: "opacity 0.15s",
  };
  const ghostBtn: React.CSSProperties = {
    ...primaryBtn,
    backgroundColor: "#FFFFFF",
    color: accent,
    border: `2px solid ${accent}`,
  };

  const hover = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.opacity = "0.88");
  const unhover = (e: React.MouseEvent<HTMLButtonElement>) =>
    (e.currentTarget.style.opacity = "1");

  const pageBase: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "#FAF7F2",
    fontFamily: "'Inter', sans-serif",
  };

  /* ─── LOADING STATE ─── */
  if (loading) {
    return (
      <div
        style={{
          ...pageBase,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `4px solid ${accent}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── NOT FOUND STATE ─── */
  if (notFound || !order) {
    return (
      <div
        style={{
          ...pageBase,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", marginBottom: 8 }}>
          Order not found
        </div>
        <div style={{ fontSize: 14, color: "#888888" }}>
          No order matching <strong>{displayId}</strong> was found.
        </div>
      </div>
    );
  }

  const customerName = order.customer_name;

  /* ─── SCREEN 3: Payment Confirmed ─── */
  if (screen === "confirmed") {
    return (
      <div
        style={{
          ...pageBase,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        {/* Checkmark circle */}
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            backgroundColor: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", marginBottom: 16 }}>
          Payment Confirmed!
        </div>

        {/* Order ID pill */}
        <div
          style={{
            display: "inline-block",
            backgroundColor: "#FAF7F2",
            border: `1.5px solid ${accent}`,
            color: accent,
            fontWeight: 600,
            fontSize: 14,
            padding: "8px 22px",
            borderRadius: 999,
            marginBottom: 16,
          }}
        >
          {displayId}
        </div>

        <div style={{ fontSize: 15, color: "#888888", marginBottom: 8, maxWidth: 280 }}>
          Show this Order ID to the staff at the exit
        </div>
        <div style={{ fontSize: 13, color: "#AAAAAA" }}>Thank you for dining with us</div>
      </div>
    );
  }

  /* ─── SCREEN 2: Bill & Payment ─── */
  if (screen === "bill") {
    return (
      <div style={pageBase}>
        {/* Top bar */}
        <header
          style={{
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid #EFEFEF",
            padding: "16px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 22, color: accent }}>PCCN</div>
          <div style={{ fontSize: 13, color: "#888888", marginTop: 2 }}>{displayId}</div>
        </header>

        <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 40px" }}>
          {/* Itemized bill card */}
          <div style={{ ...card, marginBottom: 20 }}>
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < items.length - 1 ? "1px solid #F2F2F2" : "none",
                }}
              >
                <span style={{ fontSize: 15, color: "#1A1A1A" }}>
                  {item.item_name} x{item.quantity}
                </span>
                <span style={{ fontSize: 15, color: "#1A1A1A", fontWeight: 500 }}>
                  ₹{(item.unit_price * item.quantity).toLocaleString("en-IN")}
                </span>
              </div>
            ))}

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: "#E0E0E0", margin: "12px 0" }} />

            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A" }}>Total</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: accent }}>
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Pay buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              style={primaryBtn}
              onClick={() => setScreen("confirmed")}
              onMouseEnter={hover}
              onMouseLeave={unhover}
            >
              Pay with UPI
            </button>
            <button
              style={ghostBtn}
              onClick={() => setScreen("confirmed")}
              onMouseEnter={hover}
              onMouseLeave={unhover}
            >
              Pay Cash to Staff
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* ─── SCREEN 1: Order Tracking (default) ─── */
  return (
    <div style={pageBase}>
      {/* Top bar */}
      <header
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #EFEFEF",
          padding: "16px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 22, color: accent }}>PCCN</div>
        <div style={{ fontSize: 13, color: "#888888", marginTop: 2 }}>{displayId}</div>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Customer name */}
        <div
          style={{
            textAlign: "center",
            fontSize: 18,
            fontWeight: 600,
            color: "#1A1A1A",
            marginBottom: 28,
          }}
        >
          {customerName}
        </div>

        {/* Progress bar */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 32,
            padding: "0 4px",
          }}
        >
          {steps.map((step, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            const circleColor = done || active ? accent : "#D0D0D0";
            const lineColor = i < currentIdx ? accent : "#D0D0D0";

            return (
              <div
                key={step.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  position: "relative",
                }}
              >
                {/* Connecting line (before circle, except first) */}
                {i > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: "50%",
                      width: "100%",
                      height: 3,
                      backgroundColor: lineColor,
                      zIndex: 0,
                    }}
                  />
                )}

                {/* Circle */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: circleColor,
                    zIndex: 1,
                    position: "relative",
                    boxShadow: active ? `0 0 0 6px rgba(235,81,88,0.18)` : "none",
                    animation: active ? "pulse 1.8s infinite" : "none",
                  }}
                />

                {/* Label */}
                <span
                  style={{
                    fontSize: 11,
                    color: done || active ? "#1A1A1A" : "#AAAAAA",
                    fontWeight: active ? 600 : 400,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Status message */}
        <div
          style={{
            textAlign: "center",
            fontSize: 15,
            color: "#888888",
            marginBottom: 24,
          }}
        >
          {statusMessages[status]}
        </div>

        {/* Order items card */}
        <div style={{ ...card, marginBottom: 20 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: i < items.length - 1 ? "1px solid #F2F2F2" : "none",
                fontSize: 15,
                color: "#1A1A1A",
              }}
            >
              <span>
                {item.item_name} x{item.quantity}
              </span>
              <span style={{ fontWeight: 500 }}>
                ₹{(item.unit_price * item.quantity).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
          <div style={{ height: 1, backgroundColor: "#E0E0E0", margin: "10px 0" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span style={{ color: "#1A1A1A" }}>Total</span>
            <span style={{ color: accent }}>₹{total.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* View Bill button (when delivered and bill has been issued) */}
        {status === "delivered" && order?.total_amount != null && (
          <button
            style={{ ...primaryBtn, marginBottom: 16 }}
            onClick={() => setScreen("bill")}
            onMouseEnter={hover}
            onMouseLeave={unhover}
          >
            View Bill &amp; Pay
          </button>
        )}

        {/* DEV: Simulate next status */}
        {status !== "delivered" && (
          <button
            onClick={advanceStatus}
            style={{
              width: "100%",
              padding: "12px 0",
              backgroundColor: "transparent",
              color: "#AAAAAA",
              fontSize: 13,
              fontWeight: 500,
              border: "1px dashed #D0D0D0",
              borderRadius: 14,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Simulate next status →
          </button>
        )}
      </main>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(235,81,88,0.35); }
          70% { box-shadow: 0 0 0 10px rgba(235,81,88,0); }
          100% { box-shadow: 0 0 0 0 rgba(235,81,88,0); }
        }
      `}</style>
    </div>
  );
};

export default MyOrder;
