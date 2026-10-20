/**
 * Real-time Threat Intelligence Feed for Project AEGIS.
 * Clean, modern event log with search, category filtering,
 * forensic inspection, and JSON audit export.
 */

import React, { useState } from "react";
import {
  Clock,
  Download,
  ExternalLink,
  Filter,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { ThreatEvent } from "../hooks/useThreats";

interface ThreatFeedProps {
  threats: ThreatEvent[];
}

export const ThreatFeed: React.FC<ThreatFeedProps> = ({ threats }) => {
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);

  const filtered = threats.filter((t) => {
    const matchesCategory = filter === "ALL" || t.attack_type === filter;
    const matchesSearch =
      searchQuery === "" ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.source_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(t.details).toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "INJECTION":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "EXFILTRATION":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PHISHING":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "bg-white/[0.06] text-zinc-300 border-white/[0.08]";
    }
  };

  const formatTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return isoStr;
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(threats, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegis-threat-audit-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    if (window.confirm("Reset all threat events and telemetry counters?")) {
      try {
        await fetch("http://localhost:8000/threat-intel/reset", { method: "POST" });
        window.location.reload();
      } catch (err) {
        console.error("Failed to reset threats:", err);
      }
    }
  };

  return (
    <div className="bg-[#13151B] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-semibold text-white tracking-tight uppercase font-mono">
            Threat Telemetry Feed
          </h2>
          <span className="text-[11px] bg-white/[0.06] text-zinc-400 px-2 py-0.5 rounded font-mono">
            {filtered.length} events
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threat events..."
              className="bg-black/30 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-48 sm:w-56 transition-colors"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors"
            title="Export audit log to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs bg-white/[0.06] hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-rose-500/30 transition-colors"
            title="Reset telemetry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="px-6 py-2.5 bg-black/20 border-b border-white/[0.06] flex items-center space-x-1.5 text-xs">
        <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1" />
        {["ALL", "INJECTION", "EXFILTRATION", "PHISHING"].map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              filter === category
                ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Clean Telemetry Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/30 text-zinc-400 uppercase tracking-wider border-b border-white/[0.06] font-mono text-[11px]">
            <tr>
              <th className="py-3 px-5">Timestamp</th>
              <th className="py-3 px-4">Threat Type</th>
              <th className="py-3 px-4">Origin / Context</th>
              <th className="py-3 px-4">Risk Severity</th>
              <th className="py-3 px-4">Explainable Security Rationale</th>
              <th className="py-3 px-5 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                  No threat events matching filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-5 font-mono text-zinc-400 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{formatTime(item.timestamp)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide font-mono ${getBadgeStyle(
                        item.attack_type
                      )}`}
                    >
                      {item.attack_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 max-w-[200px] truncate" title={item.source_url}>
                    {item.source_url ? (
                      <span className="font-mono text-zinc-400 hover:text-blue-400 transition-colors">
                        {item.source_url.replace(/^https?:\/\//, "")}
                      </span>
                    ) : (
                      <span className="text-zinc-500">Local Session Interaction</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {(item.risk_score * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 max-w-[340px] truncate">
                    <span className="text-zinc-200">
                      {item.details.reasoning || item.details.reason || "Adversarial capability neutralized."}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedThreat(item)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline inline-flex items-center space-x-1"
                    >
                      <span>Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Forensic Inspection Modal */}
      {selectedThreat && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151B] border border-white/[0.12] rounded-xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center space-x-2.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold font-mono ${getBadgeStyle(
                    selectedThreat.attack_type
                  )}`}
                >
                  {selectedThreat.attack_type}
                </span>
                <h3 className="text-xs font-bold text-white font-mono">{selectedThreat.id}</h3>
              </div>
              <button
                onClick={() => setSelectedThreat(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-zinc-400 block uppercase font-mono text-[11px]">Source Origin</span>
                <span className="font-mono text-blue-400 break-all">{selectedThreat.source_url || "Local Page Interaction"}</span>
              </div>

              <div>
                <span className="text-zinc-400 block uppercase font-mono text-[11px]">Forensic Rationale</span>
                <p className="text-zinc-200 bg-black/30 p-3 rounded-lg border border-white/[0.06] mt-1 leading-relaxed">
                  {selectedThreat.details.reasoning || selectedThreat.details.reason || "Adversarial attack neutralized."}
                </p>
              </div>

              <div>
                <span className="text-zinc-400 block uppercase font-mono text-[11px]">Structured Telemetry Snapshot</span>
                <pre className="bg-black/40 p-3 rounded-lg border border-white/[0.06] text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-48 leading-normal">
                  {JSON.stringify(selectedThreat.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedThreat(null)}
                className="bg-white/[0.08] hover:bg-white/[0.12] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
