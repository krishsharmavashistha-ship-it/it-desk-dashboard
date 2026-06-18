import { useState, useEffect, useRef } from "react";

const TEAM = ["Unassigned", "Eesha", "Kamya", "Admin", "IT Support", "John", "Sarah"];

function SLATimer({ slaDeadline, status }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [overdue, setOverdue] = useState(false);
  useEffect(() => {
    if (!slaDeadline || status === "Resolved") return;
    const update = () => {
      const diff = new Date(slaDeadline) - new Date();
      if (diff <= 0) {
        setOverdue(true);
        const abs = Math.abs(diff);
        setTimeLeft(`${Math.floor(abs/3600000)}h ${Math.floor((abs%3600000)/60000)}m ${Math.floor((abs%60000)/1000)}s overdue`);
      } else {
        setOverdue(false);
        setTimeLeft(`${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m ${Math.floor((diff%60000)/1000)}s left`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [slaDeadline, status]);
  if (!slaDeadline) return null;
  if (status === "Resolved") return <span style={{ fontSize: 11, color: "#43a047", fontWeight: 600 }}>✅ Resolved</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: overdue ? "#ffebee" : "#fff8e1", color: overdue ? "#e53935" : "#fb8c00", border: `1px solid ${overdue ? "#e53935" : "#fb8c00"}`, animation: overdue ? "pulse 1s infinite" : "none", display: "inline-block" }}>
      ⏱ {overdue ? "🔴 " : "🟡 "}{timeLeft}
    </span>
  );
}

function KanbanCard({ t, d, darkMode, onDelete, priorityBorder, formatDate }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div draggable onDragStart={e => { e.dataTransfer.setData("ticketId", t._id); setDragging(true); }} onDragEnd={() => setDragging(false)}
      style={{ background: d.card, borderRadius: 10, padding: "14px", marginBottom: 10, borderLeft: `4px solid ${priorityBorder[t.priority] || "#ccc"}`, boxShadow: dragging ? "0 8px 24px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.08)", opacity: dragging ? 0.5 : 1, cursor: "grab" }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: d.text, marginBottom: 6 }}>{t.title}</div>
      {t.description && <div style={{ fontSize: 12, color: d.subtext, marginBottom: 8 }}>{t.description.slice(0, 80)}{t.description.length > 80 ? "..." : ""}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ background: t.priority === "High" ? "#ffebee" : t.priority === "Medium" ? "#fff3e0" : "#e8f5e9", color: t.priority === "High" ? "#e53935" : t.priority === "Medium" ? "#fb8c00" : "#43a047", borderRadius: 5, padding: "1px 8px", fontSize: 11, fontWeight: 600, border: `1px solid ${t.priority === "High" ? "#e53935" : t.priority === "Medium" ? "#fb8c00" : "#43a047"}` }}>{t.priority}</span>
        <span style={{ background: darkMode ? "#1a2a4a" : "#e8f0fe", color: "#1a73e8", borderRadius: 5, padding: "1px 8px", fontSize: 11 }}>{t.category}</span>
        {t.assignee && t.assignee !== "Unassigned" && <span style={{ background: darkMode ? "#2a1a4a" : "#f3e5f5", color: "#9c27b0", borderRadius: 5, padding: "1px 8px", fontSize: 11 }}>👤 {t.assignee}</span>}
      </div>
      <SLATimer slaDeadline={t.slaDeadline} status={t.status} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {t.createdAt && <span style={{ fontSize: 11, color: d.subtext, opacity: 0.6 }}>{formatDate(t.createdAt)}</span>}
        <div style={{ display: "flex", gap: 6 }}>
          {t.comments && t.comments.length > 0 && <span style={{ fontSize: 11, color: d.subtext }}>💬 {t.comments.length}</span>}
          <button onClick={() => onDelete(t._id)} style={{ background: "none", border: "none", color: "#e53935", cursor: "pointer", fontSize: 14, padding: 0 }}>🗑</button>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ title, color, icon, tickets, d, darkMode, onDrop, onDelete, priorityBorder, formatDate }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(e.dataTransfer.getData("ticketId"), title); }}
      style={{ flex: 1, minWidth: 0, background: darkMode ? "#161926" : "#f4f5f7", borderRadius: 12, padding: "16px 12px", border: dragOver ? `2px dashed ${color}` : "2px solid transparent", minHeight: 400 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: d.text }}>{title}</span>
        <span style={{ marginLeft: "auto", background: color, color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{tickets.length}</span>
      </div>
      {tickets.length === 0 && <div style={{ textAlign: "center", color: d.subtext, fontSize: 13, padding: "40px 0", opacity: 0.5, border: `2px dashed ${darkMode ? "#2e3250" : "#ddd"}`, borderRadius: 8 }}>Drop here</div>}
      {tickets.map(t => <KanbanCard key={t._id} t={t} d={d} darkMode={darkMode} onDelete={onDelete} priorityBorder={priorityBorder} formatDate={formatDate} />)}
    </div>
  );
}

function CommentsSection({ ticket, d, darkMode, onAddComment, onDeleteComment, aiSummarize }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("Agent");
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState("");

  const handleSummarize = async () => {
    setSummarizing(true);
    setSummary("");
    const result = await aiSummarize(ticket);
    setSummary(result);
    setSummarizing(false);
  };

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${d.border}`, paddingTop: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={handleSummarize} disabled={summarizing} style={{
          background: summarizing ? "#b0bec5" : "linear-gradient(135deg, #667eea, #764ba2)",
          color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8,
          cursor: summarizing ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600
        }}>{summarizing ? "🤖 Summarizing..." : "🤖 AI Summarize & Suggest Fix"}</button>
        {summary && (
          <div style={{ marginTop: 8, background: darkMode ? "#1a2a4a" : "#e8f0fe", borderRadius: 8, padding: 12, fontSize: 13, color: d.text, lineHeight: 1.6, borderLeft: "4px solid #1a73e8" }}>
            {summary}
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: d.text, marginBottom: 8 }}>💬 Comments ({ticket.comments ? ticket.comments.length : 0})</div>
      {ticket.comments && ticket.comments.map((c, i) => (
        <div key={i} style={{ background: darkMode ? "#161926" : "#f8f9ff", borderRadius: 8, padding: "10px 12px", marginBottom: 8, borderLeft: "3px solid #1a73e8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a73e8" }}>👤 {c.author}</span>
              <span style={{ fontSize: 11, color: d.subtext, marginLeft: 8 }}>{c.timestamp ? new Date(c.timestamp).toLocaleString() : ""}</span>
            </div>
            <button onClick={() => onDeleteComment(ticket._id, i)} style={{ background: "none", border: "none", color: "#e53935", cursor: "pointer", fontSize: 12 }}>✕</button>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: 13, color: d.text, lineHeight: 1.5 }}>{c.text}</p>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <select value={author} onChange={e => setAuthor(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${d.inputBorder}`, fontSize: 12, background: d.input, color: d.text }}>
          {TEAM.filter(t => t !== "Unassigned").map(t => <option key={t}>{t}</option>)}
        </select>
        <input placeholder="Add a comment..." value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && text.trim()) { onAddComment(ticket._id, text, author); setText(""); } }}
          style={{ flex: 1, padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${d.inputBorder}`, fontSize: 13, background: d.input, color: d.text, outline: "none" }} />
        <button onClick={() => { if (text.trim()) { onAddComment(ticket._id, text, author); setText(""); } }}
          style={{ background: "#1a73e8", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Post</button>
      </div>
    </div>
  );
}

function AnalyticsPage({ tickets, d, darkMode }) {
  const resolved = tickets.filter(t => t.status === "Resolved");
  const avgResolution = (() => {
    const times = resolved.filter(t => t.createdAt && t.updatedAt).map(t => (new Date(t.updatedAt) - new Date(t.createdAt)) / 3600000);
    if (times.length === 0) return null;
    return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
  })();
  const categoryCounts = tickets.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {});
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const priorityCounts = tickets.reduce((acc, t) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {});
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCount = Array(7).fill(0);
  tickets.forEach(t => { if (t.createdAt) dayCount[new Date(t.createdAt).getDay()]++; });
  const maxDay = Math.max(...dayCount, 1);
  const busiestDay = days[dayCount.indexOf(Math.max(...dayCount))];
  const last7 = Array(7).fill(0).map((_, i) => { const dd = new Date(); dd.setDate(dd.getDate() - (6 - i)); return { label: dd.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), date: dd.toDateString() }; });
  last7.forEach(dd => { dd.count = tickets.filter(t => t.createdAt && new Date(t.createdAt).toDateString() === dd.date).length; });
  const maxLast7 = Math.max(...last7.map(dd => dd.count), 1);
  const slaBreached = tickets.filter(t => t.slaDeadline && new Date(t.slaDeadline) < new Date() && t.status !== "Resolved").length;
  const slaCompliance = tickets.length > 0 ? (((tickets.length - slaBreached) / tickets.length) * 100).toFixed(0) : 100;
  const assigneeCounts = tickets.reduce((acc, t) => { if (t.assignee && t.assignee !== "Unassigned") { acc[t.assignee] = (acc[t.assignee] || 0) + 1; } return acc; }, {});

  const statCard = (icon, label, value, color, sub) => (
    <div style={{ background: d.card, borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: d.text, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: d.subtext, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 22, color: d.text, fontWeight: 700, marginBottom: 24 }}>📈 Analytics Overview</h2>
      {tickets.length === 0 ? (
        <div style={{ background: d.card, borderRadius: 12, padding: 60, textAlign: "center", color: d.subtext }}><div style={{ fontSize: 48, marginBottom: 16 }}>📭</div><div>No tickets yet!</div></div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            {statCard("🎫", "Total Tickets", tickets.length, "#1a73e8")}
            {statCard("⏱", "Avg Resolution", avgResolution ? `${avgResolution}h` : "N/A", "#fb8c00", avgResolution ? "for resolved tickets" : "no resolved yet")}
            {statCard("📂", "Top Category", topCategory ? topCategory[0] : "N/A", "#9c27b0", topCategory ? `${topCategory[1]} tickets` : "")}
            {statCard("✅", "SLA Compliance", `${slaCompliance}%`, slaCompliance >= 80 ? "#43a047" : "#e53935", `${slaBreached} breached`)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
            {statCard("📅", "Busiest Day", busiestDay, "#1a73e8", `${dayCount[days.indexOf(busiestDay)]} tickets`)}
            {statCard("🏆", "Resolution Rate", `${((resolved.length / tickets.length) * 100).toFixed(0)}%`, "#43a047", `${resolved.length} of ${tickets.length} resolved`)}
          </div>
          <div style={{ background: d.card, borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, color: d.text, fontWeight: 700 }}>📅 Last 7 Days</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140 }}>
              {last7.map((day, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1a73e8" }}>{day.count > 0 ? day.count : ""}</span>
                  <div style={{ width: "100%", background: day.count > 0 ? "#1a73e8" : (darkMode ? "#2e3250" : "#e8f0fe"), borderRadius: "6px 6px 0 0", height: `${(day.count / maxLast7) * 100}px`, minHeight: 4 }} />
                  <span style={{ fontSize: 11, color: d.subtext }}>{day.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: d.card, borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, color: d.text, fontWeight: 700 }}>📊 By Day of Week</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140 }}>
              {days.map((day, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#9c27b0" }}>{dayCount[i] > 0 ? dayCount[i] : ""}</span>
                  <div style={{ width: "100%", background: day === busiestDay ? "#9c27b0" : (darkMode ? "#2e3250" : "#e1bee7"), borderRadius: "6px 6px 0 0", height: `${(dayCount[i] / maxDay) * 100}px`, minHeight: 4 }} />
                  <span style={{ fontSize: 11, color: day === busiestDay ? "#9c27b0" : d.subtext, fontWeight: day === busiestDay ? 700 : 400 }}>{day}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={{ background: d.card, borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: d.text, fontWeight: 700 }}>📂 By Category</h3>
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: d.text }}>{cat}</span>
                    <span style={{ fontSize: 13, color: d.subtext }}>{count}</span>
                  </div>
                  <div style={{ background: darkMode ? "#2e3250" : "#f0f2f5", borderRadius: 4, height: 8 }}>
                    <div style={{ background: "#1a73e8", borderRadius: 4, height: 8, width: `${(count / tickets.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: d.card, borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: d.text, fontWeight: 700 }}>🎯 By Priority</h3>
              {[["High", "#e53935"], ["Medium", "#fb8c00"], ["Low", "#43a047"]].map(([p, color]) => (
                <div key={p} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: d.text }}>{p}</span>
                    <span style={{ fontSize: 13, color: d.subtext }}>{priorityCounts[p] || 0}</span>
                  </div>
                  <div style={{ background: darkMode ? "#2e3250" : "#f0f2f5", borderRadius: 4, height: 8 }}>
                    <div style={{ background: color, borderRadius: 4, height: 8, width: `${((priorityCounts[p] || 0) / tickets.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {Object.keys(assigneeCounts).length > 0 && (
            <div style={{ background: d.card, borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: d.text, fontWeight: 700 }}>👤 By Assignee</h3>
              {Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                <div key={name} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: d.text }}>{name}</span>
                    <span style={{ fontSize: 13, color: d.subtext }}>{count} tickets</span>
                  </div>
                  <div style={{ background: darkMode ? "#2e3250" : "#f0f2f5", borderRadius: 4, height: 8 }}>
                    <div style={{ background: "#9c27b0", borderRadius: 4, height: 8, width: `${(count / tickets.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", priority: "Low", category: "Software", assignee: "Unassigned" });
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ show: false, msg: "", color: "#43a047" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showChart, setShowChart] = useState("status");
  const [darkMode, setDarkMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandLog, setExpandLog] = useState(null);
  const [expandComments, setExpandComments] = useState(null);
  const [view, setView] = useState("list");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const d = darkMode ? {
    bg: "#0f1117", card: "#1e2130", border: "#2e3250", text: "#e8eaf6",
    subtext: "#9199c4", input: "#161926", inputBorder: "#2e3250", header: "#0d1b4b"
  } : {
    bg: "#f0f2f5", card: "#fff", border: "#e0e0e0", text: "#1a1a2e",
    subtext: "#666", input: "#fafafa", inputBorder: "#d0d5dd", header: "#1a73e8"
  };

  const fetchTickets = async () => {
    const res = await fetch("https://it-desk-dashboard-server.onrender.com/tickets?t=" + Date.now());
    const data = await res.json();
    setTickets(data);
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, color = "#43a047") => {
    setToast({ show: true, msg, color });
    setTimeout(() => setToast({ show: false, msg: "", color }), 3000);
  };

  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return showToast("⚠️ Voice not supported. Use Chrome!", "#e53935");
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setForm(f => ({ ...f, description: f.description ? f.description + " " + transcript : transcript }));
      showToast("🎤 Voice captured!", "#1a73e8");
    };
    recognition.onerror = () => { setListening(false); showToast("⚠️ Voice failed!", "#e53935"); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  };

  const aiCategorize = async () => {
    if (!form.description && !form.title) return showToast("⚠️ Enter a title or description first!", "#fb8c00");
    setAiLoading(true);
    try {
      const res = await fetch("https://it-desk-dashboard-server.onrender.com/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description }),
      });
      const parsed = await res.json();
      setForm(f => ({ ...f, priority: parsed.priority, category: parsed.category }));
      showToast(`🤖 AI: ${parsed.priority} priority, ${parsed.category}!`, "#1a73e8");
    } catch (e) { showToast("⚠️ AI failed.", "#e53935"); }
    setAiLoading(false);
  };

  const aiSummarize = async (ticket) => {
    try {
      const res = await fetch("https://it-desk-dashboard-server.onrender.com/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = await res.json();
      return data.summary;
    } catch (e) { return "⚠️ AI summary failed. Please try again."; }
  };

  const handleSubmit = async () => {
    if (!form.title) return;
    await fetch("https://it-desk-dashboard-server.onrender.com/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ title: "", description: "", priority: "Low", category: "Software", assignee: "Unassigned" });
    fetchTickets();
    showToast("✅ Ticket submitted!");
  };

  const updateStatus = (id, status) => {
    fetch(`https://it-desk-dashboard-server.onrender.com/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
      .then(() => { fetchTickets(); showToast(`✅ Moved to ${status}!`, "#43a047"); });
  };

  const deleteTicket = (id) => {
    if (!window.confirm("Delete this ticket?")) return;
    fetch(`https://it-desk-dashboard-server.onrender.com/tickets/${id}`, { method: "DELETE" }).then(() => { fetchTickets(); showToast("🗑 Deleted!", "#e53935"); });
  };

  const addComment = async (id, text, author) => {
    await fetch(`https://it-desk-dashboard-server.onrender.com/tickets/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, author }) });
    fetchTickets();
    showToast("💬 Comment added!");
  };

  const deleteComment = async (ticketId, commentIndex) => {
    await fetch(`https://it-desk-dashboard-server.onrender.com/tickets/${ticketId}/comments/${commentIndex}`, { method: "DELETE" });
    fetchTickets();
  };

  const startEdit = (t) => { setEditId(t._id); setEditForm({ title: t.title, description: t.description, priority: t.priority, category: t.category, assignee: t.assignee || "Unassigned" }); };

  const saveEdit = async () => {
    await fetch(`https://it-desk-dashboard-server.onrender.com/tickets/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setEditId(null); fetchTickets(); showToast("✏️ Updated!");
  };

  const exportCSV = () => {
    const headers = ["Title", "Description", "Priority", "Category", "Status", "Assignee", "Created At", "SLA Deadline"];
    const rows = tickets.map(t => [`"${t.title}"`, `"${t.description || ""}"`, t.priority, t.category, t.status, t.assignee || "", t.createdAt ? new Date(t.createdAt).toLocaleString() : "", t.slaDeadline ? new Date(t.slaDeadline).toLocaleString() : ""]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tickets.csv"; a.click();
    showToast("📥 Exported!");
  };

  const open = tickets.filter(t => t.status === "Open").length;
  const inProgress = tickets.filter(t => t.status === "In Progress").length;
  const resolved = tickets.filter(t => t.status === "Resolved").length;
  const total = tickets.length;
  const overdue = tickets.filter(t => t.slaDeadline && new Date(t.slaDeadline) < new Date() && t.status !== "Resolved").length;
  const priorityBorder = { High: "#e53935", Medium: "#fb8c00", Low: "#43a047" };

  const filtered = tickets.filter(t => {
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${d.inputBorder}`, boxSizing: "border-box", fontSize: 14, background: d.input, color: d.text, outline: "none" };

  const DonutChart = ({ data }) => {
    const total2 = data.reduce((s, dd) => s + dd.value, 0);
    if (total2 === 0) return <div style={{ textAlign: "center", color: "#aaa", padding: 40 }}>No data yet</div>;
    let cumulative = 0;
    const size = 160, cx = size / 2, cy = size / 2, r = 60, innerR = 35;
    const slices = data.map(dd => {
      const pct = dd.value / total2;
      const start = cumulative * 2 * Math.PI - Math.PI / 2; cumulative += pct;
      const end = cumulative * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const ix1 = cx + innerR * Math.cos(end), iy1 = cy + innerR * Math.sin(end);
      const ix2 = cx + innerR * Math.cos(start), iy2 = cy + innerR * Math.sin(start);
      return { ...dd, path: `M ${x1} ${y1} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${pct > 0.5 ? 1 : 0} 0 ${ix2} ${iy2} Z`, pct };
    });
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 24, justifyContent: "center" }}>
        <svg width={size} height={size}>
          {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 20, fontWeight: 800, fill: d.text }}>{total2}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: d.subtext }}>Total</text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
              <span style={{ fontSize: 13, color: d.subtext }}>{s.label}: <strong style={{ color: d.text }}>{s.value}</strong> ({Math.round(s.pct * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BarChart = ({ data }) => {
    const max = Math.max(...data.map(dd => dd.value), 1);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 160, padding: "0 20px" }}>
        {data.map(dd => (
          <div key={dd.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: dd.color }}>{dd.value}</span>
            <div style={{ width: "100%", background: dd.color, borderRadius: "6px 6px 0 0", height: `${(dd.value / max) * 120}px`, minHeight: dd.value > 0 ? 8 : 0 }} />
            <span style={{ fontSize: 12, color: "#666" }}>{dd.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: d.bg, fontFamily: "'Segoe UI', Arial, sans-serif", paddingBottom: 40, transition: "all 0.3s" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {toast.show && <div style={{ position: "fixed", top: 24, right: 24, background: toast.color, color: "#fff", padding: "12px 24px", borderRadius: 8, fontWeight: "bold", zIndex: 999, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>{toast.msg}</div>}

      <div style={{ background: d.header, padding: "20px 40px", marginBottom: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ color: "#fff", margin: 0, fontSize: 24, fontWeight: 700 }}>🖥️ IT Service Desk Dashboard</h1>
            <p style={{ color: "rgba(255,255,255,0.7)", margin: "4px 0 0 0", fontSize: 14 }}>Auto-refreshes every 30s ⚡</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: 3 }}>
              {[{ key: "list", icon: "☰ List" }, { key: "kanban", icon: "⬛ Kanban" }, { key: "analytics", icon: "📈 Analytics" }].map(v => (
                <button key={v.key} onClick={() => setView(v.key)} style={{ background: view === v.key ? "#fff" : "transparent", color: view === v.key ? "#1a73e8" : "#fff", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{v.icon}</button>
              ))}
            </div>
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontSize: 16 }}>{darkMode ? "☀️" : "🌙"}</button>
            <button onClick={exportCSV} style={{ background: "#fff", color: "#1a73e8", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>📥 Export CSV</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: view === "kanban" ? 1100 : 960, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          {[{ label: "Total Tickets", count: total, color: "#1a73e8", icon: "🎫" }, { label: "Open", count: open, color: "#e53935", icon: "🔴" }, { label: "In Progress", count: inProgress, color: "#fb8c00", icon: "🟠" }, { label: "Resolved", count: resolved, color: "#43a047", icon: "🟢" }, { label: "Overdue", count: overdue, color: "#9c27b0", icon: "⚠️" }].map(s => (
            <div key={s.label} onClick={() => s.label !== "Overdue" && view === "list" && setStatusFilter(s.label === "Total Tickets" ? "All" : s.label)}
              style={{ flex: 1, background: d.card, borderRadius: 12, padding: "16px 12px", textAlign: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", transition: "all 0.2s", borderTop: `4px solid ${s.color}` }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ color: d.subtext, fontSize: 12, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {view === "analytics" && <AnalyticsPage tickets={tickets} d={d} darkMode={darkMode} />}

        {view === "kanban" && (
          <div>
            <div style={{ background: d.card, borderRadius: 12, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[{ title: "Open", color: "#e53935", icon: "🔴" }, { title: "In Progress", color: "#fb8c00", icon: "🟠" }, { title: "Resolved", color: "#43a047", icon: "🟢" }].map(col => (
                <KanbanColumn key={col.title} {...col}
                  tickets={tickets.filter(t => t.status === col.title && (t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase())))}
                  d={d} darkMode={darkMode} onDrop={(id, status) => updateStatus(id, status)} onDelete={deleteTicket} priorityBorder={priorityBorder} formatDate={formatDate} />
              ))}
            </div>
            <p style={{ textAlign: "center", color: d.subtext, fontSize: 13, marginTop: 16 }}>💡 Drag and drop tickets between columns</p>
          </div>
        )}

        {view === "list" && (
          <>
            {total > 0 && (
              <div style={{ background: d.card, borderRadius: 12, padding: 24, marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: d.text, fontWeight: 700 }}>📊 Ticket Analytics</h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ key: "status", label: "🍩 By Status" }, { key: "priority", label: "📊 By Priority" }].map(c => (
                      <button key={c.key} onClick={() => setShowChart(c.key)} style={{ padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", background: showChart === c.key ? "#1a73e8" : (darkMode ? "#2e3250" : "#f0f2f5"), color: showChart === c.key ? "#fff" : d.subtext, fontWeight: showChart === c.key ? 700 : 400, fontSize: 13 }}>{c.label}</button>
                    ))}
                  </div>
                </div>
                {showChart === "status"
                  ? <DonutChart data={[{ label: "Open", value: open, color: "#e53935" }, { label: "In Progress", value: inProgress, color: "#fb8c00" }, { label: "Resolved", value: resolved, color: "#43a047" }]} />
                  : <BarChart data={[{ label: "High", value: tickets.filter(t => t.priority === "High").length, color: "#e53935" }, { label: "Medium", value: tickets.filter(t => t.priority === "Medium").length, color: "#fb8c00" }, { label: "Low", value: tickets.filter(t => t.priority === "Low").length, color: "#43a047" }]} />
                }
              </div>
            )}

            <div style={{ background: d.card, borderRadius: 12, padding: 28, marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <h2 style={{ margin: "0 0 20px 0", fontSize: 18, color: d.text, fontWeight: 700 }}>➕ Create New Ticket</h2>
              <input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                style={{ ...inputStyle, marginBottom: 12, border: `1.5px solid ${form.title ? d.inputBorder : "#e53935"}` }} />
              <div style={{ position: "relative", marginBottom: 8 }}>
                <textarea placeholder="Description — or use voice 🎤" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ ...inputStyle, height: 90, resize: "vertical", paddingRight: 48 }} />
                <button onClick={listening ? stopVoice : startVoice} style={{ position: "absolute", right: 10, top: 10, background: listening ? "#e53935" : "#1a73e8", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>{listening ? "⏹" : "🎤"}</button>
              </div>
              {listening && <div style={{ fontSize: 12, color: "#e53935", marginBottom: 8, animation: "pulse 1s infinite" }}>🔴 Listening... speak now</div>}
              <button onClick={aiCategorize} disabled={aiLoading} style={{ background: aiLoading ? "#b0bec5" : "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8, cursor: aiLoading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{aiLoading ? "🤖 Analyzing..." : "🤖 AI Suggest Priority & Category"}</button>
              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ ...inputStyle, flex: 1, width: "auto" }}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, flex: 1, width: "auto" }}>
                  <option>Software</option><option>Hardware</option><option>Network</option>
                </select>
                <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} style={{ ...inputStyle, flex: 1, width: "auto" }}>
                  {TEAM.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 12, color: d.subtext, marginBottom: 16 }}>⏱ SLA: High = 2h | Medium = 8h | Low = 24h</div>
              <button onClick={handleSubmit} disabled={!form.title} style={{ background: form.title ? "#1a73e8" : "#b0bec5", color: "#fff", border: "none", padding: "11px 28px", borderRadius: 8, cursor: form.title ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600 }}>Submit Ticket</button>
            </div>

            <div style={{ background: d.card, borderRadius: 12, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <input placeholder="🔍 Search tickets..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: d.subtext, fontSize: 13 }}>Status:</span>
                  {["All", "Open", "In Progress", "Resolved"].map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: statusFilter === f ? "#1a73e8" : (darkMode ? "#2e3250" : "#f0f2f5"), color: statusFilter === f ? "#fff" : d.subtext, fontWeight: statusFilter === f ? 700 : 400, fontSize: 12 }}>{f}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: d.subtext, fontSize: 13 }}>Priority:</span>
                  {["All", "High", "Medium", "Low"].map(p => (
                    <button key={p} onClick={() => setPriorityFilter(p)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: priorityFilter === p ? "#1a73e8" : (darkMode ? "#2e3250" : "#f0f2f5"), color: priorityFilter === p ? "#fff" : d.subtext, fontWeight: priorityFilter === p ? 700 : 400, fontSize: 12 }}>{p}</button>
                  ))}
                </div>
                <span style={{ marginLeft: "auto", color: d.subtext, fontSize: 13 }}>{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <h2 style={{ fontSize: 18, color: d.text, fontWeight: 700, marginBottom: 16 }}>All Tickets</h2>
            {filtered.length === 0 && <div style={{ background: d.card, borderRadius: 12, padding: 40, textAlign: "center", color: d.subtext }}>🎉 No tickets found!</div>}
            {filtered.map(t => (
              <div key={t._id} style={{ background: d.card, borderRadius: 12, borderLeft: `5px solid ${priorityBorder[t.priority] || "#ccc"}`, padding: "18px 20px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", opacity: t.status === "Resolved" ? 0.75 : 1 }}>
                {editId === t._id ? (
                  <div>
                    <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} style={{ ...inputStyle, marginBottom: 8, border: "1.5px solid #1a73e8" }} />
                    <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ ...inputStyle, marginBottom: 8, height: 70 }} />
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })} style={{ ...inputStyle, flex: 1, width: "auto" }}>
                        <option>Low</option><option>Medium</option><option>High</option>
                      </select>
                      <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} style={{ ...inputStyle, flex: 1, width: "auto" }}>
                        <option>Software</option><option>Hardware</option><option>Network</option>
                      </select>
                      <select value={editForm.assignee || "Unassigned"} onChange={e => setEditForm({ ...editForm, assignee: e.target.value })} style={{ ...inputStyle, flex: 1, width: "auto" }}>
                        {TEAM.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveEdit} style={{ background: "#1a73e8", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>💾 Save</button>
                      <button onClick={() => setEditId(null)} style={{ background: darkMode ? "#2e3250" : "#f0f2f5", color: d.subtext, border: "none", padding: "8px 20px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 15, color: d.text, textDecoration: t.status === "Resolved" ? "line-through" : "none" }}>{t.title}</strong>
                        <span style={{ background: t.priority === "High" ? "#ffebee" : t.priority === "Medium" ? "#fff3e0" : "#e8f5e9", color: t.priority === "High" ? "#e53935" : t.priority === "Medium" ? "#fb8c00" : "#43a047", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600, border: `1px solid ${t.priority === "High" ? "#e53935" : t.priority === "Medium" ? "#fb8c00" : "#43a047"}` }}>{t.priority}</span>
                        <span style={{ background: darkMode ? "#1a2a4a" : "#e8f0fe", color: "#1a73e8", borderRadius: 6, padding: "2px 10px", fontSize: 12 }}>{t.category}</span>
                        {t.assignee && t.assignee !== "Unassigned" && <span style={{ background: darkMode ? "#2a1a4a" : "#f3e5f5", color: "#9c27b0", borderRadius: 6, padding: "2px 10px", fontSize: 12 }}>👤 {t.assignee}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select value={t.status} onChange={e => updateStatus(t._id, e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${d.inputBorder}`, fontSize: 13, background: d.input, color: d.text }}>
                          <option>Open</option><option>In Progress</option><option>Resolved</option>
                        </select>
                        <button onClick={() => startEdit(t)} style={{ background: darkMode ? "#1a2a4a" : "#e8f0fe", color: "#1a73e8", border: "1.5px solid #1a73e8", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>✏️</button>
                        <button onClick={() => deleteTicket(t._id)} style={{ background: darkMode ? "#2a1a1a" : "#ffebee", color: "#e53935", border: "1.5px solid #e53935", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>🗑</button>
                      </div>
                    </div>
                    {t.description && <p style={{ color: d.subtext, marginTop: 10, marginBottom: 8, fontSize: 14, lineHeight: 1.5 }}>{t.description}</p>}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                      <SLATimer slaDeadline={t.slaDeadline} status={t.status} />
                      {t.createdAt && <span style={{ fontSize: 12, color: d.subtext, opacity: 0.7 }}>🕐 {formatDate(t.createdAt)}</span>}
                      {t.activityLog && t.activityLog.length > 0 && (
                        <button onClick={() => setExpandLog(expandLog === t._id ? null : t._id)} style={{ fontSize: 12, color: "#1a73e8", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                          {expandLog === t._id ? "▲ Hide log" : `▼ Log (${t.activityLog.length})`}
                        </button>
                      )}
                      <button onClick={() => setExpandComments(expandComments === t._id ? null : t._id)} style={{ fontSize: 12, color: "#9c27b0", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                        {expandComments === t._id ? "▲ Hide" : `💬 Comments (${t.comments ? t.comments.length : 0})`}
                      </button>
                    </div>
                    {expandLog === t._id && t.activityLog && (
                      <div style={{ marginTop: 10, background: darkMode ? "#161926" : "#f8f9ff", borderRadius: 8, padding: 12 }}>
                        {[...t.activityLog].reverse().map((log, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < t.activityLog.length - 1 ? 8 : 0 }}>
                            <span style={{ color: "#1a73e8", fontSize: 12 }}>•</span>
                            <span style={{ fontSize: 12, color: d.subtext }}>{log.action}</span>
                            <span style={{ fontSize: 11, color: d.subtext, opacity: 0.6, marginLeft: "auto", whiteSpace: "nowrap" }}>{formatDate(log.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {expandComments === t._id && (
                      <CommentsSection ticket={t} d={d} darkMode={darkMode} onAddComment={addComment} onDeleteComment={deleteComment} aiSummarize={aiSummarize} />
                    )}
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}