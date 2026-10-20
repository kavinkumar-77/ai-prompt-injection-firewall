/**
 * Typed API Client for Project AEGIS Gateway.
 * Interacts with /v1/ endpoints to power the Operator Dashboard with real telemetry.
 */

export interface SystemHealth {
  status: string;
  version: string;
  uptime_seconds: number;
  classifier_status: string;
  memory_usage_mb: number;
  upstream_status: string;
}

export interface MetricsSummary {
  total_requests: number;
  active_policy_id: string;
  verdicts: {
    allow: number;
    warn: number;
    block: number;
    redact: number;
  };
  block_rate_pct: number;
  latency_percentiles_ms: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  cache_hits: number;
  cache_misses: number;
  layer_triggers: Record<string, number>;
}

export interface ThreatStats {
  total_threats: number;
  injections_blocked: number;
  exfiltrations_blocked: number;
  phishing_blocked: number;
  avg_risk_score: number;
  system_status: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  attack_type: string;
  source_url: string;
  risk_score: number;
  details: {
    verdict?: string;
    policy_id?: string;
    source?: string;
    reasoning?: string;
    payload_hash?: string;
    is_demo_seed?: boolean;
    triggered_layers?: Array<{
      layer: string;
      score: number;
      label: string;
    }>;
    [key: string]: any;
  };
}

export interface EvidenceSpan {
  start: number;
  end: number;
  snippet: string;
  rule_id?: string;
}

export interface LayerResult {
  layer: string;
  score: number;
  label: string;
  evidence: EvidenceSpan[];
  metadata: Record<string, any>;
}

export interface ScanResponse {
  request_id: string;
  verdict: "allow" | "warn" | "block" | "redact";
  risk_score: number;
  policy_id: string;
  latency_ms: number;
  explanation: string;
  layers: LayerResult[];
  transformed_text?: string | null;
}

export interface PolicyPreset {
  id: string;
  name: string;
  block_threshold: number;
  warn_threshold: number;
  is_active: boolean;
  active_layers: string[];
  description: string;
}

export interface PolicyAuditEntry {
  timestamp: string;
  action: string;
  policy_id: string;
  block_threshold: number;
  warn_threshold: number;
  actor: string;
}

export interface ScenarioMeta {
  id: string;
  title: string;
  category: string;
  owasp_mapping: string;
  severity: string;
  target_tool: string;
  description: string;
}

export interface ScenarioTurnTrace {
  prompt: string;
  assistant_reply: string | null;
  tool_calls: Array<{ id: string; name: string; arguments: Record<string, any> }>;
  tool_results: Array<{ tool: string; output: string }>;
  blocked_by_gateway: boolean;
  gateway_reason: string | null;
  error: string | null;
}

export interface ScenarioExecutionSide {
  scenario_id: string;
  mode: "unprotected" | "protected";
  verdict: "allow" | "block";
  attack_succeeded: boolean;
  oracle_reason: string;
  traces: ScenarioTurnTrace[];
  honeytoken_compromised: boolean;
  honeytoken_value: string | null;
  outbox_entries: string[];
  gateway_explanation?: string | null;
  triggered_layers?: Array<{ layer: string; score: number; label: string }>;
}

export interface ScenarioComparisonResult {
  scenario_id: string;
  without_aegis: ScenarioExecutionSide;
  with_aegis: ScenarioExecutionSide;
  protection_effective: boolean;
  timestamp: string;
}

export interface EvaluationMetrics {
  evaluation_timestamp: string;
  dataset_test_samples: number;
  test_positives: number;
  test_negatives: number;
  overall_performance: {
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    pr_auc: number;
    confusion_matrix: {
      tn: number;
      fp: number;
      fn: number;
      tp: number;
    };
  };
  hard_negatives_performance: {
    total_hard_negatives: number;
    false_positives: number;
    false_positive_rate: number;
    accuracy_on_hard_negatives: number;
  };
  operating_points: Record<
    string,
    {
      threshold: number;
      precision: number;
      recall: number;
      f1: number;
      fpr_overall: number;
      fpr_hard_negatives: number;
    }
  >;
  latency_benchmarks?: Record<string, any>;
  ablation_study?: Record<string, any>;
}

export interface LabSummaryReport {
  generated_at: string;
  trials_per_scenario: number;
  total_scenarios_evaluated: number;
  overall_metrics: {
    attack_success_rate_without_aegis: number;
    attack_success_rate_with_aegis: number;
    risk_reduction_pct: number;
    false_positive_rate_on_controls: number;
    total_attacks_tested: number;
    total_controls_tested: number;
  };
  scenario_results: Array<{
    scenario_id: string;
    title: string;
    category: string;
    severity: string;
    asr_without_aegis: number;
    asr_with_aegis: number;
    honeytoken_leaked_unprotected: boolean;
    honeytoken_leaked_protected: boolean;
    oracle_summary_unprotected: string;
    oracle_summary_protected: string;
  }>;
}

const BASE_URL = "http://localhost:8000";

export const api = {
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getMetrics(): Promise<MetricsSummary> {
    const res = await fetch(`${BASE_URL}/v1/metrics`);
    if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
    return res.json();
  },

  async getEvents(limit: number = 50): Promise<SecurityEvent[]> {
    const res = await fetch(`${BASE_URL}/v1/events?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
    return res.json();
  },

  async getEventStats(): Promise<ThreatStats> {
    const res = await fetch(`${BASE_URL}/v1/events/stats`);
    if (!res.ok) throw new Error(`Failed to fetch event stats: ${res.statusText}`);
    return res.json();
  },

  async clearEvents(): Promise<void> {
    const res = await fetch(`${BASE_URL}/v1/events/clear`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to clear events: ${res.statusText}`);
  },

  async seedDemoEvents(): Promise<{ count: number; message: string }> {
    const res = await fetch(`${BASE_URL}/v1/events/seed`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to seed demo events: ${res.statusText}`);
    return res.json();
  },

  async scanText(
    text: string,
    source: "system" | "user" | "retrieved" | "tool_output" = "user",
    policyPreset?: string,
    metadata?: Record<string, any>
  ): Promise<ScanResponse> {
    const res = await fetch(`${BASE_URL}/v1/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        source,
        policy_preset: policyPreset,
        metadata: metadata || {},
      }),
    });
    if (!res.ok) throw new Error(`Scan request failed: ${res.statusText}`);
    return res.json();
  },

  async getPolicies(): Promise<PolicyPreset[]> {
    const res = await fetch(`${BASE_URL}/v1/policies`);
    if (!res.ok) throw new Error(`Failed to fetch policies: ${res.statusText}`);
    return res.json();
  },

  async switchPolicy(preset: "strict" | "balanced" | "lenient"): Promise<any> {
    const res = await fetch(`${BASE_URL}/v1/policies/active`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset }),
    });
    if (!res.ok) throw new Error(`Failed to switch policy: ${res.statusText}`);
    return res.json();
  },

  async getPolicyAuditHistory(): Promise<PolicyAuditEntry[]> {
    const res = await fetch(`${BASE_URL}/v1/policies/audit/history`);
    if (!res.ok) throw new Error(`Failed to fetch policy audit history: ${res.statusText}`);
    return res.json();
  },

  async getScenarios(): Promise<ScenarioMeta[]> {
    const res = await fetch(`${BASE_URL}/v1/lab/scenarios`);
    if (!res.ok) throw new Error(`Failed to fetch lab scenarios: ${res.statusText}`);
    return res.json();
  },

  async runScenario(scenarioId: string): Promise<ScenarioComparisonResult> {
    const res = await fetch(`${BASE_URL}/v1/lab/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario_id: scenarioId }),
    });
    if (!res.ok) throw new Error(`Failed to run scenario: ${res.statusText}`);
    return res.json();
  },

  async getLabReport(): Promise<LabSummaryReport> {
    const res = await fetch(`${BASE_URL}/v1/lab/report`);
    if (!res.ok) throw new Error(`Failed to fetch lab report: ${res.statusText}`);
    return res.json();
  },

  async getEvalMetrics(): Promise<EvaluationMetrics> {
    const res = await fetch(`${BASE_URL}/v1/eval/metrics`);
    if (!res.ok) throw new Error(`Failed to fetch eval metrics: ${res.statusText}`);
    return res.json();
  },
};
