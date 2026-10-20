/**
 * Security Audit Report Generator for Project AEGIS.
 * Renders a professional, printable PDF-style security audit report
 * summarizing all intercepted threats and compliance status.
 *
 * Print CSS: hides nav + button so only the report body prints.
 */

import React from "react";
import { X, Printer, Shield, CheckCircle, AlertTriangle, MinusCircle } from "lucide-react";
import { ThreatEvent } from "../hooks/useThreats";

interface AuditReportProps {
  threats: ThreatEvent[];
  onClose: () => void;
}

// ─── OWASP LLM Top 10 data ───────────────────────────────────────────────────
const OWASP_MATRIX = [
  { id: "LLM01", name: "Prompt Injection",          status: "PROTECTED",    detail: "AEGIS AI Semantic Engine" },
  { id: "LLM02", name: "Insecure Output Handling",  status: "PROTECTED",    detail: "Canary Shield + Output Scanner" },
  { id: "LLM03", name: "Training Data Poisoning",   status: "MONITORED",    detail: "Indirect RAG Injection Detection" },
  { id: "LLM04", name: "Model DoS",                 status: "NOT_IN_SCOPE", detail: "—" },
  { id: "LLM05", name: "Supply Chain",              status: "NOT_IN_SCOPE", detail: "—" },
  { id: "LLM06", name: "Sensitive Info Disclosure", status: "PROTECTED",    detail: "PII Redactor + Taint Tracking" },
  { id: "LLM07", name: "Insecure Plugin Design",    status: "MONITORED",    detail: "Fetch Interceptor" },
  { id: "LLM08", name: "Excessive Agency",          status: "PROTECTED",    detail: "Exfiltration Blocker" },
  { id: "LLM09", name: "Overreliance",              status: "NOT_IN_SCOPE", detail: "—" },
  { id: "LLM10", name: "Model Theft",               status: "MONITORED",    detail: "Canary Token Detection" },
];

// ─── Defense architecture cards ──────────────────────────────────────────────
const DEFENSE_LAYERS = [
  {
    title: "AI Semantic Engine",
    desc: "TF-IDF Vector Similarity + Attention-Shift Divergence Probe",
    color: "border-cyan-700 bg-cyan-950/30",
    badge: "bg-cyan-900 text-cyan-300",
  },
  {
    title: "Taint Tracking",
    desc: "High-sensitivity token tagging across 47 credential patterns",
    color: "border-amber-700 bg-amber-950/30",
    badge: "bg-amber-900 text-amber-300",
  },
  {
    title: "Visual Phishing",
    desc: "Perceptual blockhash comparison against 12 brand templates",
    color: "border-purple-700 bg-purple-950/30",
    badge: "bg-purple-900 text-purple-300",
  },
  {
    title: "Network Guard",
    desc: "Fetch/XHR/Form interceptor with domain policy engine",
    color: "border-emerald-700 bg-emerald-950/30",
    badge: "bg-emerald-900 text-emerald-300",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateReportId(): string {
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `AEG-${hex()}-${hex()}-${hex()}`.toUpperCase();
}

function formatDateTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

function attackTypeBadge(type: string): string {
  switch (type) {
    case "INJECTION":
      return "bg-red-950 text-red-400 border border-red-800";
    case "EXFILTRATION":
      return "bg-orange-950 text-orange-400 border border-orange-800";
    case "PHISHING":
      return "bg-purple-950 text-purple-400 border border-purple-800";
    default:
      return "bg-blue-950 text-blue-400 border border-blue-800";
  }
}

function attackTypeAccent(type: string): string {
  switch (type) {
    case "INJECTION":   return "border-l-red-500";
    case "EXFILTRATION":return "border-l-orange-500";
    case "PHISHING":    return "border-l-purple-500";
    default:            return "border-l-blue-500";
  }
}

function owaspStatusBadge(status: string): JSX.Element {
  switch (status) {
    case "PROTECTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
          <CheckCircle className="w-3 h-3" /> PROTECTED
        </span>
      );
    case "MONITORED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-700">
          <AlertTriangle className="w-3 h-3" /> MONITORED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-500 border border-slate-700">
          <MinusCircle className="w-3 h-3" /> NOT IN SCOPE
        </span>
      );
  }
}

function overallRiskRating(threats: ThreatEvent[]): {
  label: string;
  color: string;
  bg: string;
} {
  if (threats.length === 0) return { label: "LOW", color: "text-emerald-400", bg: "bg-emerald-950 border-emerald-700" };
  const critCount = threats.filter((t) => t.risk_score > 0.8).length;
  if (critCount >= 5)  return { label: "CRITICAL", color: "text-red-400",     bg: "bg-red-950 border-red-700" };
  if (critCount >= 2)  return { label: "HIGH",     color: "text-orange-400",  bg: "bg-orange-950 border-orange-700" };
  if (critCount >= 1)  return { label: "MEDIUM",   color: "text-amber-400",   bg: "bg-amber-950 border-amber-700" };
  return                       { label: "LOW",      color: "text-emerald-400", bg: "bg-emerald-950 border-emerald-700" };
}

// ─── Report Component ─────────────────────────────────────────────────────────

export const AuditReport: React.FC<AuditReportProps> = ({ threats, onClose }) => {
  const reportId   = React.useMemo(generateReportId, []);
  const now        = new Date();
  const dateStart  = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const critCount  = threats.filter((t) => t.risk_score > 0.8).length;
  const risk       = overallRiskRating(threats);
  const timeline   = threats.slice(0, 20);

  const injCount   = threats.filter((t) => t.attack_type === "INJECTION").length;
  const exfCount   = threats.filter((t) => t.attack_type === "EXFILTRATION").length;
  const phiCount   = threats.filter((t) => t.attack_type === "PHISHING").length;
  const total      = Math.max(1, threats.length);

  const injPct     = Math.round((injCount / total) * 100);
  const exfPct     = Math.round((exfCount / total) * 100);
  const phiPct     = Math.round((phiCount / total) * 100);

  return (
    <>
      {/* Print-only styles injected via a <style> tag */}
      <style>{`
        @media print {
          .aegis-no-print { display: none !important; }
          .aegis-report-overlay {
            position: static !important;
            background: white !important;
            overflow: visible !important;
          }
          .aegis-report-body {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
          }
          .aegis-print-white { background: white !important; color: black !important; }
        }
      `}</style>

      {/* Full-screen overlay */}
      <div className="aegis-report-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto">
        {/* Sticky close/print bar — hidden on print */}
        <div className="aegis-no-print sticky top-0 z-10 flex items-center justify-between bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-6 py-3">
          <span className="text-sm font-bold text-white tracking-tight">Security Audit Report — Preview</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Close report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report body */}
        <div className="aegis-report-body max-w-5xl mx-auto my-6 bg-[#0D1117] text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden print:rounded-none print:border-none">

          {/* ── Report Header ─────────────────────────────────── */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-b border-slate-700 px-10 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xl tracking-tight text-white font-mono">PROJECT AEGIS</span>
                    <span className="text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-semibold">v1.0</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">AI Browser Security Gateway • Local-First</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block bg-red-900/70 text-red-300 border border-red-700 px-3 py-1 rounded text-xs font-bold tracking-widest uppercase">
                  ⚠ CONFIDENTIAL
                </span>
                <p className="text-slate-500 text-[11px] mt-1.5 font-mono">Report ID: {reportId}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-700/60 pt-5">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Security Audit Report</h1>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-slate-400 font-mono">
                <span>Organization: <span className="text-slate-200">Final Year Project Demo Environment</span></span>
                <span>Period: <span className="text-slate-200">{dateStart.toLocaleDateString()} – {now.toLocaleDateString()}</span></span>
                <span>Generated: <span className="text-slate-200">{formatDateTime(now.toISOString())}</span></span>
              </div>
            </div>
          </div>

          <div className="px-10 py-8 space-y-10">

            {/* ── Executive Summary ─────────────────────────────── */}
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Executive Summary</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {/* Total Threats */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Threats</p>
                  <p className="text-3xl font-extrabold text-white mt-1">{threats.length}</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5 font-semibold">100% Intercepted</p>
                </div>
                {/* Critical */}
                <div className="bg-slate-900 border border-red-900/60 rounded-xl p-4">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">Critical (risk &gt; 80%)</p>
                  <p className="text-3xl font-extrabold text-red-400 mt-1">{critCount}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">High-risk threats</p>
                </div>
                {/* Attack Types */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">Attack Vectors</p>
                  <div className="flex flex-col gap-0.5 mt-2 text-xs font-mono">
                    <span className="text-red-400">INJ <span className="text-white">{injCount}</span></span>
                    <span className="text-orange-400">EXF <span className="text-white">{exfCount}</span></span>
                    <span className="text-purple-400">PHI <span className="text-white">{phiCount}</span></span>
                  </div>
                </div>
                {/* Risk Rating */}
                <div className={`rounded-xl p-4 border ${risk.bg}`}>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">Overall Risk</p>
                  <p className={`text-2xl font-extrabold mt-1 ${risk.color}`}>{risk.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Threat posture</p>
                </div>
              </div>

              {/* Attack type distribution bars */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
                <p className="text-xs font-semibold text-slate-300">Attack Type Breakdown</p>
                {[
                  { label: "Prompt Injection",    count: injCount, pct: injPct, color: "bg-red-500" },
                  { label: "Data Exfiltration",   count: exfCount, pct: exfPct, color: "bg-orange-500" },
                  { label: "Visual Phishing",     count: phiCount, pct: phiPct, color: "bg-purple-500" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="font-mono text-slate-300">{row.count} events ({row.pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${row.color}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-emerald-400 font-semibold pt-1">✓ All attacks successfully intercepted by AEGIS</p>
              </div>
            </section>

            {/* ── OWASP LLM Top 10 Compliance Matrix ───────────── */}
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">OWASP LLM Top 10 Compliance Matrix</h2>
              <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-5">ID</th>
                      <th className="py-3 px-5">Vulnerability</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Mechanism</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {OWASP_MATRIX.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-3 px-5 font-mono font-bold text-slate-300 group-hover:text-cyan-400 transition-colors">
                          {row.id}
                        </td>
                        <td className="py-3 px-5 text-slate-200 font-medium">{row.name}</td>
                        <td className="py-3 px-5">{owaspStatusBadge(row.status)}</td>
                        <td className="py-3 px-5 text-slate-400 italic">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Attack Timeline ───────────────────────────────── */}
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Attack Timeline{" "}
                <span className="text-slate-600 normal-case font-normal">(last {timeline.length} events)</span>
              </h2>

              {timeline.length === 0 ? (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center text-slate-500 text-sm">
                  No threat events recorded in the last 24 hours.
                </div>
              ) : (
                <div className="relative pl-8 space-y-0">
                  {/* vertical line */}
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700" />

                  {timeline.map((t, idx) => (
                    <div
                      key={t.id}
                      className={`relative border-l-4 ${attackTypeAccent(t.attack_type)} bg-slate-900 border border-slate-700 border-l-0 rounded-lg p-4 mb-3 hover:bg-slate-800/50 transition-colors`}
                    >
                      {/* timeline dot */}
                      <div className="absolute -left-[1.65rem] top-4 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-500" />

                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-500 text-[11px] font-mono">
                            #{String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${attackTypeBadge(t.attack_type)}`}>
                            {t.attack_type}
                          </span>
                          <span className="text-slate-400 text-[11px] font-mono">{formatDateTime(t.timestamp)}</span>
                        </div>

                        {/* Risk gauge */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Risk</span>
                          <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${t.risk_score > 0.8 ? "bg-red-500" : t.risk_score > 0.5 ? "bg-orange-500" : "bg-amber-400"}`}
                              style={{ width: `${Math.round(t.risk_score * 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold font-mono ${t.risk_score > 0.8 ? "text-red-400" : "text-orange-400"}`}>
                            {Math.round(t.risk_score * 100)}%
                          </span>
                        </div>
                      </div>

                      <p className="mt-1.5 text-[11px] font-mono text-slate-500 truncate">
                        {t.source_url || "Local DOM interaction"}
                      </p>
                      <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                        {t.details.reasoning || t.details.reason || "Adversarial capability neutralized by AEGIS."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Defense Architecture Summary ──────────────────── */}
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Defense Architecture Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DEFENSE_LAYERS.map((layer) => (
                  <div
                    key={layer.title}
                    className={`rounded-xl border p-5 ${layer.color}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${layer.badge}`}>
                        ACTIVE
                      </span>
                      <h3 className="text-sm font-bold text-white">{layer.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400">{layer.desc}</p>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* ── Report Footer ──────────────────────────────────── */}
          <div className="border-t border-slate-800 bg-slate-950/60 px-10 py-5 text-center">
            <p className="text-[11px] text-slate-500 font-mono">
              Generated by AEGIS Security Gateway v1.0 • Private &amp; Local • Zero Cloud Telemetry
            </p>
            <p className="text-[10px] text-slate-700 mt-1">
              B.Tech Final Year Engineering Project • This report is generated locally and never transmitted.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
