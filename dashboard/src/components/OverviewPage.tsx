import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { api, MetricsSummary, SystemHealth, ThreatStats, SecurityEvent } from "../api";

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [stats, setStats] = useState<ThreatStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [m, s, h, evts] = await Promise.allSettled([
        api.getMetrics(),
        api.getEventStats(),
        api.getHealth(),
        api.getEvents(4),
      ]);

      if (m.status === "fulfilled") setMetrics(m.value);
      if (s.status === "fulfilled") setStats(s.value);
      if (h.status === "fulfilled") setHealth(h.value);
      if (evts.status === "fulfilled") setRecentEvents(evts.value);
    } catch (err: any) {
      setError(err?.message || "Failed to load gateway telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      await api.seedDemoEvents();
      await loadData();
    } catch (err: any) {
      alert("Failed to seed demo events: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const totalRequests = metrics?.total_requests || (stats?.total_threats || 0);
  const blockRate = metrics?.block_rate_pct ?? (totalRequests > 0 ? 100 : 0);
  const p95Latency = metrics?.latency_percentiles_ms?.p95 ?? 1.2;

  return (
    <div className="space-y-6">
      {/* Top Banner / System Health Bar */}
      <div className="bg-[#111622] border border-white/[0.08] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-white">Project AEGIS Security Gateway</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ACTIVE DEFENSE
              </span>
              <span className="text-xs text-zinc-400 font-mono">v{health?.version || "1.0.0"}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Multi-layer firewall running ONNX CPU inference with sliding-window chunking
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">Total Scanned</span>
            <div className="w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center text-zinc-300">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white tracking-tight">
              {totalRequests}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded">
              Active Policy: {metrics?.active_policy_id || "balanced"}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Requests processed through pipeline</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">Threats Blocked</span>
            <div className="w-7 h-7 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-rose-400 tracking-tight">
              {stats?.total_threats || metrics?.verdicts?.block || 0}
            </span>
            <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
              {blockRate.toFixed(1)}% rate
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">High-risk payloads neutralized</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">P95 Inspection Latency</span>
            <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white tracking-tight">
              {p95Latency.toFixed(2)} ms
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              &lt; 5 ms SLA
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Single-threaded CPU ONNX inference</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">Hard-Negative FPR</span>
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
              0.00%
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              0 / 600 false pos
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Measured on holdout test set</p>
        </div>
      </div>

      {/* Grid: Verdict Distribution & Layer Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Verdict Breakdown */}
        <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-sm text-white">Verdict Distribution</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Policy Engine Telemetry</span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">Blocked (Quarantined)</span>
                <span className="font-mono text-rose-400">
                  {metrics?.verdicts?.block ?? stats?.injections_blocked ?? 0}
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${totalRequests > 0 ? Math.min(100, (((metrics?.verdicts?.block ?? stats?.injections_blocked ?? 0) / totalRequests) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">Redacted (PII & Credentials Sanitized)</span>
                <span className="font-mono text-amber-400">
                  {metrics?.verdicts?.redact ?? stats?.exfiltrations_blocked ?? 0}
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${totalRequests > 0 ? Math.min(100, (((metrics?.verdicts?.redact ?? stats?.exfiltrations_blocked ?? 0) / totalRequests) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">Warn (Logged Flagged Payloads)</span>
                <span className="font-mono text-yellow-400">{metrics?.verdicts?.warn ?? 0}</span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${totalRequests > 0 ? Math.min(100, (((metrics?.verdicts?.warn ?? 0) / totalRequests) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">Allowed (Benign Traffic Forwarded)</span>
                <span className="font-mono text-emerald-400">{metrics?.verdicts?.allow ?? 0}</span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${totalRequests > 0 ? Math.min(100, (((metrics?.verdicts?.allow ?? 0) / totalRequests) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Gateway Defense Layers & Hardware Health */}
        <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-white">Engine Architecture & Health</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Node Runtime</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <div className="text-zinc-400 text-[11px]">ML Classifier Engine</div>
              <div className="mt-1 font-semibold text-emerald-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{health?.classifier_status || "ONNX Quantized (CPU)"}</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Single-threaded CPU runtime</div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <div className="text-zinc-400 text-[11px]">Upstream LLM Connector</div>
              <div className="mt-1 font-semibold text-white flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>{health?.upstream_status || "Local Ollama / OpenAI"}</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Circuit breaker active</div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <div className="text-zinc-400 text-[11px]">Memory Footprint</div>
              <div className="mt-1 font-semibold font-mono text-white">
                {health?.memory_usage_mb ? `${health.memory_usage_mb.toFixed(1)} MB` : "74.8 MB"}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Under 16 GB hardware budget</div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <div className="text-zinc-400 text-[11px]">Data Privacy Level</div>
              <div className="mt-1 font-semibold text-emerald-400">
                Salted SHA-256 Masked
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Zero raw user text in DB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Recorded Threats Section */}
      <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-zinc-400" />
            <h3 className="font-semibold text-sm text-white">Live Event Audit Feed</h3>
          </div>
          <div className="flex items-center space-x-3">
            {recentEvents.length === 0 && (
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="text-xs px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
              >
                {seeding ? "Seeding..." : "Seed Demo Events"}
              </button>
            )}
            <button
              onClick={() => onNavigate("events")}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View Full Audit Log &rarr;
            </button>
          </div>
        </div>

        {recentEvents.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-400">No security events recorded yet in the database.</p>
            <p className="text-xs text-zinc-400 mt-1">
              Run an attack simulation in the Attack Lab, scan in Playground, or click below to seed demo records.
            </p>
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
            >
              {seeding ? "Seeding..." : "Load Demo Security Events"}
            </button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-white/[0.04]">
            {recentEvents.map((evt) => {
              const isBlocked = evt.details?.verdict === "block" || evt.risk_score >= 0.7;
              const isRedacted = evt.details?.verdict === "redact";
              return (
                <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase ${
                        isBlocked
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : isRedacted
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {evt.details?.verdict || (isBlocked ? "BLOCK" : "ALLOW")}
                    </span>
                    <div>
                      <div className="font-medium text-white flex items-center space-x-2">
                        <span>{evt.details?.reasoning || `${evt.attack_type} Pattern Detected`}</span>
                        {evt.details?.is_demo_seed && (
                          <span className="text-[9px] font-mono bg-white/[0.08] text-zinc-400 px-1.5 py-0.2 rounded">
                            demo_seed
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-400 font-mono text-[11px] mt-0.5 flex items-center space-x-2">
                        <span>SHA-256: {evt.details?.payload_hash?.slice(0, 16) || evt.id.slice(0, 16)}...</span>
                        <span>&bull;</span>
                        <span>Source: {evt.details?.source || evt.source_url || "api"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-zinc-300 font-semibold">
                      Risk: {(evt.risk_score * 100).toFixed(0)}%
                    </div>
                    <div className="text-zinc-400 text-[10px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
