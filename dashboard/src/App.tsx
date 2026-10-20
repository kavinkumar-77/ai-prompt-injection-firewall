/**
 * Main Application View for Project AEGIS Security Dashboard.
 * Redesigned for production-grade presentation: clean, user-friendly, and uncluttered.
 */

import React, { useState } from "react";
import {
  Activity,
  FileText,
  Layers,
  RefreshCw,
  Shield,
  Sliders,
  Terminal,
} from "lucide-react";
import { AttackMatrix } from "./components/AttackMatrix";
import { AuditReport } from "./components/AuditReport";
import { GuardrailsMatrix } from "./components/GuardrailsMatrix";
import { SandboxInspector } from "./components/SandboxInspector";
import { ThreatFeed } from "./components/ThreatFeed";
import { useThreats } from "./hooks/useThreats";

type TabType = "overview" | "sandbox" | "telemetry" | "guardrails";

export const App: React.FC = () => {
  const { threats, stats, loading, connected, refreshThreats } = useThreats(3000);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showAuditReport, setShowAuditReport] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm tracking-tight text-white font-mono">PROJECT AEGIS</span>
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-1.5 py-0.2 rounded font-semibold">
                  v1.0
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "overview"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("sandbox")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "sandbox"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>AI Security Sandbox</span>
            </button>

            <button
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "telemetry"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Threat Feed</span>
            </button>

            <button
              onClick={() => setActiveTab("guardrails")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "guardrails"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Guardrails</span>
            </button>
          </nav>
        </div>

        {/* Status Indicator & Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refreshThreats()}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition-colors"
            title="Refresh threat feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <div className="flex items-center space-x-2 text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/70 px-2.5 py-1 rounded-full">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="font-semibold tracking-wide">
              {connected ? "LIVE TELEMETRY" : "LOCAL ENGINE"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Sub-header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {activeTab === "overview" && "Autonomous AI Defense & Threat Overview"}
              {activeTab === "sandbox" && "AI Security Sandbox & Interactive Prober"}
              {activeTab === "telemetry" && "Security Telemetry & Historical Audit Log"}
              {activeTab === "guardrails" && "Capability Policies & RTX 4050 Hardware Profile"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Protecting AI assistants and autonomous browsing agents from indirect prompt injection and data leaks.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAuditReport(true)}
              className="flex items-center space-x-1.5 text-xs text-emerald-300 hover:text-white font-semibold px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/80 rounded-lg shadow-sm transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Generate Audit Report</span>
            </button>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            >
              Swagger Docs
            </a>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <AttackMatrix stats={stats} connected={connected} />
            <ThreatFeed threats={threats.slice(0, 5)} />
          </div>
        )}

        {/* Tab 2: Interactive AI Sandbox */}
        {activeTab === "sandbox" && <SandboxInspector />}

        {/* Tab 3: Full Telemetry Feed */}
        {activeTab === "telemetry" && <ThreatFeed threats={threats} />}

        {/* Tab 4: Guardrails & Hardware Profile */}
        {activeTab === "guardrails" && <GuardrailsMatrix />}
      </main>

      {/* Security Audit Report Modal */}
      {showAuditReport && (
        <AuditReport
          threats={threats}
          onClose={() => setShowAuditReport(false)}
        />
      )}

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-600">
        B.Tech Final Year Engineering Project &bull; Project AEGIS &bull; Local-First AI Defense Gateway
      </footer>
    </div>
  );
};

export default App;
