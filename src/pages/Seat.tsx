import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MenuItem = { id: string; name: string; price: number };

const MENU: MenuItem[] = [
  { id: "ccn-plain", name: "Chur Chur Naan Plain", price: 80 },
  { id: "ccn-aloo", name: "Chur Chur Naan Aloo", price: 100 },
  { id: "ccn-paneer", name: "Chur Chur Naan Paneer", price: 120 },
  { id: "ccn-mixed", name: "Chur Chur Naan Mixed (Aloo + Paneer)", price: 130 },
];

type Step = "welcome" | "menu" | "confirmed";

const Seat = () => {
  const { seatId } = useParams();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [orderId] = useState(
    () => `PCCN-${String(Math.floor(Math.random() * 9000) + 1000)}`,
  );

  const items = useMemo(
    () =>
      MENU.map((m) => ({ ...m, qty: qty[m.id] ?? 0 })).filter((i) => i.qty > 0),
    [qty],
  );
  const totalCount = items.reduce((s, i) => s + i.qty, 0);
  const totalAmount = items.reduce((s, i) => s + i.qty * i.price, 0);

  const inc = (id: string) =>
    setQty((q) => ({ ...q, [id]: (q[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }));

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

  if (step === "menu") {
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

        <div className="flex-1 px-6 py-6 space-y-4 pb-40 overflow-y-auto">
          {MENU.map((item) => {
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

        {totalCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-card shadow-[0_-2px_16px_rgba(0,0,0,0.07)] px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-foreground font-medium">
              {totalCount} {totalCount === 1 ? "item" : "items"}
              <span className="text-muted-foreground"> • </span>
              ₹{totalAmount}
            </p>
            <Button onClick={() => setStep("confirmed")}>Place Order</Button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-12 w-12 text-primary-foreground"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-4xl">Order Placed!</h1>
        <span className="inline-block bg-background border border-border rounded-full px-5 py-2 font-semibold text-foreground">
          {orderId}
        </span>

        <div className="w-full bg-card rounded-[20px] shadow-[0_2px_16px_rgba(0,0,0,0.07)] p-6 text-left space-y-4">
          <div>
            <p className="caption text-xs uppercase tracking-wider">Name</p>
            <p className="font-semibold text-foreground">{name}</p>
          </div>
          <div className="space-y-2">
            <p className="caption text-xs uppercase tracking-wider">Items</p>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-foreground">
                <span>
                  {i.name} <span className="text-muted-foreground">×{i.qty}</span>
                </span>
                <span>₹{i.price * i.qty}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 flex justify-between">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-bold text-foreground">₹{totalAmount}</span>
          </div>
        </div>

        <p className="text-muted-foreground">
          Sit back and relax. We'll bring it to your seat.
        </p>
      </div>
    </main>
  );
};

export default Seat;