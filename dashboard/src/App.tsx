/**
 * Main Application View for Project AEGIS Security Dashboard.
 * Overhauled into an executive enterprise app shell with sidebar navigation,
 * refined neutral-dark surfaces, balanced typography, and cohesive telemetry.
 */

import React, { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Cpu,
  ExternalLink,
  FileText,
  Layers,
  LayoutDashboard,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
} from "lucide-react";
import { AttackMatrix } from "./components/AttackMatrix";
import { AuditReport } from "./components/AuditReport";
import { DocsAndReasoning } from "./components/DocsAndReasoning";
import { GuardrailsMatrix } from "./components/GuardrailsMatrix";
import { LiveAttackStudio } from "./components/LiveAttackStudio";
import { ThreatFeed } from "./components/ThreatFeed";
import { useThreats } from "./hooks/useThreats";

type TabType = "overview" | "studio" | "docs" | "telemetry" | "guardrails";

export const App: React.FC = () => {
  const { threats, stats, loading, connected, refreshThreats } = useThreats(3000);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showAuditReport, setShowAuditReport] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#0A0C10] text-zinc-100 flex font-sans antialiased">
      {/* Modern Left Sidebar Navigation */}
      <aside className="w-64 bg-[#0E1015] border-r border-white/[0.08] flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-sm tracking-tight text-white font-mono">
                    AEGIS
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.2 rounded font-medium">
                    v1.2
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 tracking-tight">AI Firewall & Runtime Gateway</div>
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          <div className="p-3 space-y-6">
            {/* Group 1: Core Operations */}
            <div>
              <div className="px-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
                Core Defense
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "overview"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <LayoutDashboard className="w-4 h-4 text-zinc-400" />
                    <span>Overview & KPIs</span>
                  </div>
                  {activeTab === "overview" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("studio")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "studio"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Live Attack Studio</span>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-semibold">
                    Interactive
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("telemetry")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "telemetry"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Layers className="w-4 h-4 text-zinc-400" />
                    <span>Threat Telemetry</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded">
                    {threats.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Group 2: Intelligence & Specifications */}
            <div>
              <div className="px-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5">
                Intelligence & Auditing
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveTab("docs")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "docs"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <BookOpen className="w-4 h-4 text-zinc-400" />
                    <span>Docs & Reasoning</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">OWASP</span>
                </button>

                <button
                  onClick={() => setActiveTab("guardrails")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "guardrails"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Sliders className="w-4 h-4 text-zinc-400" />
                    <span>Guardrails & Hardware</span>
                  </div>
                </button>

                <button
                  onClick={() => setShowAuditReport(true)}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all text-left"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Audit Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer Profile */}
        <div className="p-4 border-t border-white/[0.08] space-y-3 bg-black/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span>Gateway Engine</span>
            </span>
            <span className="font-mono text-zinc-300 font-semibold">{connected ? ":8000" : "Offline"}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span>GPU Envelope:</span>
            </span>
            <span className="font-mono text-zinc-400">RTX 4050 6GB</span>
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 py-1 font-mono transition-colors"
          >
            <span>Swagger API Schema</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-white/[0.08] bg-[#0E1015]/80 backdrop-blur-xl px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
          {/* Breadcrumb Context */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-zinc-400">Project AEGIS</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-100 font-medium capitalize">
              {activeTab === "overview" && "Threat Operations & Metrics"}
              {activeTab === "studio" && "Authentic Attack & Defense Studio"}
              {activeTab === "docs" && "System Architecture & Reasoning System"}
              {activeTab === "telemetry" && "Real-Time Telemetry Feed"}
              {activeTab === "guardrails" && "Capability Policies & Hardware Allocation"}
            </span>
          </div>

          {/* Header Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => refreshThreats()}
              disabled={loading}
              className="p-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-white/[0.04] text-zinc-400 hover:text-white transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            </button>

            <div className="flex items-center space-x-2 text-[11px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08] px-3 py-1 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-amber-400"}`} />
              <span className="font-semibold">{connected ? "ACTIVE FIREWALL (<15ms SLA)" : "LOCAL FALLBACK"}</span>
            </div>

            <button
              onClick={() => setShowAuditReport(true)}
              className="flex items-center space-x-1.5 text-xs text-white font-medium px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Report</span>
            </button>
          </div>
        </header>

        {/* Workspace Canvas Area */}
        <main className="flex-1 p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <AttackMatrix stats={stats} connected={connected} />
              <ThreatFeed threats={threats.slice(0, 5)} />
            </div>
          )}

          {/* Tab 2: Authentic Live Attack Studio */}
          {activeTab === "studio" && <LiveAttackStudio />}

          {/* Tab 3: Interactive Docs & Reasoning Reference */}
          {activeTab === "docs" && <DocsAndReasoning />}

          {/* Tab 4: Full Telemetry Feed */}
          {activeTab === "telemetry" && <ThreatFeed threats={threats} />}

          {/* Tab 5: Guardrails & Hardware Profile */}
          {activeTab === "guardrails" && <GuardrailsMatrix />}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-white/[0.06] px-8 py-4 text-center text-xs text-zinc-500">
          Project AEGIS &bull; Local-First AI Defense Gateway Against Prompt Injection & Data Leaks &bull; B.Tech Final Year Engineering
        </footer>
      </div>

      {/* Security Audit Report Modal */}
      {showAuditReport && (
        <AuditReport
          threats={threats}
          onClose={() => setShowAuditReport(false)}
        />
      )}
    </div>
  );
};

export default App;
