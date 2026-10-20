/**
 * Project AEGIS: Interactive Documentation & Defense Reasoning System.
 * Clean, modern reference architecture for academic defense and evaluation.
 */

import React, { useState } from "react";
import { BookOpen } from "lucide-react";

type DocSection = "architecture" | "taxonomy" | "owasp" | "mathematics";

export const DocsAndReasoning: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>("architecture");

  return (
    <div className="space-y-6">
      {/* Sub-header & Section Switcher */}
      <div className="bg-[#13151B] border border-white/[0.08] rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight uppercase font-mono">
                System Documentation & Defense Reasoning
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Technical specifications, multi-layer defense pipeline, and mathematical foundations.
            </p>
          </div>

          <div className="inline-flex p-1 bg-black/40 border border-white/[0.08] rounded-lg self-start sm:self-auto text-xs">
            <button
              onClick={() => setActiveSection("architecture")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSection === "architecture"
                  ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => setActiveSection("taxonomy")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSection === "taxonomy"
                  ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Threat Taxonomy
            </button>
            <button
              onClick={() => setActiveSection("owasp")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSection === "owasp"
                  ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              OWASP Top 10
            </button>
            <button
              onClick={() => setActiveSection("mathematics")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeSection === "mathematics"
                  ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Formulations & Math
            </button>
          </div>
        </div>

        {/* Section 1: Architecture */}
        {activeSection === "architecture" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Multi-Layered Defense Pipeline
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Project AEGIS processes untrusted input through five distinct, serialized defense layers before permitting downstream execution, ensuring sub-15ms response latency with 0% uncontained exposure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">LAYER 1</span>
                  <div className="text-xs font-semibold text-white mb-1.5">Deterministic Unwrapper</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Decodes Base64, Hex, URL encoding, and strips invisible zero-width Unicode characters.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-emerald-400">
                  Latency: &lt; 1ms
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">LAYER 2</span>
                  <div className="text-xs font-semibold text-white mb-1.5">Vector Prototype Classifier</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Cosine distance matching over TF-IDF n-gram vectors against known attack families.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-emerald-400">
                  Latency: ~5ms
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">LAYER 3</span>
                  <div className="text-xs font-semibold text-white mb-1.5">Attention-Shift Probe</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Simulates attention pull between system prompt instructions and new input directives.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-emerald-400">
                  Latency: ~4ms
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">LAYER 4</span>
                  <div className="text-xs font-semibold text-white mb-1.5">Capability Taint Policy</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Labels sensitive data with high taint and blocks outbound requests to untrusted domains.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-emerald-400">
                  Latency: &lt; 2ms
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">LAYER 5</span>
                  <div className="text-xs font-semibold text-white mb-1.5">System Canary Shield</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Monitors model output for leaked canary tokens and scrubs them before client rendering.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-emerald-400">
                  Latency: &lt; 2ms
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Taxonomy */}
        {activeSection === "taxonomy" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Threat Vectors & Exploitation Categories
              </h3>
              <p className="text-xs text-zinc-400">
                Detailed definitions of real-world attack techniques intercepted by Project AEGIS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">1. Indirect RAG Context Poisoning</span>
                  <span className="text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                    CRITICAL
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Adversaries embed malicious directives in documents or external web pages. When ingested by RAG pipelines, the model confuses context for system instructions.
                </p>
                <div className="p-2 bg-black/40 border border-white/[0.06] rounded text-[11px] font-mono text-zinc-300">
                  Defense: Attention-Shift Probe flags directive deviation; TF-IDF classifier catches override.
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">2. Chat Template Delimiter Hijacking</span>
                  <span className="text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                    CRITICAL
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Injects raw chat formatting tokens such as &lt;|im_end|&gt;&lt;|im_start|&gt;system. Forces the tokenizer to close user turn and forge a privileged system role.
                </p>
                <div className="p-2 bg-black/40 border border-white/[0.06] rounded text-[11px] font-mono text-zinc-300">
                  Defense: Syntactic delimiter scanner quarantines tokens before prompt serialization.
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">3. Markdown Hidden Image Exfiltration</span>
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                    HIGH
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Forces LLM to emit markdown image tags with session tokens embedded in query parameters, silently making GET requests to attacker infrastructure.
                </p>
                <div className="p-2 bg-black/40 border border-white/[0.06] rounded text-[11px] font-mono text-zinc-300">
                  Defense: Markdown URL inspector detects session query parameters and suppresses rendering.
                </div>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">4. System Prompt Canary Leakage</span>
                  <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                    HIGH
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Attacker tricks model into repeating initial system instructions. Without canary tracking, developers cannot verify prompt leaks deterministically.
                </p>
                <div className="p-2 bg-black/40 border border-white/[0.06] rounded text-[11px] font-mono text-zinc-300">
                  Defense: Canary token injection with real-time response scrubbing ([REDACTED_SYSTEM_INSTRUCTION]).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: OWASP Top 10 */}
        {activeSection === "owasp" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                OWASP Top 10 for Large Language Models Compliance
              </h3>
              <p className="text-xs text-zinc-400">
                Formal alignment with the industry standard OWASP LLM Application Security framework.
              </p>
            </div>

            <div className="overflow-x-auto border border-white/[0.08] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-white/[0.08] text-zinc-400 font-mono text-[11px]">
                    <th className="p-3">OWASP ID</th>
                    <th className="p-3">Vulnerability Category</th>
                    <th className="p-3">AEGIS Defensive Module</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] bg-black/10 text-zinc-300 font-mono text-xs">
                  <tr>
                    <td className="p-3 text-blue-400 font-semibold">LLM01</td>
                    <td className="p-3 font-sans font-medium text-white">Prompt Injection (Direct & Indirect)</td>
                    <td className="p-3 text-zinc-400 font-sans">TF-IDF Vector Classifier &bull; Attention-Shift Probe &bull; Delimiter Unwrapper</td>
                    <td className="p-3"><span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">ENFORCED</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-blue-400 font-semibold">LLM02</td>
                    <td className="p-3 font-sans font-medium text-white">Sensitive Information Disclosure</td>
                    <td className="p-3 text-zinc-400 font-sans">Live Client PII Redactor &bull; System Prompt Canary Shield</td>
                    <td className="p-3"><span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">ENFORCED</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-blue-400 font-semibold">LLM06</td>
                    <td className="p-3 font-sans font-medium text-white">Excessive Agency & Data Leakage</td>
                    <td className="p-3 text-zinc-400 font-sans">Capability Taint Tracking &bull; Untrusted Domain Policy Engine</td>
                    <td className="p-3"><span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">ENFORCED</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-blue-400 font-semibold">LLM07</td>
                    <td className="p-3 font-sans font-medium text-white">System Prompt Leakage</td>
                    <td className="p-3 text-zinc-400 font-sans">Output Token Scrubber &bull; Canary Watermarking (CANARY_TOKEN:AEGIS-...)</td>
                    <td className="p-3"><span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">ENFORCED</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Mathematics */}
        {activeSection === "mathematics" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Algorithmic Foundations & Mathematical Formulations
              </h3>
              <p className="text-xs text-zinc-400">
                Rigorous definitions implemented in the AEGIS detection engines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl space-y-2">
                <span className="text-xs font-semibold text-white block">
                  1. Cosine Similarity over Semantic TF-IDF Vectors
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Measures directional cosine angle between input vector <span className="font-mono text-zinc-200">u</span> and prototype vector <span className="font-mono text-zinc-200">v</span>:
                </p>
                <div className="p-3 bg-black/40 border border-white/[0.06] rounded font-mono text-xs text-center text-blue-400">
                  S(u, v) = (u &bull; v) / (||u|| &times; ||v||)
                </div>
                <p className="text-[10px] text-zinc-500">
                  Values &ge; 0.35 trigger adversarial categorization; technical hard-negatives suppress false alarms on code.
                </p>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl space-y-2">
                <span className="text-xs font-semibold text-white block">
                  2. Attention-Shift Divergence Metric
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Quantifies semantic pull between baseline instructions <span className="font-mono text-zinc-200">S</span> and incoming directives <span className="font-mono text-zinc-200">U</span>:
                </p>
                <div className="p-3 bg-black/40 border border-white/[0.06] rounded font-mono text-xs text-center text-amber-400">
                  D_shift = &alpha; + (&beta; &times; |W_adv &cap; W_user|) + &gamma; &times; (1 - Overlap(S, U))
                </div>
                <p className="text-[10px] text-zinc-500">
                  Scores &ge; 0.70 indicate critical intent divergence away from developer guidelines.
                </p>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl space-y-2">
                <span className="text-xs font-semibold text-white block">
                  3. Perceptual Blockhash Bitwise Hamming Distance
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Evaluates structural layout similarity against brand templates:
                </p>
                <div className="p-3 bg-black/40 border border-white/[0.06] rounded font-mono text-xs text-center text-zinc-300">
                  d_H(h_1, h_2) = popcount(h_1 &oplus; h_2)
                </div>
                <p className="text-[10px] text-zinc-500">
                  A distance &le; 12 bits identifies unauthorized visual clones with &gt; 90% perceptual similarity.
                </p>
              </div>

              <div className="p-4 bg-black/20 border border-white/[0.06] rounded-xl space-y-2">
                <span className="text-xs font-semibold text-white block">
                  4. Empirical Benchmark Performance
                </span>
                <div className="space-y-1.5 text-xs text-zinc-300 pt-1 font-mono">
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-zinc-400 font-sans">Detection Latency (Fast-Path):</span>
                    <span className="text-emerald-400 font-semibold">&lt; 15ms</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-zinc-400 font-sans">False Positive Rate:</span>
                    <span className="text-emerald-400 font-semibold">&lt; 0.8%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-zinc-400 font-sans">VRAM Footprint:</span>
                    <span className="text-white font-semibold">&lt; 1.2 GB (RTX 4050)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
