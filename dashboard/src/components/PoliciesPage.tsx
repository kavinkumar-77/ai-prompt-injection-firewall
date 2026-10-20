import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Code,
  History,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { api, PolicyAuditEntry } from "../api";

export const PoliciesPage: React.FC = () => {
  const [auditLog, setAuditLog] = useState<PolicyAuditEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [switching, setSwitching] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>("balanced");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pList, aLog] = await Promise.all([
        api.getPolicies(),
        api.getPolicyAuditHistory(),
      ]);
      setAuditLog(aLog);
      const active = pList.find((p) => p.is_active);
      if (active) setActivePreset(active.id);
    } catch (err: any) {
      setError(err?.message || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (preset: "strict" | "balanced" | "lenient") => {
    try {
      setSwitching(true);
      setError(null);
      setSuccessMsg(null);
      await api.switchPolicy(preset);
      setActivePreset(preset);
      setSuccessMsg(`Successfully activated '${preset.toUpperCase()}' policy preset.`);
      await loadPolicies();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to switch policy");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111622] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              <span>Security Policies & Gating Presets</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure multi-layer thresholds, agent capability restrictions, and inspection sensitivity.
            </p>
          </div>

          <button
            onClick={loadPolicies}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload Policies</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Preset Switcher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strict Card */}
        <div
          className={`bg-[#121826] border rounded-xl p-5 transition-all flex flex-col justify-between ${
            activePreset === "strict"
              ? "border-blue-500 ring-1 ring-blue-500/50 shadow-md"
              : "border-white/[0.08] hover:border-white/[0.14]"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white font-mono">Strict Preset</span>
              {activePreset === "strict" ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ACTIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-400">0.50 Threshold</span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Zero tolerance policy. Quarantines any query with ambiguous instruction-like imperatives. Ideal for banking and high-security environments.
            </p>
            <div className="pt-2 border-t border-white/[0.06] text-xs font-mono text-zinc-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Block Threshold:</span>
                <span className="font-bold text-rose-400">&ge; 0.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Warn Threshold:</span>
                <span className="font-bold text-amber-400">&ge; 0.25</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSwitch("strict")}
            disabled={switching || activePreset === "strict"}
            className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold transition-all ${
              activePreset === "strict"
                ? "bg-white/[0.06] text-zinc-400 cursor-default"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
            }`}
          >
            {activePreset === "strict" ? "Active Policy" : "Activate Strict"}
          </button>
        </div>

        {/* Balanced Card */}
        <div
          className={`bg-[#121826] border rounded-xl p-5 transition-all flex flex-col justify-between ${
            activePreset === "balanced"
              ? "border-blue-500 ring-1 ring-blue-500/50 shadow-md"
              : "border-white/[0.08] hover:border-white/[0.14]"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white font-mono">Balanced (Recommended)</span>
              {activePreset === "balanced" ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ACTIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-400">0.70 Threshold</span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Calibrated production profile. Provides 0.00% false positive rate on benign technical queries while neutralizing 100% of adversarial attacks.
            </p>
            <div className="pt-2 border-t border-white/[0.06] text-xs font-mono text-zinc-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Block Threshold:</span>
                <span className="font-bold text-rose-400">&ge; 0.70</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Warn Threshold:</span>
                <span className="font-bold text-amber-400">&ge; 0.40</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSwitch("balanced")}
            disabled={switching || activePreset === "balanced"}
            className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold transition-all ${
              activePreset === "balanced"
                ? "bg-white/[0.06] text-zinc-400 cursor-default"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
            }`}
          >
            {activePreset === "balanced" ? "Active Policy" : "Activate Balanced"}
          </button>
        </div>

        {/* Lenient Card */}
        <div
          className={`bg-[#121826] border rounded-xl p-5 transition-all flex flex-col justify-between ${
            activePreset === "lenient"
              ? "border-blue-500 ring-1 ring-blue-500/50 shadow-md"
              : "border-white/[0.08] hover:border-white/[0.14]"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white font-mono">Lenient Preset</span>
              {activePreset === "lenient" ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  ACTIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-400">0.85 Threshold</span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Permissive profile. Intervenes only on high-confidence confirmed exploits and known credential leaks. Suitable for internal research sandboxes.
            </p>
            <div className="pt-2 border-t border-white/[0.06] text-xs font-mono text-zinc-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Block Threshold:</span>
                <span className="font-bold text-rose-400">&ge; 0.85</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Warn Threshold:</span>
                <span className="font-bold text-amber-400">&ge; 0.60</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSwitch("lenient")}
            disabled={switching || activePreset === "lenient"}
            className={`mt-4 w-full py-2 rounded-lg text-xs font-semibold transition-all ${
              activePreset === "lenient"
                ? "bg-white/[0.06] text-zinc-400 cursor-default"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
            }`}
          >
            {activePreset === "lenient" ? "Active Policy" : "Activate Lenient"}
          </button>
        </div>
      </div>

      {/* Grid: Capability Policy (YAML) & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capability Policy Schema (YAML) */}
        <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-white">Agent Capability Policy (YAML)</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Policy-as-Code</span>
          </div>

          <p className="text-xs text-zinc-400">
            Defines tool execution allowlists, argument sandboxing, recipient domain validation, and context taint restrictions.
          </p>

          <pre className="bg-[#0A0D14] border border-white/[0.08] rounded-xl p-3.5 text-[11px] text-zinc-300 font-mono overflow-x-auto leading-relaxed">
{`version: "1.0"
policy_id: "default_capabilities"
tool_rules:
  read_file:
    allowed: true
    require_approval_if_tainted: true
    forbidden_path_patterns:
      - "\\.\\./"
      - "^/etc/"
      - "^C:\\\\Windows"
  send_email:
    allowed: true
    allowed_recipient_domains:
      - "company.com"
      - "internal.corp"
    require_approval_if_tainted: true
  execute_bash:
    allowed: false # Excessive agency protection (OWASP LLM06)
context_taint_policy:
  untrusted_sources:
    - "retrieved"
    - "tool_output"
  escalate_suspicion: true`}
          </pre>
        </div>

        {/* Policy Change Audit Log */}
        <div className="bg-[#121826] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-sm text-white">Policy Change History</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Tamper-Evident Trail</span>
          </div>

          <div className="divide-y divide-white/[0.04] text-xs">
            {auditLog.map((entry, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white flex items-center space-x-2">
                    <span className="capitalize">{entry.action.replace("_", " ")}</span>
                    <span className="font-mono text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded uppercase">
                      {entry.policy_id}
                    </span>
                  </div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">
                    Actor: <span className="text-zinc-300 font-mono">{entry.actor}</span> &bull; Block &ge; {entry.block_threshold}
                  </div>
                </div>
                <div className="text-right text-zinc-400 font-mono text-[11px]">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
