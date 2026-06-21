import React from "react";

export default function GrexoLogo({ size = 36, withText = true, className = "" }) {
  // If the image itself contains the text, we can just render the image.
  // To avoid duplicating text, we won't render the separate text divs.
  // We use object-contain so the text in the logo remains visible.
  return (
    <div className={`flex items-center justify-center ${className}`} data-testid="grexo-logo">
      <div
        className="relative flex items-center justify-center"
        style={{ height: size, minWidth: size }}
      >
        <img src="https://drive.google.com/uc?export=view&id=1ttIJIAxnbWsY6thF6mWJiOEAVjMH5OBG" alt="Grexo AI" className="h-full object-contain drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]" />
      </div>
    </div>
  );
}
