import React from "react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_e8fbdd8e-9dde-4bc1-bb31-5473be113ed6/artifacts/c7b8qocd_WhatsApp%20Image%202026-06-05%20at%208.34.35%20PM.jpeg";

export default function VortexLogo({ size = 36, withText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="vortex-logo">
      <div
        className="relative rounded-full overflow-hidden glow-cyan"
        style={{ width: size, height: size, background: "#000" }}
      >
        <img src={LOGO_URL} alt="VORTEX AI" className="w-full h-full object-cover" />
      </div>
      {withText && (
        <div className="leading-none">
          <div className="font-heading font-semibold tracking-[0.18em] text-white text-sm">VORTEX</div>
          <div className="text-mono-accent">AI</div>
        </div>
      )}
    </div>
  );
}
