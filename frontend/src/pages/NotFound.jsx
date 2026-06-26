import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030305] text-white p-6">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-light text-cyan-400 mb-6 drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">404</h1>
        <h2 className="text-2xl font-medium mb-4">Page Not Found</h2>
        <p className="text-slate-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
