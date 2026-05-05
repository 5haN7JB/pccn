import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Seat from "./pages/Seat.tsx";
import Staff from "./pages/Staff.tsx";
import Admin from "./pages/Admin.tsx";
import MyOrder from "./pages/MyOrder.tsx";
import QRCodes from "./pages/QRCodes.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/seat/:seatId" element={<Seat />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/my-order/:orderId" element={<MyOrder />} />
          <Route path="/qr-codes" element={<QRCodes />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
