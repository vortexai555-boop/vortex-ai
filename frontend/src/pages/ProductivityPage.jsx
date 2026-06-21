import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { 
  FileText, IdentificationCard, EnvelopeOpen, PaperPlaneTilt, 
  TextAa, ListDashes, Translate, Users, FilePdf, Scan,
  ArrowLeft, UploadSimple, Copy, MagicWand, FileImage, Sparkle, PlusCircle
} from "@phosphor-icons/react";

const TOOLS = [
  { id: "document_writer", name: "Document Writer", description: "Write comprehensive documents from scratch.", icon: FileText, needsFile: false, needsInputText: false, needsPrompt: true, promptLabel: "What should the document be about?", btnText: "Write Document" },
  { id: "resume_builder", name: "Resume Builder", description: "Format and improve your resume.", icon: IdentificationCard, needsFile: false, needsInputText: true, needsPrompt: false, inputTextLabel: "Your Current Resume / Details", btnText: "Build Resume" },
  { id: "cover_letter", name: "Cover Letter", description: "Generate a targeted cover letter.", icon: EnvelopeOpen, needsFile: false, needsInputText: true, needsPrompt: true, promptLabel: "Job Description", inputTextLabel:"Your Details / Resume", btnText: "Generate Letter" },
  { id: "email_writer", name: "Email Writer", description: "Draft polite and effective emails.", icon: PaperPlaneTilt, needsFile: false, needsInputText: false, needsPrompt: true, promptLabel: "What is the email about?", btnText: "Draft Email" },
  { id: "grammar_checker", name: "Grammar Checker", description: "Fix typos and improve sentence structure.", icon: TextAa, needsFile: false, needsInputText: true, needsPrompt: false, inputTextLabel: "Text to check", btnText: "Check Grammar" },
  { id: "text_summarizer", name: "Text Summarizer", description: "Condense long text into key points.", icon: ListDashes, needsFile: false, needsInputText: true, needsPrompt: false, inputTextLabel: "Text to summarize", btnText: "Summarize Text" },
  { id: "translator", name: "Translator", description: "Translate text accurately and idiomatically.", icon: Translate, needsFile: false, needsInputText: true, needsPrompt: true, promptLabel: "Target Language", inputTextLabel: "Text to translate", btnText: "Translate" },
  { id: "meeting_notes", name: "Meeting Notes", description: "Extract action items and key decisions.", icon: Users, needsFile: false, needsInputText: true, needsPrompt: false, inputTextLabel: "Meeting Transcript", btnText: "Generate Notes" },
  { id: "pdf_qa", name: "PDF QA", description: "Ask questions about any PDF document.", icon: FilePdf, needsFile: true, fileAccept: "application/pdf", needsInputText: false, needsPrompt: true, promptLabel: "Your Question", btnText: "Ask Question" },
  { id: "ocr", name: "OCR Extract", description: "Extract text from images or scanned PDFs.", icon: Scan, needsFile: true, fileAccept: "image/*,application/pdf", needsInputText: false, needsPrompt: false, btnText: "Extract Text" },
];

export default function ProductivityPage() {
  const { user } = useAuth();
  const [activeTool, setActiveTool] = useState(null);

  const [prompt, setPrompt] = useState("");
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState(null);
  const [fileDataUrl, setFileDataUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSelectTool = (tool) => {
    setActiveTool(tool);
    setPrompt("");
    setInputText("");
    setFile(null);
    setFileDataUrl(null);
    setResult("");
  };

  const handleBack = () => {
    setActiveTool(null);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        toast.error("File is too big. Max 5MB allowed.");
        return;
      }
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFileDataUrl(ev.target.result);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleGenerate = async () => {
    if (activeTool.needsPrompt && !prompt.trim()) {
      toast.error(activeTool.promptLabel + " is required.");
      return;
    }
    if (activeTool.needsInputText && !inputText.trim()) {
      toast.error(activeTool.inputTextLabel + " is required.");
      return;
    }
    if (activeTool.needsFile && !fileDataUrl) {
      toast.error("Please select a file.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const res = await api.post("/productivity/generate", {
        tool_id: activeTool.id,
        prompt,
        input_text: inputText,
        file_data: fileDataUrl,
        file_mime: file?.type
      });

      setResult(res.data.result);
      toast.success("Done!");
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard!");
  };

  if (!activeTool) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-grexo-cyan/20 text-grexo-cyan">
              <MagicWand size={32} weight="duotone" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Productivity Hub</h1>
              <p className="text-slate-400">Supercharge your workflow with AI-powered tools.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {TOOLS.map(t => (
              <button 
                key={t.id} 
                onClick={() => handleSelectTool(t)}
                className="glass rounded-xl p-6 text-left hover:bg-white/5 transition-colors border border-white/5 hover:border-grexo-cyan/30 group"
              >
                <div className="text-grexo-cyan mb-4 group-hover:scale-110 transition-transform duration-300">
                  <t.icon size={32} weight="duotone" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">{t.name}</h3>
                <p className="text-sm text-slate-400">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto">
      <div className="w-full md:w-1/2 p-6 flex flex-col border-r border-white/5 overflow-y-auto">
        <Button variant="ghost" onClick={handleBack} className="self-start -ml-2 mb-6 text-slate-400 hover:text-white">
          <ArrowLeft className="mr-2" /> Back to Tools
        </Button>
        <div className="flex items-center gap-3 mb-8">
          <div className="text-grexo-cyan">
            <activeTool.icon size={28} weight="duotone" />
          </div>
          <h2 className="text-2xl font-bold text-white">{activeTool.name}</h2>
        </div>

        <div className="space-y-6 flex-1">
          {activeTool.needsPrompt && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {activeTool.promptLabel || "Instructions"}
              </label>
              <div className="relative">
                <textarea 
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 pb-12 text-white focus:outline-none focus:border-grexo-cyan/50 focus:ring-1 focus:ring-grexo-cyan/50 min-h-[100px] resize-none transition-all"
                  placeholder="Type here..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
                <div className="absolute left-2 bottom-2">
                  <label className="p-2 flex justify-center items-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 cursor-pointer transition-colors" title="Upload file or image">
                    <PlusCircle size={20} weight="regular" />
                    <input type="file" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>
              {file && (
                <div className="mt-2 flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs text-slate-300 w-fit">
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button type="button" onClick={() => {setFile(null); setFileDataUrl(null);}} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTool.needsInputText && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {activeTool.inputTextLabel || "Input Text"}
              </label>
              <div className="relative">
                <textarea 
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 pb-12 text-white focus:outline-none focus:border-grexo-cyan/50 focus:ring-1 focus:ring-grexo-cyan/50 min-h-[150px] resize-none transition-all"
                  placeholder="Paste the source text here..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />
                <div className="absolute left-2 bottom-2">
                  <label className="p-2 flex justify-center items-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 cursor-pointer transition-colors" title="Upload file or image">
                    <PlusCircle size={20} weight="regular" />
                    <input type="file" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>
              {file && !activeTool.needsPrompt && (
                <div className="mt-2 flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs text-slate-300 w-fit">
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button type="button" onClick={() => {setFile(null); setFileDataUrl(null);}} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTool.needsFile && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Upload File (Max 5MB)
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors bg-black/30">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadSimple className="mb-2 text-slate-400" size={24} />
                  <p className="mb-1 text-sm text-slate-400">
                    <span className="font-semibold text-grexo-cyan">Click to upload</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeTool.fileAccept === "application/pdf" ? "PDF only" : "Images or PDF"}
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept={activeTool.fileAccept}
                  onChange={handleFileChange}
                />
              </label>
              {file && (
                <div className="mt-4 flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                  <FileImage className="text-grexo-purple" size={24} weight="duotone" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Button 
          className="w-full mt-8 h-14 btn-primary-grexo rounded-xl text-base"
          onClick={handleGenerate}
          disabled={loading || user?.credits < 1}
        >
          {loading ? (
            <span className="animate-pulse flex items-center gap-2"><Sparkle weight="duotone" className="animate-spin" /> Generating...</span>
          ) : (
            <>{activeTool.btnText} (1 Credit)</>
          )}
        </Button>
      </div>

      <div className="w-full md:w-1/2 bg-black/20 p-6 flex flex-col h-[50vh] md:h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Result</h3>
          {result && (
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-slate-400 hover:text-white">
              <Copy className="mr-2" /> Copy
            </Button>
          )}
        </div>
        <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-6 overflow-y-auto relative">
          {result ? (
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-slate-300">
              {result}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col gap-3">
              <Sparkle size={48} weight="duotone" className="text-white/10" />
              <p>Your result will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
