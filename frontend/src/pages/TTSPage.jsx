import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, StopCircle, Pause, Download, Trash, Copy, Clock,
  MicrophoneStage, Waveform, MagnifyingGlass, ClockCounterClockwise,
  ArrowUUpLeft, ArrowUUpRight, ClipboardText, SpeakerHigh, SpeakerSlash,
  SkipBack, SkipForward, MusicNotes, CheckCircle, WarningCircle, Check
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const VOICES = [
  { id: "gemini-male", name: "Adam", gender: "Male", language: "English (US)", accent: "American", category: "Professional" },
  { id: "gemini-female", name: "Sarah", gender: "Female", language: "English (US)", accent: "American", category: "Narrator" },
  { id: "gemini-child", name: "Timmy", gender: "Child", language: "English (US)", accent: "American", category: "Friendly" },
  { id: "gemini-uk-male", name: "Arthur", gender: "Male", language: "English (UK)", accent: "British", category: "Storytelling" },
  { id: "gemini-es-female", name: "Isabella", gender: "Female", language: "Spanish", accent: "Spain", category: "News Reader" },
  { id: "gemini-hi-female", name: "Priya", gender: "Female", language: "Hindi", accent: "Indian", category: "Calm" },
  { id: "gemini-fr-male", name: "Louis", gender: "Male", language: "French", accent: "France", category: "Podcast" },
  { id: "gemini-de-female", name: "Emma", gender: "Female", language: "German", accent: "Germany", category: "Energetic" },
];

export default function TTSPage() {
  const [text, setText] = useState("");
  const [historyText, setHistoryText] = useState([""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStage, setGenStage] = useState("");
  const [progress, setProgress] = useState(0);
  
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Audio Player State
  const [playingId, setPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef(new Audio());

  useEffect(() => {
    fetchHistory();
    const audio = audioRef.current;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setPlayingId(null);
      setCurrentTime(0);
    };
    
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/tts/history");
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    // Add to undo history
    const newHistory = historyText.slice(0, historyIndex + 1);
    newHistory.push(newText);
    if (newHistory.length > 20) newHistory.shift(); // keep last 20
    setHistoryText(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setText(historyText[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < historyText.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setText(historyText[historyIndex + 1]);
    }
  };

  const pasteText = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const newText = text + clipboardText;
      handleTextChange({ target: { value: newText } });
      toast.success("Text pasted");
    } catch (err) {
      toast.error("Failed to read clipboard");
    }
  };

  const clearText = () => {
    handleTextChange({ target: { value: "" } });
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to generate.");
      return;
    }
    
    setIsGenerating(true);
    setGenStage("Preparing...");
    setProgress(10);
    
    try {
      setTimeout(() => { setGenStage("Analyzing Text..."); setProgress(30); }, 500);
      setTimeout(() => { setGenStage("Generating Voice..."); setProgress(60); }, 1000);
      setTimeout(() => { setGenStage("Optimizing Audio..."); setProgress(85); }, 1500);
      
      const voiceObj = VOICES.find(v => v.id === selectedVoice);
      const res = await api.post("/tts/generate", {
        text,
        voice: voiceObj.name,
        language: voiceObj.language,
        provider: "gemini"
      });
      
      setProgress(100);
      setGenStage("Completed");
      toast.success("Audio generated successfully!");
      fetchHistory();
      
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
        setGenStage("");
      }, 1000);
      
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Generation failed.");
      setIsGenerating(false);
      setProgress(0);
      setGenStage("");
    }
  };

  const togglePlay = (id, audioData) => {
    const audio = audioRef.current;
    if (playingId === id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    } else {
      audio.src = audioData;
      audio.volume = isMuted ? 0 : volume;
      audio.playbackRate = playbackRate;
      audio.play();
      setPlayingId(id);
      setIsPlaying(true);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tts/history/${id}`);
      toast.success("Deleted from history");
      setHistory(history.filter(h => h.id !== id));
      if (playingId === id) {
        audioRef.current.pause();
        setPlayingId(null);
        setIsPlaying(false);
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const wordsCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charsCount = text.length;
  // Avg speaking rate ~ 130 words per min
  const estimatedSeconds = Math.ceil((wordsCount / 130) * 60);
  
  const filteredHistory = history.filter(h => 
    h.text?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    h.language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.voice?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex gap-6 p-6 overflow-hidden">
      
      {/* Left Panel: Controls & Editor */}
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-2">
        <div className="space-y-2">
          <h1 className="text-3xl font-light">Text to Speech</h1>
          <p className="text-sm text-slate-400">Convert text into realistic human-like speech. Powered by Gemini TTS.</p>
        </div>
        
        {/* Voice Selection */}
        <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 flex-shrink-0">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <MicrophoneStage size={20} className="text-grexo-cyan" />
            Voice Selection
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {VOICES.map(voice => (
              <div 
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col ${
                  selectedVoice === voice.id 
                  ? "bg-grexo-cyan/10 border-grexo-cyan text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                  : "bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold">{voice.name}</span>
                  {selectedVoice === voice.id && <CheckCircle size={16} className="text-grexo-cyan" weight="fill" />}
                </div>
                <div className="text-xs mt-1 opacity-80">{voice.language} • {voice.accent}</div>
                <div className="text-xs mt-auto pt-2 text-grexo-cyan opacity-80 font-medium">{voice.category}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Text Input Area */}
        <div className="glass flex-1 flex flex-col rounded-2xl border border-white/5 relative min-h-[300px]">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-white/5 flex flex-wrap gap-2 items-center justify-between bg-black/20">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0} className="text-slate-400 hover:text-white px-2">
                <ArrowUUpLeft size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= historyText.length - 1} className="text-slate-400 hover:text-white px-2">
                <ArrowUUpRight size={16} />
              </Button>
              <div className="w-px h-5 bg-white/10 mx-1 self-center" />
              <Button variant="ghost" size="sm" onClick={pasteText} className="text-slate-400 hover:text-white gap-1 px-2">
                <ClipboardText size={16} /> <span className="hidden sm:inline">Paste</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={clearText} className="text-slate-400 hover:text-white gap-1 px-2">
                <Trash size={16} /> <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
            
            <div className="text-xs text-slate-400 flex gap-4">
              <span title="Estimated speaking time"><Clock size={14} className="inline mr-1" />{formatTime(estimatedSeconds)}</span>
              <span>{wordsCount} words</span>
              <span className={charsCount > 5000 ? "text-amber-400" : ""}>{charsCount} / 5000 chars</span>
            </div>
          </div>
          
          <Textarea 
            value={text}
            onChange={handleTextChange}
            placeholder="Type or paste your text here..."
            className="flex-1 w-full bg-transparent border-none p-6 resize-none outline-none focus:ring-0 text-lg leading-relaxed text-slate-200 font-serif"
            maxLength={5000}
          />

          {/* Status and Action */}
          <div className="p-4 border-t border-white/5 flex flex-col gap-3 bg-black/40">
            
            {/* Progress Bar */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="flex justify-between text-xs text-grexo-cyan">
                    <span>{genStage}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-black rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      className="bg-grexo-cyan h-full" 
                      initial={{ width: "0%" }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-center">
              <div className="text-xs text-slate-500">
                <Check size={14} className="inline mr-1 text-green-500" />
                Gemini Neural Engine Ready
              </div>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !text.trim()}
                className="bg-white text-black hover:bg-slate-200 px-8 py-5 rounded-xl font-medium text-base transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-black/30 border-t-black rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Waveform size={20} weight="bold" />
                    Generate Speech
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Player & History */}
      <div className="w-[420px] flex-shrink-0 flex flex-col space-y-4">
        
        {/* Audio Player Panel */}
        <div className="glass rounded-2xl border border-white/5 p-5 bg-gradient-to-b from-black/40 to-transparent relative overflow-hidden flex-shrink-0">
          {playingId ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-medium text-slate-200">Now Playing</h4>
                  <p className="text-xs text-grexo-cyan mt-1">
                    {history.find(h => h.id === playingId)?.voice} • {history.find(h => h.id === playingId)?.language}
                  </p>
                </div>
                <MusicNotes size={24} className="text-white/20" />
              </div>
              
              <div className="space-y-3 mb-6">
                <input 
                  type="range" 
                  min="0" max={duration || 100} 
                  value={currentTime} 
                  onChange={(e) => { audioRef.current.currentTime = e.target.value; setCurrentTime(e.target.value); }}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-grexo-cyan"
                />
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setIsMuted(!isMuted); audioRef.current.muted = !isMuted; }}
                    className="p-2 text-slate-400 hover:text-white"
                  >
                    {isMuted || volume == 0 ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />}
                  </button>
                  <input 
                    type="range" min="0" max="1" step="0.01" value={volume}
                    onChange={(e) => { setVolume(e.target.value); audioRef.current.volume = e.target.value; setIsMuted(false); }}
                    className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-grexo-cyan"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => { audioRef.current.currentTime = Math.max(0, currentTime - 10); }} className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10">
                    <SkipBack size={18} />
                  </button>
                  <button onClick={() => togglePlay(playingId, audioRef.current.src)} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg">
                    {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" className="ml-1" />}
                  </button>
                  <button onClick={() => { audioRef.current.currentTime = Math.min(duration, currentTime + 10); }} className="p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10">
                    <SkipForward size={18} />
                  </button>
                </div>
                
                <div className="flex items-center">
                   <select 
                     value={playbackRate} 
                     onChange={(e) => {
                       const v = parseFloat(e.target.value);
                       setPlaybackRate(v);
                       audioRef.current.playbackRate = v;
                     }}
                     className="bg-transparent text-xs text-slate-400 outline-none cursor-pointer hover:text-white"
                   >
                     <option value="0.5">0.5x</option>
                     <option value="1">1x</option>
                     <option value="1.5">1.5x</option>
                     <option value="2">2x</option>
                   </select>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <MusicNotes size={40} className="mb-4 opacity-30" />
              <p>Select a track from history to play</p>
            </div>
          )}
        </div>

        {/* History Panel */}
        <div className="flex-1 flex flex-col glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-black/20">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <ClockCounterClockwise size={18} className="text-grexo-cyan" />
              Recent Generations
            </h3>
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-grexo-cyan/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredHistory.length === 0 ? (
              <div className="text-center text-slate-500 py-10">
                <p>No history found</p>
              </div>
            ) : (
              filteredHistory.map(item => (
                <div 
                  key={item.id} 
                  className={`bg-black/30 border p-3 rounded-xl transition-colors group cursor-pointer ${playingId === item.id ? 'border-grexo-cyan/50 bg-grexo-cyan/5' : 'border-white/5 hover:border-white/10'}`}
                  onClick={() => togglePlay(item.id, item.audio_data)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${playingId === item.id ? 'bg-grexo-cyan text-black' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
                        {playingId === item.id && isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="ml-0.5" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{item.voice}</div>
                        <div className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                       {(item.size_bytes / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed ml-10">
                    "{item.text}"
                  </p>
                  
                  <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setText(item.text); }}
                      title="Reuse Text"
                      className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                    >
                      <Copy size={14} className="mr-1" /> Text
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="Download MP3"
                      onClick={(e) => {
                        e.stopPropagation();
                        const a = document.createElement("a");
                        a.href = item.audio_data;
                        a.download = `speech_${item.id}.mp3`;
                        a.click();
                      }}
                      className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                    >
                      <Download size={14} className="mr-1" /> MP3
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
