/**
 * Security Guardrails, Policies, and Hardware Budget for Project AEGIS.
 * Overhauled with the minimalist dark enterprise theme.
 */

import React from "react";
import { Check, Cpu, Shield } from "lucide-react";

export const GuardrailsMatrix: React.FC = () => {
  const policies = [
    {
      name: "Outbound Credential Exfiltration Interceptor",
      desc: "Intercepts form submissions and fetch() calls containing sensitive tokens directed to untrusted domains.",
      active: true,
      level: "CRITICAL",
    },
    {
      name: "DOM Taint Tracking Engine",
      desc: "Automatically labels password, token, and secret fields with data-taint-level='HIGH' to monitor data flow.",
      active: true,
      level: "HIGH",
    },
    {
      name: "Chat Template Delimiter Filter",
      desc: "Blocks adversarial control tokens (<|im_start|>, [INST], <<SYS>>) that hijack LLM chat templates.",
      active: true,
      level: "CRITICAL",
    },
    {
      name: "Markdown Image Exfiltration Blocker",
      desc: "Detects hidden markdown images attempting to ping external URLs with session cookies as query parameters.",
      active: true,
      level: "HIGH",
    },
    {
      name: "Visual Phishing Perceptual Hasher",
      desc: "Computes Hamming distance over structural layout hashes to detect unauthorized Google/Microsoft clones.",
      active: true,
      level: "MEDIUM",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hardware Profile Card */}
      <div className="bg-[#13151B] border border-white/[0.08] rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-2.5 mb-4">
          <Cpu className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
            Hardware VRAM Budget Allocation
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-black/30 p-3.5 rounded-lg border border-white/[0.06]">
            <span className="text-zinc-500 block text-[11px]">Classifier (Layer 1)</span>
            <span className="text-blue-400 font-bold text-sm">~300 MB</span>
            <span className="text-zinc-500 block text-[10px] mt-0.5">TF-IDF / Fast-Path</span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-lg border border-white/[0.06]">
            <span className="text-zinc-500 block text-[11px]">Probing Model (Layer 2)</span>
            <span className="text-emerald-400 font-bold text-sm">~3.5 GB</span>
            <span className="text-zinc-500 block text-[10px] mt-0.5">Qwen2.5-1.5B (FP16)</span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-lg border border-white/[0.06]">
            <span className="text-zinc-500 block text-[11px]">Offline Attacker (Layer 5)</span>
            <span className="text-indigo-400 font-bold text-sm">~1.5 GB</span>
            <span className="text-zinc-500 block text-[10px] mt-0.5">INT4 Quantized (Offline)</span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-lg border border-white/[0.06]">
            <span className="text-zinc-500 block text-[11px]">Physical GPU Envelope</span>
            <span className="text-white font-bold text-sm">6.0 GB VRAM</span>
            <span className="text-zinc-500 block text-[10px] mt-0.5">NVIDIA RTX 4050</span>
          </div>
        </div>
      </div>

      {/* Active Capability Policies */}
      <div className="bg-[#13151B] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Active Defense Capabilities
            </h3>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono font-semibold">
            5 / 5 ENFORCED
          </span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {policies.map((p, idx) => (
            <div key={idx} className="p-4 px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="space-y-0.5 max-w-2xl">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-white">{p.name}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      p.level === "CRITICAL"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : p.level === "HIGH"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {p.level}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{p.desc}</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                  <Check className="w-3.5 h-3.5" />
                  <span>Enforcing</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
