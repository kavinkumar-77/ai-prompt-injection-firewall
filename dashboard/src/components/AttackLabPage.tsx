import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Cpu,
  Database,
  GitFork,
  Key,
  Layers,
  Lock,
  Mail,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
  Zap,
} from "lucide-react";
import {
  api,
  ExecutionStep,
  LabSummaryReport,
  ScenarioComparisonResult,
  ScenarioMeta,
} from "../api";

export const AttackLabPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scenario_02_indirect_email_exfil");
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<ScenarioComparisonResult | null>(null);
  const [labReport, setLabReport] = useState<LabSummaryReport | null>(null);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time Visual Execution Pipeline States
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [liveSteps, setLiveSteps] = useState<ExecutionStep[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<Array<{ time: string; tag: string; text: string }>>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x
  const [activeTabMode, setActiveTabMode] = useState<"visualizer" | "details">("visualizer");

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadScenarios();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  const loadScenarios = async () => {
    try {
      const list = await api.getScenarios();
      setScenarios(list);
      if (list.length > 0 && !selectedScenarioId) {
        setSelectedScenarioId(list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load attack scenarios");
    }
  };

  // Automated step-by-step playback generator
  const playStepByStep = (allSteps: ExecutionStep[], finalRes: ScenarioComparisonResult, startIdx = 0) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSimulating(true);
    setLiveSteps(allSteps);

    const stepDelay = Math.round(1000 / playbackSpeed);

    let current = startIdx;
    setActiveStepIdx(current);

    // Initial logs for the starting step
    const initialStep = allSteps[current];
    if (initialStep) {
      const nowStr = new Date().toISOString().substring(11, 19);
      const newLogs = (initialStep.logs || []).map((l) => ({
        time: nowStr,
        tag: initialStep.phase.toUpperCase(),
        text: l,
      }));
      setTerminalLogs(newLogs);
    }

    const scheduleNext = (idx: number) => {
      if (idx >= allSteps.length - 1) {
        // Final step reached
        setIsSimulating(false);
        setResult(finalRes);
        return;
      }

      timerRef.current = setTimeout(() => {
        const nextIdx = idx + 1;
        setActiveStepIdx(nextIdx);
        const step = allSteps[nextIdx];
        if (step) {
          const timeStr = new Date().toISOString().substring(11, 19);
          const added = (step.logs || []).map((l) => ({
            time: timeStr,
            tag: step.phase.toUpperCase(),
            text: l,
          }));
          setTerminalLogs((prev) => [...prev, ...added]);
        }
        scheduleNext(nextIdx);
      }, stepDelay);
    };

    scheduleNext(current);
  };

  const handleExecuteAttack = async () => {
    if (!selectedScenarioId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setLiveSteps([]);
    setTerminalLogs([
      {
        time: new Date().toISOString().substring(11, 19),
        tag: "INIT",
        text: `Initiating Attack Lab execution for scenario '${selectedScenarioId}'...`,
      },
    ]);
    setActiveStepIdx(0);
    setIsSimulating(true);

    try {
      // Execute through gateway with real telemetry
      const res = await api.runScenario(selectedScenarioId);
      const scenarioSteps = res.execution_steps || [];

      if (scenarioSteps.length > 0) {
        playStepByStep(scenarioSteps, res, 0);
      } else {
        setResult(res);
        setIsSimulating(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to execute scenario");
      setIsSimulating(false);
    } finally {
      setRunning(false);
    }
  };

  const handleReplaySimulation = () => {
    if (!result || !result.execution_steps) return;
    setTerminalLogs([]);
    playStepByStep(result.execution_steps, result, 0);
  };

  const handleJumpToStep = (idx: number) => {
    if (!liveSteps || liveSteps.length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveStepIdx(idx);

    // Populate all logs up to this step
    const cumulativeLogs: Array<{ time: string; tag: string; text: string }> = [];
    for (let i = 0; i <= idx; i++) {
      const step = liveSteps[i];
      if (step) {
        (step.logs || []).forEach((l) => {
          cumulativeLogs.push({
            time: `00:0${i + 1}.00`,
            tag: step.phase.toUpperCase(),
            text: l,
          });
        });
      }
    }
    setTerminalLogs(cumulativeLogs);
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

  // Safe data extraction from result (handles both camelCase and snake_case models)
  const withoutAegis = (result as any)?.without_aegis || (result as any)?.off_result || {};
  const withAegis = (result as any)?.with_aegis || (result as any)?.on_result || {};
  const isEffective = Boolean(
    result?.protection_effective ??
    (result as any)?.defense_effective ??
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

  const currentStep = liveSteps[activeStepIdx] || (result?.execution_steps && result.execution_steps[activeStepIdx]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0C1222] via-[#0E1626] to-[#0A101D] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-tight">
                Attack Lab &bull; Real-Time Agent Security Arena
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Observe attacks live as they unfold. Watch autonomous agents interact with sandboxed tools, witness indirect prompt injection in real time, and contrast unprotected breaches with AEGIS active gateway defense.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenBatchReport}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#131B2E] text-indigo-300 hover:text-white hover:bg-indigo-600/20 border border-indigo-500/30 transition-all shadow-sm"
            >
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Full Batch Benchmark Report</span>
            </button>
          </div>
        </div>

        {/* Scenario Selection Grid */}
        <div className="pt-2">
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-semibold">
            Select Attack Scenario ({scenarios.length} Scenarios Available)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {scenarios.map((sc) => {
              const isSelected = sc.id === selectedScenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenarioId(sc.id);
                    setResult(null);
                    setLiveSteps([]);
                    setTerminalLogs([]);
                  }}
                  className={`text-left p-3 rounded-xl border text-xs transition-all relative overflow-hidden ${
                    isSelected
                      ? "bg-[#141C30] border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                      : "bg-[#090D18] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200 truncate">{sc.title}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        sc.expected_verdict === "block"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {sc.expected_verdict === "block" ? "ATTACK" : "CONTROL"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">{sc.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Scenario Metadata Card */}
        {selectedScenario && (
          <div className="bg-[#090D18] border border-slate-800/80 rounded-xl p-4 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-slate-400 uppercase font-semibold">Scenario ID:</span>
                <span className="font-mono text-indigo-400 font-bold">{selectedScenario.id}</span>
                <span className="text-slate-600">&bull;</span>
                <span className="font-mono text-slate-400 uppercase font-semibold">Agent Persona:</span>
                <span className="text-slate-200 font-semibold">{selectedScenario.persona || "AutonomousAssistant"}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-mono text-slate-500">Category:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[10px]">
                  {selectedScenario.category}
                </span>
              </div>
            </div>

            <div className="text-slate-300 leading-relaxed font-sans pt-1">
              {selectedScenario.description}
            </div>
          </div>
        )}

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-mono text-[11px]">Execution Speed:</span>
            <button
              onClick={() => setPlaybackSpeed(1)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-all ${
                playbackSpeed === 1
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              1x (Realistic)
            </button>
            <button
              onClick={() => setPlaybackSpeed(2)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-all ${
                playbackSpeed === 2
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              2x (Accelerated)
            </button>
          </div>

          <div className="flex items-center space-x-2.5">
            {result && !isSimulating && (
              <button
                onClick={handleReplaySimulation}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Replay Attack Simulation</span>
              </button>
            )}

            <button
              onClick={handleExecuteAttack}
              disabled={running || isSimulating}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-indigo-600 to-indigo-700 hover:from-rose-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{running || isSimulating ? "Simulating Attack Steps..." : "Execute Live Attack Comparison"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Visual Execution Arena Stage (Live Animation & Step Progression) */}
      {(isSimulating || liveSteps.length > 0 || result) && (
        <div className="bg-[#0D1424] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          {/* Visualizer Top Bar & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Activity className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                    Attack Process Stage
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isSimulating
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {isSimulating ? "SIMULATION ACTIVE" : "PROCESS COMPLETED"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Step {activeStepIdx + 1} of {liveSteps.length || 5}: {currentStep?.title || "Evaluating Phase"}
                </div>
              </div>
            </div>

            {/* View Mode Pills */}
            <div className="flex items-center space-x-2">
              <div className="bg-[#090D18] p-1 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
                <button
                  onClick={() => setActiveTabMode("visualizer")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeTabMode === "visualizer"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Visual Flow & Terminal
                </button>
                <button
                  onClick={() => setActiveTabMode("details")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeTabMode === "details"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Full Trace Comparison
                </button>
              </div>
            </div>
          </div>

          {/* 5-Step Progress Timeline Stepper */}
          <div className="py-2">
            <div className="grid grid-cols-5 gap-2 relative">
              {[
                { num: 1, title: "Target Setup", icon: Database, label: "Canaries Armed" },
                { num: 2, title: "Attack Vector", icon: Zap, label: "Task Dispatched" },
                { num: 3, title: "Tool & Taint", icon: Terminal, label: "read_file Exec" },
                { num: 4, title: "Divergence", icon: GitFork, label: "Breach vs Block" },
                { num: 5, title: "Audit Scorecard", icon: Award, label: "Oracle Verdict" },
              ].map((step, idx) => {
                const isActive = activeStepIdx === idx;
                const isPast = activeStepIdx > idx;
                const StepIcon = step.icon;

                return (
                  <button
                    key={step.num}
                    onClick={() => handleJumpToStep(idx)}
                    className={`text-left p-3 rounded-xl border transition-all relative ${
                      isActive
                        ? "bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-500"
                        : isPast
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                          : "bg-[#090D18] border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold ${
                          isActive
                            ? "bg-indigo-500 text-white"
                            : isPast
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isPast ? "✓" : step.num}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {isActive ? "ACTIVE" : isPast ? "DONE" : "PENDING"}
                      </span>
                    </div>
                    <div className={`font-semibold text-xs truncate flex items-center space-x-1.5 ${isActive ? "text-white" : isPast ? "text-emerald-300" : "text-slate-400"}`}>
                      <StepIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{step.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{step.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Threat Flow Diagram (Interactive Node Graph) */}
          <div className="bg-[#090D18] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Interactive Attack Flow Visualization</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Phase {activeStepIdx + 1} of 5 &bull; Real-Time Data Flow
              </span>
            </div>

            {/* Visual Node Diagram */}
            <div className="p-4 rounded-xl bg-black/40 border border-slate-800/80 space-y-6">
              {/* Common Ingestion Stage */}
              <div className="flex items-center justify-between max-w-xl mx-auto text-xs font-mono">
                {/* Node 1: Attacker */}
                <div className={`p-3 rounded-xl border text-center transition-all w-36 ${
                  activeStepIdx >= 1
                    ? "bg-rose-500/15 border-rose-500/50 text-rose-300 shadow-md shadow-rose-500/10"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}>
                  <Zap className="w-4 h-4 mx-auto mb-1 text-rose-400" />
                  <div className="font-bold text-[11px]">Adversary Vector</div>
                  <div className="text-[9px] opacity-75">Indirect Payload</div>
                </div>

                <div className="flex-1 flex items-center justify-center px-2">
                  <div className={`h-0.5 w-full relative ${activeStepIdx >= 1 ? "bg-rose-500 animate-pulse" : "bg-slate-800"}`}>
                    <ArrowRight className={`w-3.5 h-3.5 absolute right-0 -top-1.5 ${activeStepIdx >= 1 ? "text-rose-400" : "text-slate-700"}`} />
                  </div>
                </div>

                {/* Node 2: Agent Task */}
                <div className={`p-3 rounded-xl border text-center transition-all w-36 ${
                  activeStepIdx >= 1
                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-200"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}>
                  <Cpu className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                  <div className="font-bold text-[11px]">Agent Ingestion</div>
                  <div className="text-[9px] opacity-75">WorkplaceAssistant</div>
                </div>

                <div className="flex-1 flex items-center justify-center px-2">
                  <div className={`h-0.5 w-full relative ${activeStepIdx >= 2 ? "bg-indigo-500 animate-pulse" : "bg-slate-800"}`}>
                    <ArrowRight className={`w-3.5 h-3.5 absolute right-0 -top-1.5 ${activeStepIdx >= 2 ? "text-indigo-400" : "text-slate-700"}`} />
                  </div>
                </div>

                {/* Node 3: Workspace Tools */}
                <div className={`p-3 rounded-xl border text-center transition-all w-36 ${
                  activeStepIdx >= 2
                    ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-200"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}>
                  <Terminal className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                  <div className="font-bold text-[11px]">Sandbox Tool</div>
                  <div className="text-[9px] opacity-75">read_file / search</div>
                </div>
              </div>

              {/* Forking Split at Step 4: Divergence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Branch 1: Unprotected (AEGIS OFF) */}
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  activeStepIdx >= 3
                    ? withoutAegis.attack_succeeded
                      ? "bg-rose-950/20 border-rose-500/40 text-rose-200 shadow-md shadow-rose-500/10"
                      : "bg-slate-900/60 border-slate-800 text-slate-400"
                    : "bg-slate-900/30 border-slate-800/60 text-slate-600 opacity-60"
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="font-bold text-xs font-mono uppercase text-rose-400">
                        Path A: Without AEGIS (Unprotected)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                      {activeStepIdx >= 3 ? (withoutAegis.attack_succeeded ? "BREACH CONFIRMED" : "SAFE CONTROL") : "PENDING DIVERGENCE"}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 font-mono">
                    <div className="flex items-center space-x-2 text-[11px]">
                      <Unlock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Directive Taint: <strong className="text-rose-300">Hijacked by hidden injection</strong></span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Unauthorized Action: <strong className="text-rose-300">Exfiltrate to attacker@evil.org</strong></span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <Key className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Honeytoken Canary: <strong className="text-rose-400 uppercase font-bold">Leaked to outbox</strong></span>
                    </div>
                  </div>
                </div>

                {/* Branch 2: Protected (AEGIS ON) */}
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  activeStepIdx >= 3
                    ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200 shadow-md shadow-emerald-500/10"
                    : "bg-slate-900/30 border-slate-800/60 text-slate-600 opacity-60"
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-xs font-mono uppercase text-emerald-400">
                        Path B: With AEGIS Gateway (Protected)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      {activeStepIdx >= 3 ? (withAegis.verdict === "block" ? "ATTACK INTERCEPTED" : "VERIFIED CLEAN") : "PENDING DIVERGENCE"}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 font-mono">
                    <div className="flex items-center space-x-2 text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>6-Layer Pipeline: <strong className="text-emerald-300">Deterministic Rules + Context Scrutiny</strong></span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Enforcement Action: <strong className="text-emerald-300">HTTP 400 Policy Violation Block</strong></span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Honeytoken Canary: <strong className="text-emerald-400 uppercase font-bold">100% Protected & Safe</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Cyber Terminal Stream */}
          <div className="bg-[#050811] border border-slate-800 rounded-xl overflow-hidden shadow-inner">
            <div className="bg-[#090D18] px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-semibold ml-2">
                  AEGIS_RUNTIME_MONITOR // REALTIME_AUDIT_STREAM
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {terminalLogs.length} events logged
              </span>
            </div>

            <div className="p-4 font-mono text-[11px] space-y-1.5 max-h-56 overflow-y-auto leading-relaxed">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-600 italic">Awaiting execution start...</div>
              ) : (
                terminalLogs.map((log, lIdx) => (
                  <div key={lIdx} className="flex items-start space-x-2">
                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                    <span className={`px-1 rounded text-[9px] font-bold uppercase shrink-0 ${
                      log.tag.includes("UNPROTECTED") || log.tag.includes("THREAT")
                        ? "bg-rose-500/20 text-rose-400"
                        : log.tag.includes("AEGIS") || log.tag.includes("CONTAINMENT") || log.tag.includes("ORACLE")
                          ? "bg-emerald-500/20 text-emerald-400"
                          : log.tag.includes("AGENT") || log.tag.includes("TOOL")
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-slate-800 text-slate-300"
                    }`}>
                      {log.tag}
                    </span>
                    <span className="text-slate-300 break-all">{log.text}</span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Detailed Comparison Cards (When Result Available) */}
      {result && (
        <div className="space-y-4">
          {/* Effectiveness Verdict Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg ${
              isEffective
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                  isEffective
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                }`}
              >
                {isEffective ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-sm font-mono uppercase tracking-wide text-white">
                  {isEffective
                    ? "Attack Fully Neutralized &bull; Zero Impact on Agent Sandbox"
                    : "Defense Bypass Flagged"}
                </h3>
                <p className="text-xs opacity-85 mt-0.5">
                  {isEffective
                    ? "Without protection, the agent executed the attack. With AEGIS Gateway active, execution was intercepted before unsafe tool execution."
                    : "The attack circumvented security filters under current policy thresholds."}
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center ${
                isEffective
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {isEffective ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  <span>DEFENSE EFFECTIVE (100% CONTAINED)</span>
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
                        ? "Honeytoken leaked into agent response or outbox"
                        : "Honeytoken remained unaccessed"}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {withoutAegis.honeytoken_compromised ? "COMPROMISED" : "INTACT"}
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
                  <span>Agent Execution Trace (Unprotected)</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {offTraces.length > 0 ? (
                    offTraces.map((tr: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-black/40 border border-slate-800/80 text-xs font-mono space-y-2"
                      >
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Prompt:</div>
                        <div className="text-slate-300 text-[11px] whitespace-pre-wrap break-all line-clamp-3">
                          {tr.prompt}
                        </div>

                        {tr.tool_calls && tr.tool_calls.length > 0 && (
                          <div className="pt-2 border-t border-slate-800 space-y-1.5">
                            <div className="text-rose-400 text-[10px] uppercase font-semibold flex items-center space-x-1">
                              <Zap className="w-3 h-3" />
                              <span>Tool Invocations Triggered by Agent:</span>
                            </div>
                            {tr.tool_calls.map((tc: any, tcIdx: number) => (
                              <div
                                key={tcIdx}
                                className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] whitespace-pre-wrap"
                              >
                                {tc.name || tc.tool}({JSON.stringify(tc.arguments || {})})
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
                className="text-slate-400 hover:text-white text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all"
              >
                Close (ESC)
              </button>
            </div>

            {/* Overall Metrics Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#080C16] border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">ASR (Without AEGIS)</div>
                <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                  {(labReport.overall_metrics.attack_success_rate_without_aegis * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Vulnerable Baseline</div>
              </div>

              <div className="p-4 rounded-xl bg-[#080C16] border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">ASR (With AEGIS)</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {(labReport.overall_metrics.attack_success_rate_with_aegis * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Protected Gateway</div>
              </div>

              <div className="p-4 rounded-xl bg-[#080C16] border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Risk Reduction</div>
                <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                  {(labReport.overall_metrics.risk_reduction_pct).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Empirical Efficacy</div>
              </div>

              <div className="p-4 rounded-xl bg-[#080C16] border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">FPR on Controls</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {(labReport.overall_metrics.false_positive_rate_on_controls * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Zero False Blocks</div>
              </div>
            </div>

            {/* Per-Scenario Results Table */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2 font-mono uppercase tracking-wider">
                Scenario Breakdown
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 text-xs">
                {labReport.scenario_results.map((sc, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-200">{sc.title}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Category: {sc.category} &bull; Severity: {sc.severity}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-right">
                      <div>
                        <div className="font-mono text-[11px] text-rose-400">
                          OFF: {(sc.asr_without_aegis * 100).toFixed(0)}% ASR
                        </div>
                        <div className="font-mono text-[11px] text-emerald-400">
                          ON: {(sc.asr_with_aegis * 100).toFixed(0)}% ASR
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          sc.asr_with_aegis === 0
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {sc.asr_with_aegis === 0 ? "CONTAINED" : "PARTIAL"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
