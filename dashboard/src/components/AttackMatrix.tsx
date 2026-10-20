/**
 * Project AEGIS Attack Matrix & Real-time Metrics Visualizer.
 * Overhauled for a clean, minimalist enterprise aesthetic.
 */

import React from "react";
import { Cpu, Database, Eye, ShieldAlert, Zap, CheckCircle2 } from "lucide-react";
import { ThreatStats } from "../hooks/useThreats";

interface AttackMatrixProps {
  stats: ThreatStats;
  connected: boolean;
}

export const AttackMatrix: React.FC<AttackMatrixProps> = ({ stats, connected }) => {
  const total = Math.max(1, stats.total_threats);
  const injectionPct = Math.round((stats.injections_blocked / total) * 100);
  const exfilPct = Math.round((stats.exfiltrations_blocked / total) * 100);
  const phishingPct = Math.round((stats.phishing_blocked / total) * 100);

  return (
    <div className="space-y-6">
      {/* Symmetrical 4-KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Threats Neutralized */}
        <div className="bg-[#13151B] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Total Intercepted
            </span>
            <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {stats.total_threats}
            </span>
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 mr-0.5" />
              <span>100% Contained</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Across active browsing & API sessions</p>
        </div>

        {/* KPI 2: Prompt Injections */}
        <div className="bg-[#13151B] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Prompt Injections
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {stats.injections_blocked}
            </span>
            <span className="text-xs font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded">
              {injectionPct}%
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Indirect RAG, delimiters & jailbreaks</p>
        </div>

        {/* KPI 3: Data Exfiltrations */}
        <div className="bg-[#13151B] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Data Exfiltrations
            </span>
            <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {stats.exfiltrations_blocked}
            </span>
            <span className="text-xs font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded">
              {exfilPct}%
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Tainted tokens & outbound beacons</p>
        </div>

        {/* KPI 4: Visual Phishing */}
        <div className="bg-[#13151B] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-5 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Visual Clones
            </span>
            <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-white font-mono">
              {stats.phishing_blocked}
            </span>
            <span className="text-xs font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded">
              {phishingPct}%
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Perceptual blockhash Hamming matches</p>
        </div>
      </div>

      {/* Symmetrical 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Category Distribution Breakdown */}
        <div className="bg-[#13151B] border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Threat Vector Distribution
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Categorical breakdown of intercepted attacks across active sessions
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-300 bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 rounded-md">
                Avg Risk: {(stats.avg_risk_score * 100).toFixed(1)}%
              </span>
            </div>

            {/* Clean Segmented Bar */}
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden flex p-0.5 gap-0.5 mb-6">
              <div
                style={{ width: `${Math.max(4, injectionPct)}%` }}
                className="bg-blue-500 h-full rounded-l-full transition-all duration-500"
                title={`Prompt Injections (${injectionPct}%)`}
              />
              <div
                style={{ width: `${Math.max(4, exfilPct)}%` }}
                className="bg-amber-500/80 h-full transition-all duration-500"
                title={`Data Exfiltration (${exfilPct}%)`}
              />
              <div
                style={{ width: `${Math.max(4, phishingPct)}%` }}
                className="bg-indigo-500/80 h-full rounded-r-full transition-all duration-500"
                title={`Visual Phishing (${phishingPct}%)`}
              />
            </div>

            {/* Clean Legend */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-black/20 border border-white/[0.06] rounded-lg">
                <div className="flex items-center space-x-1.5 text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-medium">Injections</span>
                </div>
                <div className="mt-1.5 text-base font-bold text-white font-mono">
                  {stats.injections_blocked}
                  <span className="text-xs font-normal text-zinc-500 ml-1">({injectionPct}%)</span>
                </div>
              </div>

              <div className="p-3 bg-black/20 border border-white/[0.06] rounded-lg">
                <div className="flex items-center space-x-1.5 text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-medium">Exfiltrations</span>
                </div>
                <div className="mt-1.5 text-base font-bold text-white font-mono">
                  {stats.exfiltrations_blocked}
                  <span className="text-xs font-normal text-zinc-500 ml-1">({exfilPct}%)</span>
                </div>
              </div>

              <div className="p-3 bg-black/20 border border-white/[0.06] rounded-lg">
                <div className="flex items-center space-x-1.5 text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="font-medium">Phishing</span>
                </div>
                <div className="mt-1.5 text-base font-bold text-white font-mono">
                  {stats.phishing_blocked}
                  <span className="text-xs font-normal text-zinc-500 ml-1">({phishingPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span>Fast-Path Detection SLA:</span>
            <span className="font-mono text-emerald-400 font-semibold">&lt; 15ms Latency Budget</span>
          </div>
        </div>

        {/* Right: Gateway Engine & Hardware Profile */}
        <div className="bg-[#13151B] border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  AEGIS Defense Pipeline
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  5-tier defense-in-depth pipeline active on gateway
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-md">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span>{connected ? "GATEWAY ONLINE" : "OFFLINE FALLBACK"}</span>
              </div>
            </div>

            {/* Pipeline Rows */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
                <span className="text-zinc-300">Layer 1: Deterministic Unwrapper</span>
                <span className="text-emerald-400">Base64 &bull; Hex &bull; Unicode</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
                <span className="text-zinc-300">Layer 2: AI Vector Prototype Classifier</span>
                <span className="text-emerald-400">Cosine Distance &lt;15ms</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
                <span className="text-zinc-300">Layer 3: Attention-Shift Divergence Probe</span>
                <span className="text-emerald-400">Task-Alignment Metric</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
                <span className="text-zinc-300">Layer 4: Capability & Taint Policy Enforcer</span>
                <span className="text-emerald-400">Outbound Taint Blocker</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
                <span className="text-zinc-300">Layer 5: System Canary Token Shield</span>
                <span className="text-emerald-400">Leak Scrubber & Alert</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span>VRAM Allocation:</span>
            </span>
            <span className="font-mono text-zinc-200">RTX 4050 6GB (Zero Memory Leak)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
