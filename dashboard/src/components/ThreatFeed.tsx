/**
 * Real-time Threat Intelligence Feed for Project AEGIS.
 * Includes search, filtering, export, and detailed modal inspection.
 */

import React, { useState } from "react";
import { Clock, Download, ExternalLink, Filter, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
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

  const getBadge = (type: string) => {
    switch (type) {
      case "INJECTION":
        return "bg-cyan-950/80 text-cyan-400 border-cyan-800/80";
      case "EXFILTRATION":
        return "bg-amber-950/80 text-amber-400 border-amber-800/80";
      case "PHISHING":
        return "bg-purple-950/80 text-purple-400 border-purple-800/80";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header and Controls */}
      <div className="px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white tracking-tight">Real-Time Threat Telemetry</h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
            {filtered.length} events
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threats..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-52"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
            title="Export audit log to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Reset Telemetry Button */}
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-red-800/80 transition-colors"
            title="Reset threat telemetry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center space-x-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
        {["ALL", "INJECTION", "EXFILTRATION", "PHISHING"].map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === category
                ? "bg-slate-800 text-cyan-400 shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
            <tr>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Origin / Target</th>
              <th className="py-3 px-4">Risk</th>
              <th className="py-3 px-4">Security Rationale</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No threat events matching filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatTime(item.timestamp)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${getBadge(item.attack_type)}`}>
                      {item.attack_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate" title={item.source_url}>
                    {item.source_url ? (
                      <span className="font-mono text-slate-400 hover:text-cyan-400 transition-colors">
                        {item.source_url.replace(/^https?:\/\//, "")}
                      </span>
                    ) : (
                      <span className="text-slate-600">Local DOM Node</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-red-950/70 text-red-400 border border-red-800/60">
                      {(item.risk_score * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-[340px] truncate">
                    <span className="font-medium text-slate-200">
                      {item.details.reasoning || item.details.reason || "Adversarial capability blocked."}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedThreat(item)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline flex items-center justify-end space-x-1 ml-auto"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Drawer for Deep Inspection */}
      {selectedThreat && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${getBadge(selectedThreat.attack_type)}`}>
                  {selectedThreat.attack_type}
                </span>
                <h3 className="text-sm font-bold text-white font-mono">{selectedThreat.id}</h3>
              </div>
              <button onClick={() => setSelectedThreat(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block uppercase font-semibold">Origin URL</span>
                <span className="font-mono text-cyan-400 break-all">{selectedThreat.source_url || "Local Page Interaction"}</span>
              </div>

              <div>
                <span className="text-slate-500 block uppercase font-semibold">Security Rationale</span>
                <p className="text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800 mt-1">
                  {selectedThreat.details.reasoning || selectedThreat.details.reason || "Adversarial attack neutralized."}
                </p>
              </div>

              <div>
                <span className="text-slate-500 block uppercase font-semibold">Raw Security Details</span>
                <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedThreat.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedThreat(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
