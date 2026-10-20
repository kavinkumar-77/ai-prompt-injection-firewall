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
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import {
  api,
  LabSummaryReport,
  ScenarioComparisonResult,
  ScenarioMeta,
} from "../api";

export const AttackLabPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scenario_02_indirect_email_exfil");
  const [loadingScenarios, setLoadingScenarios] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<ScenarioComparisonResult | null>(null);
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111622] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-tight">
                Attack Lab &bull; Side-by-Side Runtime Arena
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Test real multi-turn autonomous agents with genuine tools in a sandboxed environment.
              Compare execution <span className="text-rose-400 font-semibold">Without Protection</span> vs{" "}
              <span className="text-emerald-400 font-semibold">With AEGIS Gateway</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenBatchReport}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 transition-all flex items-center space-x-1.5"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Batch Evaluation Report</span>
            </button>
          </div>
        </div>

        {/* Scenario Selection Grid */}
        <div>
          <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
            Select Test Scenario ({scenarios.length} Available)
          </label>
          {loadingScenarios ? (
            <div className="py-4 text-center text-xs text-zinc-400 font-mono">
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
                      ? "bg-blue-600/15 border-blue-500/50 shadow-sm"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold ${
                        sc.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-400"
                          : sc.severity === "HIGH"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {sc.severity}
                    </span>
                    <span className="text-zinc-400">{sc.owasp_mapping}</span>
                  </div>
                  <div className="font-semibold text-xs text-white truncate">{sc.title}</div>
                  <div className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{sc.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Scenario Card & Action Button */}
        {selectedScenario && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center space-x-2">
                <span>{selectedScenario.title}</span>
                <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded">
                  Target Tool: {selectedScenario.target_tool}
                </span>
              </div>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                {selectedScenario.description}
              </p>
            </div>

            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shrink-0"
            >
              <Play className={`w-4 h-4 fill-current ${running ? "animate-pulse" : ""}`} />
              <span>{running ? "Executing Agents..." : "Run Side-by-Side Simulation"}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side Results Display */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Live Execution Telemetry &bull; Automated Oracle Evaluation
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase flex items-center space-x-1.5 ${
                result.protection_effective
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              }`}
            >
              {result.protection_effective ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>PROTECTION EFFECTIVE: AEGIS NEUTRALIZED ATTACK</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  <span>DEFENSE INEFFECTIVE</span>
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Without AEGIS (Unprotected) */}
            <div className="bg-[#121826] border border-rose-500/30 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center font-mono font-bold text-xs">
                    OFF
                  </div>
                  <span className="font-bold text-sm text-white">Without AEGIS (Unprotected)</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold uppercase ${
                    result.without_aegis.attack_succeeded
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {result.without_aegis.attack_succeeded ? "ATTACK SUCCEEDED" : "SAFE / PERMITTED"}
                </span>
              </div>

              {/* Honeytoken Status */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  result.without_aegis.honeytoken_compromised
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Honeytoken Secret Status</div>
                    <div className="text-[11px] opacity-80">
                      {result.without_aegis.honeytoken_compromised
                        ? "Confidential honeytoken leaked / exfiltrated!"
                        : "No honeytoken secrets exposed"}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/30">
                  {result.without_aegis.honeytoken_compromised ? "COMPROMISED" : "SAFE"}
                </span>
              </div>

              {/* Oracle Verdict & Reason */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-xs space-y-1">
                <div className="text-zinc-400 font-mono text-[10px] uppercase font-semibold">
                  Automated Oracle Verdict
                </div>
                <p className="text-zinc-300 leading-relaxed font-mono text-[11px]">
                  {result.without_aegis.oracle_reason}
                </p>
              </div>

              {/* Agent Conversation & Tool Execution Trace */}
              <div>
                <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-rose-400" />
                  <span>Agent Execution Trace & Tool Invocations</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.without_aegis.traces.map((tr, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono space-y-1.5"
                    >
                      <div className="text-zinc-400 text-[10px] uppercase">Turn {idx + 1} Prompt:</div>
                      <div className="text-zinc-300 text-[11px] whitespace-pre-wrap break-all line-clamp-3">
                        {tr.prompt}
                      </div>

                      {tr.tool_calls.length > 0 && (
                        <div className="pt-2 border-t border-white/[0.06] space-y-1">
                          <div className="text-rose-400 text-[10px] uppercase font-semibold">
                            Executed Tool Calls:
                          </div>
                          {tr.tool_calls.map((tc, cIdx) => (
                            <div
                              key={cIdx}
                              className="bg-rose-500/10 border border-rose-500/20 p-2 rounded text-[11px] text-rose-200"
                            >
                              <span className="font-bold">{tc.name}</span>
                              <pre className="text-[10px] text-zinc-300 mt-1 whitespace-pre-wrap">
                                {JSON.stringify(tc.arguments, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}

                      {tr.assistant_reply && (
                        <div className="pt-2 border-t border-white/[0.06]">
                          <div className="text-zinc-400 text-[10px] uppercase">Assistant Reply:</div>
                          <div className="text-zinc-300 text-[11px] whitespace-pre-wrap break-all">
                            {tr.assistant_reply}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Outbox Preview */}
              {result.without_aegis.outbox_entries.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs">
                  <div className="text-rose-400 font-semibold mb-1 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Intercepted Sandbox Outbox (Leaked Messages)</span>
                  </div>
                  <div className="font-mono text-zinc-300 text-[10px] space-y-1">
                    {result.without_aegis.outbox_entries.map((msg, mIdx) => (
                      <div key={mIdx} className="p-1.5 bg-black/40 rounded whitespace-pre-wrap">
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: With AEGIS (Protected Gateway) */}
            <div className="bg-[#121826] border border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                    ON
                  </div>
                  <span className="font-bold text-sm text-white">With AEGIS Gateway (Protected)</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-bold uppercase ${
                    result.with_aegis.attack_succeeded
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {result.with_aegis.attack_succeeded ? "ATTACK SUCCEEDED" : "ATTACK BLOCKED"}
                </span>
              </div>

              {/* Honeytoken Status */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  result.with_aegis.honeytoken_compromised
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-semibold">Honeytoken Secret Status</div>
                    <div className="text-[11px] opacity-80">
                      {result.with_aegis.honeytoken_compromised
                        ? "Honeytoken leaked"
                        : "Honeytoken 100% protected and safe in sandbox"}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/30">
                  {result.with_aegis.honeytoken_compromised ? "COMPROMISED" : "PROTECTED"}
                </span>
              </div>

              {/* Oracle Verdict & Reason */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-xs space-y-1">
                <div className="text-zinc-400 font-mono text-[10px] uppercase font-semibold">
                  Automated Oracle Verdict
                </div>
                <p className="text-zinc-300 leading-relaxed font-mono text-[11px]">
                  {result.with_aegis.oracle_reason}
                </p>
              </div>

              {/* AEGIS Defense Explanation & Contributing Layers */}
              {result.with_aegis.gateway_explanation && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs space-y-1.5">
                  <div className="text-blue-300 font-semibold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AEGIS Defense Rationale</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-mono text-[11px]">
                    {result.with_aegis.gateway_explanation}
                  </p>
                </div>
              )}

              {/* Agent Conversation & Tool Execution Trace */}
              <div>
                <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Protected Execution Trace</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.with_aegis.traces.map((tr, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono space-y-1.5"
                    >
                      <div className="text-zinc-400 text-[10px] uppercase">Turn {idx + 1} Prompt:</div>
                      <div className="text-zinc-300 text-[11px] whitespace-pre-wrap break-all line-clamp-3">
                        {tr.prompt}
                      </div>

                      {tr.blocked_by_gateway && (
                        <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
                          <span className="font-bold">[GATEWAY POLICY BLOCK]: </span>
                          <span>{tr.gateway_reason || "Prompt injection violation detected."}</span>
                        </div>
                      )}

                      {tr.tool_results.some((t) => t.output.includes("[AEGIS POLICY BLOCK]")) && (
                        <div className="p-2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px]">
                          <span className="font-bold">[TOOL POLICY BLOCK]: </span>
                          <span>Capability policy prevented unauthorized tool execution.</span>
                        </div>
                      )}

                      {tr.assistant_reply && !tr.blocked_by_gateway && (
                        <div className="pt-2 border-t border-white/[0.06]">
                          <div className="text-zinc-400 text-[10px] uppercase">Assistant Reply:</div>
                          <div className="text-zinc-300 text-[11px] whitespace-pre-wrap break-all">
                            {tr.assistant_reply}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Clean Outbox Status */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-semibold">Sandbox Outbox Clean</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                  0 bytes leaked
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Evaluation Summary Modal */}
      {showBatchModal && labReport && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-white/[0.1] rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white font-mono">
                  Attack Lab Batch Evaluation Report
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Automated offline evaluation across {labReport.total_scenarios_evaluated} realistic test scenarios.
                </p>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-zinc-400 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]"
              >
                Close
              </button>
            </div>

            {/* Overall Headline Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-zinc-400 text-[11px]">ASR Without AEGIS</div>
                <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                  {(labReport.overall_metrics.attack_success_rate_without_aegis * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-zinc-400 text-[11px]">ASR With AEGIS</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {(labReport.overall_metrics.attack_success_rate_with_aegis * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-zinc-400 text-[11px]">Risk Reduction</div>
                <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                  {labReport.overall_metrics.risk_reduction_pct.toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-zinc-400 text-[11px]">Control FPR</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {(labReport.overall_metrics.false_positive_rate_on_controls * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Scenario Breakdown Table */}
            <div className="border border-white/[0.06] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-white/[0.04] text-[11px] font-mono text-zinc-400">
                  <tr>
                    <th className="p-3">Scenario</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Without AEGIS</th>
                    <th className="p-3 text-center">With AEGIS</th>
                    <th className="p-3">Oracle Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {labReport.scenario_results.map((sc, sIdx) => (
                    <tr key={sIdx} className="hover:bg-white/[0.01]">
                      <td className="p-3 font-semibold text-white">{sc.title}</td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px]">{sc.category}</td>
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
                      <td className="p-3 text-zinc-300 font-mono text-[11px]">{sc.oracle_summary_protected}</td>
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
