/**
 * Full-screen Phishing Interstitial for Project AEGIS.
 * Replaces the active page viewport with a high-impact security warning overlay
 * when a visual phishing clone is detected.
 */

export interface PhishingDetails {
  clonedBrand: string;
  similarityScore: number;
  pageUrl: string;
}

export function showPhishingInterstitial(details: PhishingDetails, doc: Document = document): void {
  if (!doc || !doc.body) return;

  // Idempotent: Remove any existing interstitial overlay
  const existing = doc.getElementById("aegis-phishing-interstitial");
  if (existing) {
    existing.remove();
  }

  const existingStyle = doc.getElementById("aegis-interstitial-styles");
  if (existingStyle) {
    existingStyle.remove();
  }

  const similarityPct = Math.min(100, Math.max(1, Math.round(details.similarityScore * 100)));

  // Inject Styles
  const styleEl = doc.createElement("style");
  styleEl.id = "aegis-interstitial-styles";
  styleEl.setAttribute("data-aegis-internal", "true");
  styleEl.textContent = `
    #aegis-phishing-interstitial {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(circle at center, #1E1215 0%, #0B0809 60%, #050404 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      color: #F8FAFC;
    }
    .aegis-interstitial-card {
      max-width: 580px;
      width: 100%;
      background: rgba(26, 16, 20, 0.95);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 0 80px rgba(239, 68, 68, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.9);
      text-align: center;
      backdrop-filter: blur(16px);
      box-sizing: border-box;
    }
    .aegis-interstitial-icon {
      font-size: 54px;
      line-height: 1;
      margin-bottom: 16px;
      filter: drop-shadow(0 0 16px rgba(239, 68, 68, 0.6));
    }
    .aegis-interstitial-badge {
      display: inline-block;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #EF4444;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .aegis-interstitial-title {
      font-size: 26px;
      font-weight: 800;
      color: #F8FAFC;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .aegis-interstitial-desc {
      font-size: 14px;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .aegis-interstitial-desc strong {
      color: #EF4444;
    }
    .aegis-similarity-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    .aegis-similarity-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #94A3B8;
      margin-bottom: 8px;
    }
    .aegis-similarity-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      height: 8px;
      overflow: hidden;
      position: relative;
    }
    .aegis-similarity-fill {
      height: 100%;
      background: linear-gradient(90deg, #F59E0B, #EF4444);
      border-radius: 9999px;
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .aegis-interstitial-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 18px;
    }
    .aegis-btn-safe {
      flex: 1.5;
      padding: 13px 20px;
      background: #10B981;
      color: #064E3B;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .aegis-btn-safe:hover {
      background: #059669;
      color: #FFFFFF;
    }
    .aegis-btn-dismiss {
      flex: 1;
      padding: 13px 16px;
      background: transparent;
      color: #64748B;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .aegis-btn-dismiss:hover {
      color: #CBD5E1;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .aegis-interstitial-footer {
      font-size: 11px;
      color: #475569;
      line-height: 1.4;
    }
  `;

  // Inject Overlay Element
  const overlay = doc.createElement("div");
  overlay.id = "aegis-phishing-interstitial";
  overlay.setAttribute("data-aegis-internal", "true");
  overlay.innerHTML = `
    <div class="aegis-interstitial-card">
      <div class="aegis-interstitial-icon">🛡️</div>
      <div class="aegis-interstitial-badge">AEGIS ACTIVE DEFENSE</div>
      <h1 class="aegis-interstitial-title">Deceptive Visual Clone Blocked</h1>
      <p class="aegis-interstitial-desc">
        Project AEGIS detected that this page visually and structurally mimics <strong>${details.clonedBrand}</strong> on an untrusted origin.
      </p>

      <div class="aegis-similarity-box">
        <div class="aegis-similarity-header">
          <span>Structural Perceptual Layout Match</span>
          <span style="font-weight: 700; color: #EF4444;">${similarityPct}% similarity</span>
        </div>
        <div class="aegis-similarity-track">
          <div class="aegis-similarity-fill" style="width: ${similarityPct}%;"></div>
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 8px; word-break: break-all;">
          Origin: ${details.pageUrl.substring(0, 70)}
        </div>
      </div>

      <div class="aegis-interstitial-actions">
        <button class="aegis-btn-safe" id="aegis-btn-back">
          &larr; Return to Safety
        </button>
        <button class="aegis-btn-dismiss" id="aegis-btn-dismiss">
          Proceed Anyway
        </button>
      </div>

      <div class="aegis-interstitial-footer">
        Protected by Project AEGIS Browser Security Gateway &bull; Bitwise Hamming Blockhash Verification
      </div>
    </div>
  `;

  doc.head.appendChild(styleEl);
  doc.body.appendChild(overlay);

  // Wire buttons
  overlay.querySelector("#aegis-btn-back")?.addEventListener("click", () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "about:blank";
    }
  });

  overlay.querySelector("#aegis-btn-dismiss")?.addEventListener("click", () => {
    overlay.remove();
    styleEl.remove();
  });
}
