import React from "react";

const LOGO_URL = "https://drive.google.com/file/d/1ttIJIAxnbWsY6thF6mWJiOEAVjMH5OBG/view?usp=sharing";

export default function GrexoLogo({ size = 36, withText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="Grexo-logo">
      <div
        className="relative rounded-full overflow-hidden glow-cyan"
        style={{ width: size, height: size, background: "#000" }}
      >
        <img src={LOGO_URL} alt="GREXO AI" className="w-full h-full object-cover" />
      </div>
      {withText && (
        <div className="leading-none">
          <div className="font-heading font-semibold tracking-[0.18em] text-white text-sm">Grexo</div>
          <div className="text-mono-accent">AI</div>
        </div>
      )}
    </div>
  );
}
