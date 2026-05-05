import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [seat, setSeat] = useState("1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = seat.trim() || "1";
    navigate(`/seat/${encodeURIComponent(id)}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-20 space-y-12">
        <header className="space-y-4 text-center">
          <p className="caption uppercase tracking-widest text-sm">PCCN</p>
          <h1 className="text-5xl md:text-6xl">Reserve your table</h1>
          <p className="text-muted-foreground text-lg">A quiet, modern place to eat well.</p>
        </header>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="seat">Seat number</label>
              <Input
                id="seat"
                type="number"
                min={1}
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
                placeholder="1"
              />
            </div>
            <Button type="submit" className="w-full">
              Book a table
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
};

export default Index;
