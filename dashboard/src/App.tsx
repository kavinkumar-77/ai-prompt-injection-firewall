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
import { ErrorBoundary } from "./components/ErrorBoundary";

type TabType = "overview" | "playground" | "lab" | "events" | "policies" | "evaluation" | "audit";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Modern Left Sidebar Navigation */}
      <aside className="w-64 bg-[#080C16] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-sm tracking-tight text-white font-mono">
                    AEGIS
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.2 rounded font-semibold">
                    v1.0.0
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 tracking-tight">AI Defense Gateway</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-6">
            {/* Primary Defense */}
            <div>
              <div className="px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">
                Operations
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "overview"
                      ? "bg-indigo-600/15 text-indigo-200 border-l-2 border-indigo-500 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <LayoutDashboard className={`w-4 h-4 ${activeTab === "overview" ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>Overview & Telemetry</span>
                  </div>
                  {activeTab === "overview" && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("playground")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "playground"
                      ? "bg-indigo-600/15 text-indigo-200 border-l-2 border-indigo-500 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Shield className={`w-4 h-4 ${activeTab === "playground" ? "text-indigo-400" : "text-indigo-400/80"}`} />
                    <span>Inspection Arena</span>
                  </div>
                  {activeTab === "playground" && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("lab")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "lab"
                      ? "bg-indigo-600/15 text-indigo-200 border-l-2 border-indigo-500 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Terminal className={`w-4 h-4 ${activeTab === "lab" ? "text-rose-400" : "text-rose-400/80"}`} />
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
              <div className="px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">
                Governance & Auditing
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("events")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "events"
                      ? "bg-indigo-600/15 text-indigo-200 border-l-2 border-indigo-500 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Database className={`w-4 h-4 ${activeTab === "events" ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>Audit Events Log</span>
                  </div>
                  {activeTab === "events" && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("policies")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "policies"
                      ? "bg-indigo-600/15 text-indigo-200 border-l-2 border-indigo-500 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Sliders className={`w-4 h-4 ${activeTab === "policies" ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>Security Policies</span>
                  </div>
                  {activeTab === "policies" && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              </div>
            </div>

            {/* Verification & Reporting */}
            <div>
              <div className="px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">
                Verification & Reports
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("evaluation")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "evaluation"
                      ? "bg-indigo-600/15 text-indigo-200 border-l-2 border-indigo-500 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Award className={`w-4 h-4 ${activeTab === "evaluation" ? "text-emerald-400" : "text-emerald-400/80"}`} />
                    <span>Evaluation & Benchmarks</span>
                  </div>
                  {activeTab === "evaluation" && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <button
                  onClick={() => setActiveTab("audit")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "audit"
                      ? "bg-indigo-600/15 text-indigo-200 border-l-2 border-indigo-500 font-semibold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className={`w-4 h-4 ${activeTab === "audit" ? "text-indigo-400" : "text-slate-400"}`} />
                    <span>OWASP Compliance Report</span>
                  </div>
                  {activeTab === "audit" && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 space-y-2 bg-[#060912]">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONNX CPU Engine</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Hardware: 16 GB RAM &bull; Windows 11
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 bg-[#080C16]/85 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-sm text-white font-mono uppercase tracking-wider">
              {activeTab === "overview" && "Dashboard & Real-Time Telemetry"}
              {activeTab === "playground" && "Multi-Layer Inspection Arena"}
              {activeTab === "lab" && "Attack Lab &bull; Multi-Turn Agent Arena"}
              {activeTab === "events" && "Cryptographic Security Audit Log"}
              {activeTab === "policies" && "Security Policies & Threshold Configuration"}
              {activeTab === "evaluation" && "Empirical Evaluation & Measured Benchmarks"}
              {activeTab === "audit" && "OWASP Top 10 Executive Compliance Synthesis"}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-[11px] font-medium shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Gateway: Online (8000)</span>
            </div>
          </div>
        </header>

        {/* Viewport Content with ErrorBoundary protection */}
        <div className="p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary key={activeTab}>
            {activeTab === "overview" && <OverviewPage onNavigate={(t) => setActiveTab(t as TabType)} />}
            {activeTab === "playground" && <PlaygroundPage />}
            {activeTab === "lab" && <AttackLabPage />}
            {activeTab === "events" && <EventsPage />}
            {activeTab === "policies" && <PoliciesPage />}
            {activeTab === "evaluation" && <EvaluationPage />}
            {activeTab === "audit" && <AuditReportPage />}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default App;
