import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Status = "new" | "preparing" | "ready" | "delivered";

interface OrderItemRow {
  item_name: string;
  quantity: number;
}

interface Order {
  id: string;
  order_code: string;
  seat_number: number;
  customer_name: string;
  items: OrderItemRow[];
  created_at: string;
  status: Status;
}

const badgeStyles: Record<Status, { bg: string; color: string; label: string }> = {
  new: { bg: "#FFF0F0", color: "#EB5158", label: "New" },
  preparing: { bg: "#FFF8E6", color: "#E6A817", label: "Preparing" },
  ready: { bg: "#EDFAF3", color: "#27AE60", label: "Ready" },
  delivered: { bg: "#EDF2FF", color: "#3B6EE8", label: "Delivered" },
};

const nextStatus: Record<Status, Status> = {
  new: "preparing",
  preparing: "ready",
  ready: "delivered",
  delivered: "delivered",
};

const actionLabel: Record<Status, string> = {
  new: "Start Preparing",
  preparing: "Mark Ready",
  ready: "Delivered",
  delivered: "Done ✓",
};

function timeAgo(created: string): string {
  const diff = Math.floor((Date.now() - new Date(created).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff === 1) return "1 min ago";
  if (diff < 60) return `${diff} min ago`;
  const hrs = Math.floor(diff / 60);
  return hrs === 1 ? "1 hr ago" : `${hrs} hrs ago`;
}

const Staff = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  // Re-render every 30s so "time ago" stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Fetch a single order with items + seat
  const fetchFullOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    const { data: row } = await supabase
      .from("orders")
      .select("id, order_code, customer_name, status, created_at, seat_id, seats(seat_number)")
      .eq("id", orderId)
      .single();

    if (!row) return null;

    const { data: itemRows } = await supabase
      .from("order_items")
      .select("item_name, quantity")
      .eq("order_id", row.id);

    const seatObj = row.seats as any;
    const seatNumber = seatObj?.seat_number ?? 0;

    return {
      id: row.id,
      order_code: row.order_code,
      seat_number: seatNumber,
      customer_name: row.customer_name,
      items: (itemRows as OrderItemRow[]) ?? [],
      created_at: row.created_at,
      status: row.status as Status,
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      const { data: rows } = await supabase
        .from("orders")
        .select("id, order_code, customer_name, status, created_at, seat_id, seats(seat_number)")
        .neq("status", "paid")
        .order("created_at", { ascending: false });

      if (!rows || rows.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch items for all orders
      const orderIds = rows.map((r: any) => r.id);
      const { data: allItems } = await supabase
        .from("order_items")
        .select("order_id, item_name, quantity")
        .in("order_id", orderIds);

      const itemsByOrder: Record<string, OrderItemRow[]> = {};
      (allItems ?? []).forEach((it: any) => {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
        itemsByOrder[it.order_id].push({ item_name: it.item_name, quantity: it.quantity });
      });

      const mapped: Order[] = rows.map((r: any) => {
        const seatObj = r.seats as any;
        return {
          id: r.id,
          order_code: r.order_code,
          seat_number: seatObj?.seat_number ?? 0,
          customer_name: r.customer_name,
          items: itemsByOrder[r.id] ?? [],
          created_at: r.created_at,
          status: r.status as Status,
        };
      });

      setOrders(mapped);
      setLoading(false);
    };

    fetchOrders();
  }, []);

  // Realtime subscription for new inserts and updates
  useEffect(() => {
    const channel = supabase
      .channel("staff-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const newOrder = await fetchFullOrder(payload.new.id);
          if (newOrder && newOrder.status !== ("paid" as any)) {
            setOrders((prev) => [newOrder, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        async (payload) => {
          const updated = payload.new as any;
          if (updated.status === "paid") {
            // Remove paid orders from the list
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
          } else {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updated.id ? { ...o, status: updated.status as Status } : o
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFullOrder]);

  // Advance status in Supabase + local state
  const advance = async (orderId: string, currentStatus: Status) => {
    const next = nextStatus[currentStatus];
    if (next === currentStatus) return;

    // Optimistic local update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: next } : o))
    );

    await supabase.from("orders").update({ status: next }).eq("id", orderId);
  };

  const accent = "#EB5158";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FAF7F2",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #EFEFEF",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 22,
              color: accent,
              letterSpacing: "-0.02em",
            }}
          >
            PCCN
          </span>
          <span style={{ fontSize: 14, color: "#888888", fontWeight: 500 }}>
            Staff View
          </span>
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "24px 20px 40px",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
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
        ) : orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              paddingTop: 80,
              color: "#AAAAAA",
              fontSize: 16,
            }}
          >
            No active orders right now
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 20,
            }}
          >
            {orders.map((order) => {
              const badge = badgeStyles[order.status];
              const isDelivered = order.status === "delivered";

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0,
                  }}
                >
                  {/* Row 1: Order ID + status badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 17,
                        color: "#1A1A1A",
                      }}
                    >
                      {order.order_code}
                    </span>
                    <span
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.color,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 14px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Row 2: Seat + customer */}
                  <div
                    style={{
                      fontSize: 14,
                      color: "#888888",
                      marginBottom: 14,
                    }}
                  >
                    Seat {order.seat_number} &middot; {order.customer_name}
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      height: 1,
                      backgroundColor: "#EFEFEF",
                      marginBottom: 14,
                    }}
                  />

                  {/* Items list */}
                  <div style={{ marginBottom: 10 }}>
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 15,
                          color: "#1A1A1A",
                          lineHeight: 1.7,
                        }}
                      >
                        &bull; {item.item_name} x{item.quantity}
                      </div>
                    ))}
                  </div>

                  {/* Time ago */}
                  <div
                    style={{
                      fontSize: 12,
                      color: "#AAAAAA",
                      marginBottom: 18,
                    }}
                  >
                    {timeAgo(order.created_at)}
                  </div>

                  {/* Action button */}
                  {isDelivered ? (
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#BBBBBB",
                        padding: "12px 0",
                      }}
                    >
                      Done ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => advance(order.id, order.status)}
                      style={{
                        width: "100%",
                        padding: "12px 0",
                        backgroundColor: accent,
                        color: "#FFFFFF",
                        fontSize: 15,
                        fontWeight: 600,
                        border: "none",
                        borderRadius: 14,
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.88")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                    >
                      {actionLabel[order.status]}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Staff;
