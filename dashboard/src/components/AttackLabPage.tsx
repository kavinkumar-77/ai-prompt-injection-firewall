import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Key,
  Lock,
  Mail,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import {
  api,
  LabSummaryReport,
  ScenarioMeta,
} from "../api";

export const AttackLabPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scenario_02_indirect_email_exfil");
  const [loadingScenarios, setLoadingScenarios] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [labReport, setLabReport] = useState<LabSummaryReport | null>(null);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setLoadingScenarios(true);
      const list = await api.getScenarios();
      setScenarios(list);
      if (list.length > 0 && !selectedScenarioId) {
        setSelectedScenarioId(list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load attack scenarios");
    } finally {
      setLoadingScenarios(false);
    }
  };

  const handleRun = async () => {
    if (!selectedScenarioId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.runScenario(selectedScenarioId);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to execute scenario");
    } finally {
      setRunning(false);
    }
  };

  const handleOpenBatchReport = async () => {
    try {
      const rep = await api.getLabReport();
      setLabReport(rep);
      setShowBatchModal(true);
    } catch (err: any) {
      alert("Failed to load batch report: " + err.message);
    }
  };

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  // Safe data extraction from result (handles both camelCase and snake_case backend models)
  const withoutAegis = result?.without_aegis || result?.off_result || {};
  const withAegis = result?.with_aegis || result?.on_result || {};
  const isEffective = Boolean(
    result?.protection_effective ??
    result?.defense_effective ??
    (!withAegis.attack_succeeded && withoutAegis.attack_succeeded)
  );
  const offTraces = withoutAegis.traces || [];
  const onTraces = withAegis.traces || [];
  const offOutbox = withoutAegis.outbox_entries || [];
  const onOutbox = withAegis.outbox_entries || [];
  const offReason =
    withoutAegis.oracle_reason ||
    (withoutAegis.attack_succeeded
      ? "Attack succeeded: Directives executed by unprotected agent."
      : "Benign prompt executed normally.");
  const onReason =
    withAegis.oracle_reason ||
    (!withAegis.attack_succeeded
      ? "Protected: Intercepted and blocked by AEGIS gateway."
      : "Defense bypassed.");
  const gatewayExpl =
    withAegis.gateway_explanation ||
    (Array.isArray(withAegis.explanations) && withAegis.explanations.length > 0
      ? withAegis.explanations.join("; ")
      : "Protected by active AEGIS gateway policies.");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0C1222] via-[#0E1626] to-[#0A101D] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-tight">
                Attack Lab &bull; Runtime Security Arena
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Test real multi-turn autonomous agents with sandboxed tool calls. Compare live execution{" "}
              <span className="text-rose-400 font-semibold">Without Protection</span> vs{" "}
              <span className="text-emerald-400 font-semibold">With AEGIS Gateway</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenBatchReport}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Batch Evaluation Report</span>
            </button>
          </div>
        </div>

        {/* Scenario Selection Grid */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            Select Test Scenario ({scenarios.length} Available)
          </label>
          {loadingScenarios ? (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              Loading scenarios catalog...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenarioId(sc.id);
                    setResult(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedScenarioId === sc.id
                      ? "bg-indigo-600/15 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/40"
                      : "bg-[#0D1424] border-slate-800/80 hover:bg-[#121B2F] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold ${
                        sc.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : sc.severity === "HIGH"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {sc.severity}
                    </span>
                    <span className="text-slate-400">{sc.owasp_mapping}</span>
                  </div>
                  <div className="font-semibold text-xs text-slate-100 truncate">{sc.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{sc.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Scenario Card & Action Button */}
        {selectedScenario && (
          <div className="bg-[#090F1C] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center space-x-2">
                <span>{selectedScenario.title}</span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                  Target Tool: {selectedScenario.target_tool}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {selectedScenario.description}
              </p>
            </div>

            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/25 shrink-0"
            >
              <Play className={`w-4 h-4 fill-current ${running ? "animate-pulse" : ""}`} />
              <span>{running ? "Executing Simulation..." : "Run Side-by-Side Simulation"}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side Results Display */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Live Execution Telemetry &bull; Automated Oracle Evaluation
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase flex items-center space-x-1.5 ${
                isEffective
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
              }`}
            >
              {isEffective ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  <span>PROTECTION EFFECTIVE: AEGIS NEUTRALIZED ATTACK</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-400" />
                  <span>DEFENSE INEFFECTIVE</span>
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Without AEGIS (Unprotected) */}
            <div className="bg-[#13111C] border border-rose-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center font-mono font-bold text-xs border border-rose-500/30">
                    OFF
                  </div>
                  <span className="font-bold text-sm text-slate-100">Without AEGIS (Unprotected)</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold uppercase ${
                    withoutAegis.attack_succeeded
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {withoutAegis.attack_succeeded ? "ATTACK SUCCEEDED" : "SAFE / PERMITTED"}
                </span>
              </div>

              {/* Honeytoken Status */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  withoutAegis.honeytoken_compromised
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Honeytoken Secret Status</div>
                    <div className="text-[11px] opacity-80">
                      {withoutAegis.honeytoken_compromised
                        ? "Confidential honeytoken leaked / exfiltrated!"
                        : "No honeytoken secrets exposed"}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {withoutAegis.honeytoken_compromised ? "COMPROMISED" : "SAFE"}
                </span>
              </div>

              {/* Oracle Verdict & Reason */}
              <div className="bg-black/30 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                <div className="text-slate-400 font-mono text-[10px] uppercase font-semibold">
                  Automated Oracle Verdict
                </div>
                <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                  {offReason}
                </p>
              </div>

              {/* Agent Conversation & Tool Execution Trace */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-rose-400" />
                  <span>Agent Execution Trace & Tool Invocations</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {offTraces.length > 0 ? (
                    offTraces.map((tr: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-black/40 border border-slate-800/80 text-xs font-mono space-y-2"
                      >
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Turn {idx + 1} Prompt:</div>
                        <div className="text-slate-300 text-[11px] whitespace-pre-wrap break-all line-clamp-3">
                          {tr.prompt}
                        </div>

                        {tr.tool_calls && tr.tool_calls.length > 0 && (
                          <div className="pt-2 border-t border-slate-800 space-y-1.5">
                            <div className="text-rose-400 text-[10px] uppercase font-semibold">
                              Executed Tool Calls:
                            </div>
                            {tr.tool_calls.map((tc: any, cIdx: number) => (
                              <div
                                key={cIdx}
                                className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg text-[11px] text-rose-200"
                              >
                                <span className="font-bold">{tc.name}</span>
                                <pre className="text-[10px] text-slate-300 mt-1 whitespace-pre-wrap">
                                  {JSON.stringify(tc.arguments, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}

                        {tr.assistant_reply && (
                          <div className="pt-2 border-t border-slate-800">
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Assistant Reply:</div>
                            <div className="text-slate-300 text-[11px] whitespace-pre-wrap break-all">
                              {tr.assistant_reply}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : withoutAegis.assistant_reply ? (
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 text-xs font-mono space-y-1.5">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Assistant Response:</div>
                      <div className="text-slate-300 text-[11px] whitespace-pre-wrap">
                        {withoutAegis.assistant_reply}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-black/30 text-xs text-slate-500 font-mono text-center">
                      No tool executions recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Outbox Preview */}
              {offOutbox.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs">
                  <div className="text-rose-400 font-semibold mb-1 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Intercepted Sandbox Outbox (Leaked Messages)</span>
                  </div>
                  <div className="font-mono text-slate-300 text-[10px] space-y-1">
                    {offOutbox.map((msg: string, mIdx: number) => (
                      <div key={mIdx} className="p-1.5 bg-black/40 rounded whitespace-pre-wrap">
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: With AEGIS (Protected Gateway) */}
            <div className="bg-[#0D1822] border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs border border-emerald-500/30">
                    ON
                  </div>
                  <span className="font-bold text-sm text-slate-100">With AEGIS Gateway (Protected)</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold uppercase ${
                    withAegis.attack_succeeded
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {withAegis.attack_succeeded ? "ATTACK SUCCEEDED" : "ATTACK BLOCKED"}
                </span>
              </div>

              {/* Honeytoken Status */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  withAegis.honeytoken_compromised
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Honeytoken Secret Status</div>
                    <div className="text-[11px] opacity-80">
                      {withAegis.honeytoken_compromised
                        ? "Honeytoken leaked"
                        : "Honeytoken 100% protected and safe in sandbox"}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {withAegis.honeytoken_compromised ? "COMPROMISED" : "PROTECTED"}
                </span>
              </div>

              {/* Oracle Verdict & Reason */}
              <div className="bg-black/30 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                <div className="text-slate-400 font-mono text-[10px] uppercase font-semibold">
                  Automated Oracle Verdict
                </div>
                <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                  {onReason}
                </p>
              </div>

              {/* AEGIS Defense Explanation & Contributing Layers */}
              {gatewayExpl && (
                <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="text-indigo-300 font-semibold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>AEGIS Defense Rationale</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                    {gatewayExpl}
                  </p>
                </div>
              )}

              {/* Agent Conversation & Tool Execution Trace */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Protected Execution Trace</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {onTraces.length > 0 ? (
                    onTraces.map((tr: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-black/40 border border-slate-800/80 text-xs font-mono space-y-2"
                      >
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Turn {idx + 1} Prompt:</div>
                        <div className="text-slate-300 text-[11px] whitespace-pre-wrap break-all line-clamp-3">
                          {tr.prompt}
                        </div>

                        {tr.blocked_by_gateway && (
                          <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-center space-x-1.5">
                            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                            <div>
                              <span className="font-bold">[GATEWAY POLICY BLOCK]: </span>
                              <span>{tr.gateway_reason || "Prompt injection violation detected."}</span>
                            </div>
                          </div>
                        )}

                        {tr.assistant_reply && !tr.blocked_by_gateway && (
                          <div className="pt-2 border-t border-slate-800">
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Assistant Reply:</div>
                            <div className="text-slate-300 text-[11px] whitespace-pre-wrap break-all">
                              {tr.assistant_reply}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : withAegis.assistant_reply ? (
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 text-xs font-mono space-y-1.5">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Protected Response:</div>
                      <div className="text-slate-300 text-[11px] whitespace-pre-wrap">
                        {withAegis.assistant_reply}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-black/30 text-xs text-slate-500 font-mono text-center">
                      Execution contained safely by gateway.
                    </div>
                  )}
                </div>
              </div>

              {/* Clean Outbox Status */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-semibold">Sandbox Outbox Clean</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  {onOutbox.length} messages leaked
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Evaluation Summary Modal */}
      {showBatchModal && labReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C1222] border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white font-mono">
                  Attack Lab Batch Evaluation Report
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated offline evaluation across {labReport.total_scenarios_evaluated} realistic test scenarios.
                </p>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700"
              >
                Close
              </button>
            </div>

            {/* Overall Headline Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#090E1A] border border-slate-800">
                <div className="text-slate-400 text-[11px]">ASR Without AEGIS</div>
                <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                  {(labReport.overall_metrics.attack_success_rate_without_aegis * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090E1A] border border-slate-800">
                <div className="text-slate-400 text-[11px]">ASR With AEGIS</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {(labReport.overall_metrics.attack_success_rate_with_aegis * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090E1A] border border-slate-800">
                <div className="text-slate-400 text-[11px]">Risk Reduction</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {labReport.overall_metrics.risk_reduction_pct.toFixed(1)}%
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090E1A] border border-slate-800">
                <div className="text-slate-400 text-[11px]">Control FPR</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {(labReport.overall_metrics.false_positive_rate_on_controls * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Scenario Breakdown Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#090E1A] text-[11px] font-mono text-slate-400">
                  <tr>
                    <th className="p-3">Scenario</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Without AEGIS</th>
                    <th className="p-3 text-center">With AEGIS</th>
                    <th className="p-3">Oracle Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {labReport.scenario_results.map((sc, sIdx) => (
                    <tr key={sIdx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-slate-100">{sc.title}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{sc.category}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            sc.asr_without_aegis > 0
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {(sc.asr_without_aegis * 100).toFixed(0)}% ASR
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            sc.asr_with_aegis > 0
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {(sc.asr_with_aegis * 100).toFixed(0)}% ASR
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-mono text-[11px]">{sc.oracle_summary_protected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
