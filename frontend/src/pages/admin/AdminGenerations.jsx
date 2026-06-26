import React from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

export default function AdminGenerations() {
  const { data, error } = useSWR("/admin/generations", (url) => api.get(url).then(r => r.data));

  if (error) return <div className="p-4 text-red-500">Failed to load generations</div>;
  if (!data) return <div className="p-4 text-slate-400">Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-light mb-4">Generated Images</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.images?.map((img, i) => (
            <div key={i} className="rounded-lg overflow-hidden border border-white/10 bg-black">
              <img src={`data:${img.mime};base64,${img.data}`} alt="Generated" className="w-full aspect-square object-cover" />
              <div className="p-2 text-xs text-slate-400 truncate">{img.prompt}</div>
            </div>
          ))}
          {data.images?.length === 0 && <div className="col-span-full text-slate-400">No images generated.</div>}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-light mb-4">Generated Logos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.logos?.map((logo, i) => (
            <div key={i} className="rounded-lg overflow-hidden border border-white/10 bg-black">
              <img src={`data:${logo.mime};base64,${logo.data}`} alt="Generated Logo" className="w-full aspect-square object-contain bg-white" />
              <div className="p-2 text-xs text-slate-400 truncate">{logo.brand}</div>
            </div>
          ))}
          {data.logos?.length === 0 && <div className="col-span-full text-slate-400">No logos generated.</div>}
        </div>
      </div>
    </div>
  );
}
