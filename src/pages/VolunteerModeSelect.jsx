// VolunteerModeSelect.jsx — Volunteer chooses Pantry / Delivery / Clothing
import { useNavigate, useLocation } from "react-router-dom";
import { ClipboardList, Truck, Shirt, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

export default function VolunteerModeSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const volunteer = location.state?.volunteer;

  useEffect(() => {
    if (!volunteer) navigate("/experienced", { replace: true });
  }, [volunteer, navigate]);

  if (!volunteer) return null;

  const firstName = volunteer.name?.split(" ")[0] || volunteer.name || "Volunteer";

  const cards = [
    {
      icon: ClipboardList,
      title: "Pantry Operations",
      desc: "Help with today's distribution tasks",
      onClick: () => navigate("/task-pool?pantry=jason"),
    },
    {
      icon: Truck,
      title: "Delivery Routes",
      desc: "View and claim your delivery routes",
      onClick: () => navigate("/delivery-task-pool", { state: { volunteer } }),
    },
    {
      icon: Shirt,
      title: "Clothing Section",
      desc: "Help sort and organize clothing donations",
      onClick: () => navigate("/task-pool?pantry=amber"),
    },
  ];

  return (
    <div style={{ margin: 0, fontFamily: "'Inter', sans-serif", background: "#F3F5F6", color: "#0A2A3A", display: "flex", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: 402, minHeight: "100vh", padding: 20, display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Back button */}
        <button
          onClick={() => navigate("/experienced")}
          aria-label="Back"
          style={{ width: 40, height: 40, borderRadius: 12, background: "#fff", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <ChevronLeft size={18} color="#0A2A3A" />
        </button>

        {/* Greeting */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#0A2A3A" }}>Hi, {firstName}!</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>What are you doing today?</p>
        </div>

        {/* Role cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cards.map(({ icon: Icon, title, desc, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              style={{
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 20,
                padding: 20,
                display: "flex",
                alignItems: "center",
                gap: 16,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: "0 8px 20px rgba(10,42,58,0.05)",
                width: "100%",
                fontFamily: "inherit",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#0D9488"; e.currentTarget.style.boxShadow = "0 10px 24px rgba(10,42,58,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(10,42,58,0.05)"; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "#E6F5F3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#0F7A70" }}>
                <Icon size={24} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "#0A2A3A", margin: 0 }}>{title}</p>
                <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0", lineHeight: 1.4 }}>{desc}</p>
              </div>
              <ChevronRight size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
