import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "new" | "preparing" | "ready" | "delivered";

interface Order {
  id: string;
  seat: number;
  customer: string;
  items: { name: string; qty: number }[];
  minutesAgo: number;
  status: Status;
}

const initialOrders: Order[] = [
  {
    id: "PCCN-0042",
    seat: 4,
    customer: "Aarav",
    items: [
      { name: "Chur Chur Naan Paneer", qty: 2 },
      { name: "Chur Chur Naan Plain", qty: 1 },
    ],
    minutesAgo: 2,
    status: "new",
  },
  {
    id: "PCCN-0041",
    seat: 7,
    customer: "Priya",
    items: [
      { name: "Chur Chur Naan Aloo", qty: 1 },
      { name: "Chur Chur Naan Mixed", qty: 1 },
    ],
    minutesAgo: 5,
    status: "preparing",
  },
  {
    id: "PCCN-0040",
    seat: 2,
    customer: "Rohan",
    items: [{ name: "Chur Chur Naan Mixed", qty: 3 }],
    minutesAgo: 9,
    status: "ready",
  },
  {
    id: "PCCN-0039",
    seat: 12,
    customer: "Meera",
    items: [
      { name: "Chur Chur Naan Plain", qty: 2 },
      { name: "Chur Chur Naan Paneer", qty: 1 },
    ],
    minutesAgo: 18,
    status: "delivered",
  },
];

const statusLabel: Record<Status, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
};

const statusStyles: Record<Status, string> = {
  new: "bg-[#FFF0F0] text-[#EB5158]",
  preparing: "bg-[#FFF8E6] text-[#E6A817]",
  ready: "bg-[#EDFAF3] text-[#27AE60]",
  delivered: "bg-[#EDF2FF] text-[#3B6EE8]",
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

const Staff = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const advance = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: nextStatus[o.status] } : o)),
    );
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">PCCN</h1>
          <span className="caption">Staff View</span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {orders.map((order) => (
            <Card key={order.id} className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-lg">{order.id}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[order.status]}`}
                >
                  {statusLabel[order.status]}
                </span>
              </div>

              <div className="caption">
                Seat {order.seat} · {order.customer}
              </div>

              <div className="border-t border-border" />

              <ul className="space-y-1.5">
                {order.items.map((it, i) => (
                  <li key={i} className="text-foreground">
                    • {it.name} x{it.qty}
                  </li>
                ))}
              </ul>

              <div className="caption text-sm">{order.minutesAgo} min ago</div>

              <div className="pt-1">
                {order.status === "delivered" ? (
                  <Button disabled variant="ghost" className="w-full bg-muted text-muted-foreground">
                    Done ✓
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => advance(order.id)}>
                    {actionLabel[order.status]}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Staff;
