import React from "react";
import { CheckCircle2, Minus } from "lucide-react";

export default function ComparisonTable() {
  const rows = [
    { feature: "AI Chat Assistant", grexo: true, others: true },
    { feature: "Image Generation", grexo: true, others: "Partial" },
    { feature: "Website Builder (Code + Preview)", grexo: true, others: false },
    { feature: "Resume & Cover Letter Builder", grexo: true, others: false },
    { feature: "Document Editor UI", grexo: true, others: false },
    { feature: "OCR Extract", grexo: true, others: "Partial" },
    { feature: "Meeting Notes Automation", grexo: true, others: false },
    { feature: "PDF QA", grexo: true, others: true }
  ];

  return (
    <div className="py-24 max-w-5xl mx-auto px-6 relative">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-light text-white mb-6">Why <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Grexo AI?</span></h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Everything in one place. Stop paying for 5 different subscriptions.
        </p>
      </div>

      <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-6 px-6 text-slate-400 font-medium">Features</th>
                <th className="py-6 px-6 text-white font-semibold text-lg bg-white/5 border-x border-white/5 relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400" />
                  Grexo AI
                </th>
                <th className="py-6 px-6 text-slate-400 font-medium">ChatGPT Plus</th>
                <th className="py-6 px-6 text-slate-400 font-medium">Claude Pro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-5 px-6 text-slate-300 font-medium">{row.feature}</td>
                  <td className="py-5 px-6 bg-white/[0.03] border-x border-white/5">
                    {row.grexo === true ? <CheckCircle2 className="text-cyan-400" size={24} /> : <span className="text-slate-400">{row.grexo}</span>}
                  </td>
                  <td className="py-5 px-6">
                    {row.others === true ? <CheckCircle2 className="text-slate-600" size={24} /> : row.others === false ? <Minus className="text-slate-700" size={24} /> : <span className="text-slate-500 text-sm">{row.others}</span>}
                  </td>
                  <td className="py-5 px-6">
                    {row.others === true ? <CheckCircle2 className="text-slate-600" size={24} /> : row.others === false ? <Minus className="text-slate-700" size={24} /> : <span className="text-slate-500 text-sm">{row.others}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
