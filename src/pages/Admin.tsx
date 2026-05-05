import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface OrderItemRow {
  item_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  order_code: string;
  seat_number: number;
  customer_name: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  items: OrderItemRow[];
}

const accent = "#EB5158";

const btnStyle: React.CSSProperties = {
  padding: "10px 22px",
  backgroundColor: accent,
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 600,
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "opacity 0.15s",
};

const cardBase: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
};

const hover = (e: React.MouseEvent<HTMLButtonElement>) =>
  (e.currentTarget.style.opacity = "0.88");
const unhover = (e: React.MouseEvent<HTMLButtonElement>) =>
  (e.currentTarget.style.opacity = "1");

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const Admin = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Build a full Order object from a raw order row + items
  const fetchFullOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    const { data: row } = await supabase
      .from("orders")
      .select("id, order_code, customer_name, status, total_amount, created_at, seat_id, seats(seat_number)")
      .eq("id", orderId)
      .single();

    if (!row) return null;

    const { data: itemRows } = await supabase
      .from("order_items")
      .select("item_name, quantity, unit_price")
      .eq("order_id", row.id);

    const seatObj = row.seats as any;

    return {
      id: row.id,
      order_code: row.order_code,
      seat_number: seatObj?.seat_number ?? 0,
      customer_name: row.customer_name,
      status: row.status,
      total_amount: row.total_amount,
      created_at: row.created_at,
      items: (itemRows as OrderItemRow[]) ?? [],
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: rows } = await supabase
        .from("orders")
        .select("id, order_code, customer_name, status, total_amount, created_at, seat_id, seats(seat_number)")
        .order("created_at", { ascending: false });

      if (!rows || rows.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = rows.map((r: any) => r.id);
      const { data: allItems } = await supabase
        .from("order_items")
        .select("order_id, item_name, quantity, unit_price")
        .in("order_id", orderIds);

      const itemsByOrder: Record<string, OrderItemRow[]> = {};
      (allItems ?? []).forEach((it: any) => {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
        itemsByOrder[it.order_id].push({
          item_name: it.item_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
        });
      });

      const mapped: Order[] = rows.map((r: any) => {
        const seatObj = r.seats as any;
        return {
          id: r.id,
          order_code: r.order_code,
          seat_number: seatObj?.seat_number ?? 0,
          customer_name: r.customer_name,
          status: r.status,
          total_amount: r.total_amount,
          created_at: r.created_at,
          items: itemsByOrder[r.id] ?? [],
        };
      });

      setOrders(mapped);
      setLoading(false);
    };

    load();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const newOrder = await fetchFullOrder(payload.new.id);
          if (newOrder) {
            setOrders((prev) => [newOrder, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const u = payload.new as any;
          setOrders((prev) =>
            prev.map((o) =>
              o.id === u.id
                ? { ...o, status: u.status, total_amount: u.total_amount }
                : o
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFullOrder]);

  // Issue bill: calculate total from order_items, update orders.total_amount
  const issueBill = async (order: Order) => {
    const total = order.items.reduce(
      (sum, it) => sum + it.unit_price * it.quantity,
      0
    );

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, total_amount: total } : o))
    );

    await supabase
      .from("orders")
      .update({ total_amount: total })
      .eq("id", order.id);
  };

  // Mark paid: insert payment row, update order status + paid_at
  const markPaid = async (order: Order) => {
    const amount = order.total_amount ?? 0;

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: "paid" } : o))
    );

    await supabase.from("payments").insert({
      order_id: order.id,
      amount,
      method: "cash",
      status: "paid",
    });

    await supabase
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);
  };

  // Stats
  const todayOrders = useMemo(
    () => orders.filter((o) => isToday(o.created_at)),
    [orders]
  );
  const ordersToday = todayOrders.length;
  const revenue = useMemo(
    () =>
      todayOrders
        .filter((o) => o.status === "paid" && o.total_amount != null)
        .reduce((sum, o) => sum + (o.total_amount ?? 0), 0),
    [todayOrders]
  );
  const pending = useMemo(
    () => orders.filter((o) => o.status !== "paid").length,
    [orders]
  );

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
            maxWidth: 1040,
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
            Manager View
          </span>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1040,
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
        ) : (
          <>
            {/* Summary stat cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <div style={{ ...cardBase, padding: "22px 24px" }}>
                <div style={{ fontSize: 13, color: "#888888", marginBottom: 6, fontWeight: 500 }}>
                  Orders Today
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#1A1A1A" }}>
                  {ordersToday}
                </div>
              </div>

              <div style={{ ...cardBase, padding: "22px 24px" }}>
                <div style={{ fontSize: 13, color: "#888888", marginBottom: 6, fontWeight: 500 }}>
                  Revenue
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: accent }}>
                  ₹{revenue.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ ...cardBase, padding: "22px 24px" }}>
                <div style={{ fontSize: 13, color: "#888888", marginBottom: 6, fontWeight: 500 }}>
                  Pending
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#E6A817" }}>
                  {pending}
                </div>
              </div>
            </div>

            {/* Order rows */}
            {orders.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 40, color: "#AAAAAA", fontSize: 16 }}>
                No orders yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {orders.map((order) => {
                  const isPaid = order.status === "paid";
                  const billIssued = order.total_amount != null;
                  const itemsText = order.items
                    .map((it) => `${it.item_name} x${it.quantity}`)
                    .join(", ");

                  return (
                    <div
                      key={order.id}
                      style={{
                        ...cardBase,
                        padding: "20px 24px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                        borderLeft: isPaid
                          ? "4px solid #27AE60"
                          : "4px solid transparent",
                      }}
                    >
                      {/* Left: ID + seat/customer */}
                      <div style={{ minWidth: 150, flex: "0 0 auto" }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A" }}>
                          {order.order_code}
                        </div>
                        <div style={{ fontSize: 13, color: "#888888", marginTop: 2 }}>
                          Seat {order.seat_number} &middot; {order.customer_name}
                        </div>
                      </div>

                      {/* Middle: items */}
                      <div
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: "#888888",
                          minWidth: 180,
                          lineHeight: 1.5,
                        }}
                      >
                        {itemsText || "—"}
                      </div>

                      {/* Right: action area */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexShrink: 0,
                        }}
                      >
                        {isPaid && (
                          <>
                            <span
                              style={{
                                backgroundColor: "#EDFAF3",
                                color: "#27AE60",
                                fontSize: 12,
                                fontWeight: 600,
                                padding: "5px 14px",
                                borderRadius: 999,
                              }}
                            >
                              PAID
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A" }}>
                              ₹{(order.total_amount ?? 0).toLocaleString("en-IN")}
                            </span>
                          </>
                        )}

                        {!isPaid && billIssued && (
                          <>
                            <span style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A" }}>
                              ₹{(order.total_amount ?? 0).toLocaleString("en-IN")}
                            </span>
                            <button
                              onClick={() => markPaid(order)}
                              style={btnStyle}
                              onMouseEnter={hover}
                              onMouseLeave={unhover}
                            >
                              Mark Paid
                            </button>
                          </>
                        )}

                        {!isPaid && !billIssued && (
                          <button
                            onClick={() => issueBill(order)}
                            style={btnStyle}
                            onMouseEnter={hover}
                            onMouseLeave={unhover}
                          >
                            Issue Bill
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
