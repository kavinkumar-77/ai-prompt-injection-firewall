import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Copy,
  Database,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { api, SecurityEvent } from "../api";

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEvents(100);
      setEvents(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load security audit events");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear the audit event log?")) return;
    try {
      await api.clearEvents();
      await loadEvents();
      setSelectedEvent(null);
    } catch (err: any) {
      alert("Failed to clear events: " + err.message);
    }
  };

  const handleSeed = async () => {
    try {
      await api.seedDemoEvents();
      await loadEvents();
    } catch (err: any) {
      alert("Failed to seed demo events: " + err.message);
    }
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(events, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegis-security-events-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  const handleExportCSV = () => {
    const headers = ["id", "timestamp", "verdict", "attack_type", "risk_score", "source", "payload_hash"];
    const rows = events.map((e) => [
      e.id,
      e.timestamp,
      e.details?.verdict || "block",
      e.attack_type,
      e.risk_score,
      e.details?.source || e.source_url || "unknown",
      e.details?.payload_hash || "none",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegis-security-events-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const filteredEvents = events.filter((e) => {
    const verdict = (e.details?.verdict || "block").toLowerCase();
    if (verdictFilter !== "all" && verdict !== verdictFilter.toLowerCase()) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = e.id.toLowerCase().includes(q);
      const matchType = e.attack_type.toLowerCase().includes(q);
      const matchSource = (e.source_url || "").toLowerCase().includes(q);
      const matchHash = (e.details?.payload_hash || "").toLowerCase().includes(q);
      const matchReason = (e.details?.reasoning || "").toLowerCase().includes(q);
      return matchId || matchType || matchSource || matchHash || matchReason;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-[#111622] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-400" />
              <span>Security Event Audit Trail</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Privacy-preserving event log. Raw prompts are masked with cryptographic SHA-256 digests.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              disabled={events.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              disabled={events.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handleClear}
              disabled={events.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center space-x-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/[0.06] text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event ID, SHA-256 hash, attack type, or reasoning..."
              className="w-full bg-[#0E131F] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono placeholder-zinc-600"
            />
          </div>

          <div>
            <select
              value={verdictFilter}
              onChange={(e) => setVerdictFilter(e.target.value)}
              className="w-full bg-[#0E131F] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="all">All Verdicts</option>
              <option value="block">Blocked Only</option>
              <option value="redact">Redacted Only</option>
              <option value="warn">Warned Only</option>
              <option value="allow">Allowed Only</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-[#121826] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400 font-mono flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Loading audit log entries...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Database className="w-8 h-8 text-zinc-400 mx-auto" />
            <div className="text-sm text-zinc-300 font-medium">No matching audit events found</div>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No security events match the current search or filter criteria. Click below to load demo events.
            </p>
            <button
              onClick={handleSeed}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
            >
              Seed Demo Security Events
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-white/[0.03] border-b border-white/[0.06] text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Verdict</th>
                  <th className="p-3.5">Attack Classification</th>
                  <th className="p-3.5">Risk Score</th>
                  <th className="p-3.5">Source & Payload SHA-256</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredEvents.map((evt) => {
                  const verdict = evt.details?.verdict || "block";
                  const isBlock = verdict === "block";
                  const isRedact = verdict === "redact";
                  const isAllow = verdict === "allow";
                  const hash = evt.details?.payload_hash || evt.id;

                  return (
                    <tr
                      key={evt.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedEvent(evt)}
                    >
                      <td className="p-3.5 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleString()}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                            isBlock
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : isRedact
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : isAllow
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                          }`}
                        >
                          {verdict}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-white flex items-center space-x-1.5">
                          <span>{evt.attack_type}</span>
                          {evt.details?.is_demo_seed && (
                            <span className="text-[9px] font-mono bg-white/[0.08] text-zinc-400 px-1 py-0.2 rounded">
                              demo_seed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {evt.details?.reasoning || "Standard gateway policy enforcement."}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <span
                          className={`font-semibold ${
                            evt.risk_score >= 0.7
                              ? "text-rose-400"
                              : evt.risk_score >= 0.4
                                ? "text-amber-400"
                                : "text-emerald-400"
                          }`}
                        >
                          {(evt.risk_score * 100).toFixed(0)}%
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-zinc-400">
                        <div className="text-zinc-300 truncate max-w-xs">
                          {evt.details?.source || evt.source_url || "client_api"}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-xs">
                          sha256:{hash.slice(0, 20)}...
                        </div>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-blue-400 font-medium text-xs border border-white/[0.06] transition-all"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Detail Slide-over / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-white/[0.1] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white font-mono">
                  Security Event #{selectedEvent.id.slice(0, 16)}...
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.04]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-lg">
                <div className="text-zinc-400 text-[10px] uppercase font-mono">Verdict</div>
                <div className="font-bold font-mono text-white mt-1 uppercase">
                  {selectedEvent.details?.verdict || "block"}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-lg">
                <div className="text-zinc-400 text-[10px] uppercase font-mono">Risk Score</div>
                <div className="font-bold font-mono text-rose-400 mt-1">
                  {(selectedEvent.risk_score * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-lg">
                <div className="text-zinc-400 text-[10px] uppercase font-mono">Timestamp</div>
                <div className="font-mono text-zinc-300 mt-1 text-[11px]">
                  {new Date(selectedEvent.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Payload SHA-256 Digest */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between text-zinc-400 font-mono text-[10px] uppercase">
                <span>Cryptographic Payload Digest (SHA-256)</span>
                <button
                  onClick={() =>
                    handleCopyHash(selectedEvent.details?.payload_hash || selectedEvent.id)
                  }
                  className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedHash ? "Copied!" : "Copy Hash"}</span>
                </button>
              </div>
              <div className="font-mono text-zinc-300 text-[11px] bg-black/40 p-2 rounded break-all select-all">
                {selectedEvent.details?.payload_hash || selectedEvent.id}
              </div>
              <div className="text-[10px] text-zinc-400">
                Zero raw prompt text is stored. The payload can be matched against an audit inquiry using salted HMAC-SHA-256.
              </div>
            </div>

            {/* Forensic Reasoning */}
            <div className="bg-white/[0.02] border border-white/[0.06] p-3 rounded-lg text-xs space-y-1">
              <div className="text-zinc-400 font-mono text-[10px] uppercase font-semibold">
                Forensic Rationale
              </div>
              <p className="text-zinc-300 font-mono leading-relaxed text-[11px]">
                {selectedEvent.details?.reasoning || "Policy threshold exceeded during layered analysis."}
              </p>
            </div>

            {/* Triggered Defense Layers */}
            {selectedEvent.details?.triggered_layers && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-300">Triggered Pipeline Layers</div>
                <div className="divide-y divide-white/[0.04] border border-white/[0.06] rounded-lg overflow-hidden text-xs">
                  {selectedEvent.details.triggered_layers.map((l: any, lIdx: number) => (
                    <div key={lIdx} className="p-2.5 flex items-center justify-between bg-white/[0.01]">
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-zinc-400 uppercase font-semibold">{l.layer}</span>
                        <span className="text-zinc-400">&bull;</span>
                        <span className="text-zinc-300">{l.label}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-400">
                        {(l.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
