import React from "react";

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-500/50" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            AI Prompt-Injection and Data-Leak Firewall
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>SYSTEM READY</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">DOM Injection Scanner</h2>
            <p className="mt-2 text-2xl font-semibold text-white">0 Injections Detected</p>
            <p className="mt-1 text-xs text-slate-500">Monitoring hidden elements and Unicode tricks</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Data Redaction Guard</h2>
            <p className="mt-2 text-2xl font-semibold text-white">0 Secrets Masked</p>
            <p className="mt-1 text-xs text-slate-500">PII, API keys, credentials intercepted</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Action Policy Engine</h2>
            <p className="mt-2 text-2xl font-semibold text-white">0 Violations</p>
            <p className="mt-1 text-xs text-slate-500">Proposed agent actions aligned with intent</p>
          </div>
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold text-white mb-2">Live Security Audit Log</h3>
          <p className="text-sm text-slate-400">
            Audit events, risk scores, and explanation traces will appear here once the backend and extension are linked.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-600">
        B.Tech Final Year Project &bull; AI Prompt-Injection and Data-Leak Firewall
      </footer>
    </div>
  );
};

export default App;
