import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-20 space-y-12">
        <header className="space-y-4 text-center">
          <p className="caption uppercase tracking-widest text-sm">PCCN</p>
          <h1 className="text-5xl md:text-6xl">Reserve your table</h1>
          <p className="text-muted-foreground text-lg">A quiet, modern place to eat well.</p>
        </header>

        <Card className="p-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="name">Your name</label>
            <Input id="name" placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <label htmlFor="guests">Guests</label>
            <Input id="guests" type="number" placeholder="2" />
          </div>
          <Button className="w-full">Book a table</Button>
        </Card>
      </div>
    </main>
  );
};

export default Index;
