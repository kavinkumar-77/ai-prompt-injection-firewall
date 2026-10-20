/**
 * Main Application View for Project AEGIS Security Operator Dashboard.
 * Enterprise security console powered exclusively by real telemetry and models.
 */

import React, { useState } from "react";
import {
  Award,
  ChevronRight,
  Database,
  FileText,
  LayoutDashboard,
  Shield,
  Sliders,
  Terminal,
} from "lucide-react";
import { OverviewPage } from "./components/OverviewPage";
import { PlaygroundPage } from "./components/PlaygroundPage";
import { AttackLabPage } from "./components/AttackLabPage";
import { EventsPage } from "./components/EventsPage";
import { PoliciesPage } from "./components/PoliciesPage";
import { EvaluationPage } from "./components/EvaluationPage";
import { AuditReportPage } from "./components/AuditReportPage";

type TabType = "overview" | "playground" | "lab" | "events" | "policies" | "evaluation" | "audit";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  return (
    <div className="min-h-screen bg-[#0A0D14] text-zinc-100 flex font-sans antialiased">
      {/* Modern Left Sidebar Navigation */}
      <aside className="w-64 bg-[#0E121B] border-r border-white/[0.08] flex flex-col justify-between shrink-0 select-none">
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
                    v1.0.0
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 tracking-tight">Security Gateway Console</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-6">
            {/* Primary Defense */}
            <div>
              <div className="px-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Operations
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
                    <span>Overview & Telemetry</span>
                  </div>
                  {activeTab === "overview" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("playground")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "playground"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>Inspection Playground</span>
                  </div>
                  {activeTab === "playground" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("lab")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "lab"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Terminal className="w-4 h-4 text-rose-400" />
                    <span>Attack Lab Arena</span>
                  </div>
                  <span className="text-[10px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded font-semibold">
                    Live
                  </span>
                </button>
              </div>
            </div>

            {/* Governance & Auditing */}
            <div>
              <div className="px-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Governance & Auditing
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveTab("events")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "events"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Database className="w-4 h-4 text-zinc-400" />
                    <span>Audit Events Log</span>
                  </div>
                  {activeTab === "events" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("policies")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "policies"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Sliders className="w-4 h-4 text-zinc-400" />
                    <span>Security Policies</span>
                  </div>
                  {activeTab === "policies" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                </button>
              </div>
            </div>

            {/* Verification & Reporting */}
            <div>
              <div className="px-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Verification & Reports
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveTab("evaluation")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "evaluation"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Evaluation & Benchmarks</span>
                  </div>
                  {activeTab === "evaluation" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("audit")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "audit"
                      ? "bg-white/[0.08] text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span>OWASP Compliance Report</span>
                  </div>
                  {activeTab === "audit" && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONNX CPU Engine</span>
            </span>
            <span className="text-[10px]">Active</span>
          </div>
          <div className="text-[10px] text-zinc-400">
            Hardware: 16 GB RAM &bull; Windows 11
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 border-b border-white/[0.08] bg-[#0E121B]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-sm text-white font-mono uppercase tracking-wider">
              {activeTab === "overview" && "Dashboard & Real-Time Telemetry"}
              {activeTab === "playground" && "Multi-Layer Inspection Playground"}
              {activeTab === "lab" && "Attack Lab &bull; Multi-Turn Agent Arena"}
              {activeTab === "events" && "Cryptographic Security Audit Log"}
              {activeTab === "policies" && "Security Policies & Threshold Configuration"}
              {activeTab === "evaluation" && "Empirical Evaluation & Measured Benchmarks"}
              {activeTab === "audit" && "OWASP Top 10 Executive Compliance Synthesis"}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Gateway: Online (8000)</span>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <div className="p-8 max-w-7xl w-full mx-auto">
          {activeTab === "overview" && <OverviewPage onNavigate={(t) => setActiveTab(t as TabType)} />}
          {activeTab === "playground" && <PlaygroundPage />}
          {activeTab === "lab" && <AttackLabPage />}
          {activeTab === "events" && <EventsPage />}
          {activeTab === "policies" && <PoliciesPage />}
          {activeTab === "evaluation" && <EvaluationPage />}
          {activeTab === "audit" && <AuditReportPage />}
        </div>
      </main>
    </div>
  );
};

export default App;
