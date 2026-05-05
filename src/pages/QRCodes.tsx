import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

interface Seat {
  id: string;
  seat_number: number;
}

const accent = "#EB5158";

const QRCodes = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeats = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("seats")
        .select("id, seat_number")
        .order("seat_number", { ascending: true });

      setSeats((data as Seat[]) ?? []);
      setLoading(false);
    };
    fetchSeats();
  }, []);

  const origin = window.location.origin;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #FFFFFF !important; }
          .qr-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
            padding: 0 !important;
          }
          .qr-card {
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #E0E0E0 !important;
          }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FAF7F2",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <header
          className="no-print"
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
              PCCN — Table QR Codes
            </span>
            <button
              onClick={() => window.print()}
              style={{
                padding: "10px 24px",
                backgroundColor: accent,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Print All
            </button>
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
          ) : seats.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                paddingTop: 80,
                color: "#AAAAAA",
                fontSize: 16,
              }}
            >
              No seats found
            </div>
          ) : (
            <div
              className="qr-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 20,
              }}
            >
              {seats.map((seat) => {
                const url = `${origin}/seat/${seat.seat_number}`;
                return (
                  <div
                    key={seat.id}
                    className="qr-card"
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 20,
                      boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                      padding: 28,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#1A1A1A",
                      }}
                    >
                      Seat {seat.seat_number}
                    </div>
                    <QRCodeSVG
                      value={url}
                      size={180}
                      level="H"
                      fgColor="#1A1A1A"
                      bgColor="#FFFFFF"
                    />
                    <div style={{ fontSize: 13, color: "#AAAAAA" }}>
                      Scan to order
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Responsive grid for screen */}
      <style>{`
        @media (max-width: 900px) {
          .qr-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .qr-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
};

export default QRCodes;
