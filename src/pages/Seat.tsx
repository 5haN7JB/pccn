import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type MenuItem = { id: string; name: string; price: number };

type Step = "welcome" | "menu";

const Seat = () => {
  const { seatId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch menu items from Supabase
  useEffect(() => {
    const fetchMenu = async () => {
      setMenuLoading(true);
      const { data, error: err } = await supabase
        .from("menu_items")
        .select("id, name, price")
        .eq("available", true);

      if (err) {
        setError(err.message);
      } else {
        setMenu(data ?? []);
      }
      setMenuLoading(false);
    };
    fetchMenu();
  }, []);

  const cartItems = useMemo(
    () =>
      menu.map((m) => ({ ...m, qty: qty[m.id] ?? 0 })).filter((i) => i.qty > 0),
    [qty, menu],
  );
  const totalCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const totalAmount = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  const inc = (id: string) =>
    setQty((q) => ({ ...q, [id]: (q[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }));

  const placeOrder = async () => {
    if (submitting || cartItems.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Look up seat id from seats table
      const { data: seatRow, error: seatErr } = await supabase
        .from("seats")
        .select("id")
        .eq("seat_number", Number(seatId))
        .single();

      if (seatErr || !seatRow) {
        throw new Error(seatErr?.message ?? "Seat not found");
      }

      // 2. Generate order code
      const orderCode = `PCCN-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      // 3. Insert into orders
      const { data: orderRow, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_code: orderCode,
          customer_name: name.trim(),
          seat_id: seatRow.id,
          status: "new",
        })
        .select("id")
        .single();

      if (orderErr || !orderRow) {
        throw new Error(orderErr?.message ?? "Failed to create order");
      }

      // 4. Insert order_items
      const orderItems = cartItems.map((item) => ({
        order_id: orderRow.id,
        menu_item_id: item.id,
        item_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsErr) {
        throw new Error(itemsErr.message);
      }

      // 5. Navigate to my-order page
      navigate(`/my-order/${orderCode}`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setSubmitting(false);
    }
  };

  /* ─── WELCOME SCREEN ─── */
  if (step === "welcome") {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-10">
          <div className="space-y-3">
            <h1 className="text-6xl font-extrabold text-primary tracking-tight">
              PCCN
            </h1>
            <p className="text-muted-foreground text-lg">Seat {seatId}</p>
          </div>
          <div className="w-full space-y-6">
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg"
            />
            <Button
              className="w-full"
              size="lg"
              disabled={!name.trim()}
              onClick={() => setStep("menu")}
            >
              Let's Order →
            </Button>
          </div>
        </div>
      </main>
    );
  }

  /* ─── MENU SCREEN ─── */
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="px-6 pt-8 pb-4 flex items-center justify-between">
        <h2 className="text-2xl">Hi {name} 👋</h2>
        <span className="text-muted-foreground text-sm">Seat {seatId}</span>
      </header>

      <div className="px-6">
        <div className="inline-block border-b-2 border-primary pb-2">
          <span className="text-primary font-semibold">Chur Chur Naan</span>
        </div>
      </div>

      {menuLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : error && menu.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-destructive text-center">{error}</p>
        </div>
      ) : (
        <div className="flex-1 px-6 py-6 space-y-4 pb-40 overflow-y-auto">
          {menu.map((item) => {
            const count = qty[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className="bg-card rounded-[20px] shadow-[0_2px_16px_rgba(0,0,0,0.07)] p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">
                    {item.name}
                  </p>
                  <p className="text-primary font-medium mt-1">₹{item.price}</p>
                </div>
                {count === 0 ? (
                  <button
                    onClick={() => inc(item.id)}
                    aria-label={`Add ${item.name}`}
                    className="shrink-0 h-11 w-11 rounded-full bg-primary text-primary-foreground text-2xl leading-none flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    +
                  </button>
                ) : (
                  <div className="shrink-0 flex items-center gap-3 text-primary">
                    <button
                      onClick={() => dec(item.id)}
                      aria-label="Decrease"
                      className="h-9 w-9 rounded-full border-[1.5px] border-primary flex items-center justify-center text-xl leading-none hover:bg-primary/5"
                    >
                      −
                    </button>
                    <span className="font-semibold w-5 text-center">
                      {count}
                    </span>
                    <button
                      onClick={() => inc(item.id)}
                      aria-label="Increase"
                      className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl leading-none hover:opacity-90"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && menu.length > 0 && (
        <div className="px-6 pb-2">
          <p className="text-destructive text-sm text-center">{error}</p>
        </div>
      )}

      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card shadow-[0_-2px_16px_rgba(0,0,0,0.07)] px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-foreground font-medium">
            {totalCount} {totalCount === 1 ? "item" : "items"}
            <span className="text-muted-foreground"> • </span>
            ₹{totalAmount}
          </p>
          <Button onClick={placeOrder} disabled={submitting}>
            {submitting ? "Placing..." : "Place Order"}
          </Button>
        </div>
      )}
    </main>
  );
};

export default Seat;