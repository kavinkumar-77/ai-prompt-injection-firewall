/**
 * Project AEGIS Attack Matrix & Real-time Metrics Visualizer.
 */

import React from "react";
import { Cpu, Database, Eye, ShieldAlert, Zap } from "lucide-react";
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
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Threats */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Threats Intercepted
            </span>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats.total_threats}
            </span>
            <span className="text-xs text-red-400 font-medium">100% Neutralized</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Across active browsing sessions</p>
        </div>

        {/* Prompt Injections */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Prompt Injections
            </span>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-cyan-400 tracking-tight">
              {stats.injections_blocked}
            </span>
            <span className="text-xs text-slate-400 font-mono">({injectionPct}%)</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Obfuscated Base64, Hex & Direct</p>
        </div>

        {/* Data Exfiltrations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Data Exfiltrations
            </span>
            <Database className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {stats.exfiltrations_blocked}
            </span>
            <span className="text-xs text-slate-400 font-mono">({exfilPct}%)</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Tainted tokens & credentials blocked</p>
        </div>

        {/* Visual Phishing */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Visual Phishing Clones
            </span>
            <Eye className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-purple-400 tracking-tight">
              {stats.phishing_blocked}
            </span>
            <span className="text-xs text-slate-400 font-mono">({phishingPct}%)</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Perceptual layout hash matches</p>
        </div>
      </div>

      {/* Visual Distribution & System Health Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Threat Distribution Bar */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Threat Category Distribution</h3>
            <span className="text-xs text-slate-400">Average Risk Score: {(stats.avg_risk_score * 100).toFixed(1)}%</span>
          </div>

          {/* Progress Breakdown Bar */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
            <div style={{ width: `${injectionPct}%` }} className="bg-cyan-500 h-full transition-all duration-500" title="Injections" />
            <div style={{ width: `${exfilPct}%` }} className="bg-amber-500 h-full transition-all duration-500" title="Exfiltrations" />
            <div style={{ width: `${phishingPct}%` }} className="bg-purple-500 h-full transition-all duration-500" title="Phishing" />
          </div>

          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
              <span>Prompt Injections ({injectionPct}%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>Data Exfiltration ({exfilPct}%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
              <span>Visual Clones ({phishingPct}%)</span>
            </div>
          </div>
        </div>

        {/* Local Gateway & VRAM Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Gateway Engine Status
              </span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-sm font-bold text-white">
                {connected ? "FastAPI Gateway Online (Port 8000)" : "Local Gateway (Fallback Mode)"}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Hardware Target:</span>
            <span className="font-mono text-cyan-400">RTX 4050 (6GB VRAM Budget)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
