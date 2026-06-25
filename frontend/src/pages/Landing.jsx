import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GrexoLogo from "@/components/GrexoLogo";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Marquee from "react-fast-marquee";
import { List, X, Sparkles, ArrowRight } from "lucide-react";

// Import landing components
import ProductShowcase from "@/components/landing/ProductShowcase";
import WorkflowAnimation from "@/components/landing/WorkflowAnimation";
import FeatureGrid from "@/components/landing/FeatureGrid";
import ComparisonTable from "@/components/landing/ComparisonTable";
import Statistics from "@/components/landing/Statistics";

const HERO_BG = "https://images.pexels.com/photos/12707786/pexels-photo-12707786.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=200",
];

const testimonials = [
  { name: "Maya Chen", role: "Founder, Pixelweave", quote: "GREXO is the assistant I actually open every morning. Fast, clean, and honest answers.", avatar: AVATARS[1] },
  { name: "Daniel Park", role: "CTO, Northgate", quote: "We replaced three AI tools with GREXO. The interface is in a class of its own.", avatar: AVATARS[0] },
  { name: "Aisha Khan", role: "Product Designer", quote: "The dark aesthetic alone is worth the upgrade. It feels like flying through ideas.", avatar: AVATARS[2] },
  { name: "Rafael Souza", role: "Indie hacker", quote: "I built my entire weekend project with GREXO. The chat is genuinely thoughtful.", avatar: AVATARS[0] },
];

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-x-hidden selection:bg-cyan-500/30 font-sans" id="top">
      {/* Background elements */}
      <div className="absolute top-0 inset-x-0 h-screen bg-gradient-to-b from-cyan-900/20 via-[#020617] to-[#020617] pointer-events-none -z-10" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/70 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <GrexoLogo />
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#" className="text-white">Product</a>
            <a href="#showcase" className="hover:text-white transition">Showcase</a>
            <a href="#compare" className="hover:text-white transition">Compare</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </nav>
          
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition">Sign in</Link>
            <Link to="/signup">
              <button className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-medium hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Start Free
              </button>
            </Link>
          </div>

          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <List size={28} />}
          </button>
        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 bg-[#020617]/95 backdrop-blur-lg overflow-hidden"
            >
              <nav className="flex flex-col px-6 py-6 gap-6 text-base text-slate-300">
                <a href="#showcase" onClick={() => setIsMobileMenuOpen(false)}>Showcase</a>
                <a href="#compare" onClick={() => setIsMobileMenuOpen(false)}>Compare</a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)}>Pricing</a>
                
                <div className="flex flex-col gap-3 mt-4 pt-6 border-t border-white/10">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-center">Sign in</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full justify-center bg-white text-black hover:bg-slate-200">Start Free</Button>
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO */}
      <section className="relative pt-40 pb-20 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
            <Sparkles size={16} />
            <span>Grexo AI 2.0 is now live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl tracking-tighter font-light leading-tight mb-6">
            Create Anything with<br/>
            <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">GREXO AI</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            One AI platform to chat, create images, build websites, write documents, code, and automate your workflow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/signup">
              <button className="h-12 px-8 rounded-full bg-white text-black font-medium hover:bg-slate-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-2">
                Start Free <ArrowRight size={18} />
              </button>
            </Link>
            <button className="h-12 px-8 rounded-full bg-white/5 text-white font-medium hover:bg-white/10 transition-all border border-white/10 flex items-center gap-2">
              Watch Demo
            </button>
          </div>

          {/* Prompt Input Box */}
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-[#0a0a0f] border border-white/10 rounded-2xl p-2 pl-6 flex items-center gap-4 shadow-2xl">
              <Sparkles className="text-cyan-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Ask GREXO anything..." 
                className="bg-transparent text-white w-full outline-none placeholder:text-slate-500 h-12"
              />
              <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Generate
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SHOWCASE MACBOOK SECTION */}
      <section id="showcase" className="py-24 relative z-10">
        <ProductShowcase />
      </section>

      <Statistics />

      <WorkflowAnimation />

      <FeatureGrid />

      {/* INFINITE CAROUSEL */}
      <section className="py-24 overflow-hidden relative">
        <div className="text-center mb-16 px-6">
          <h2 className="text-3xl md:text-5xl font-light text-white mb-4">A tool for every <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">task.</span></h2>
        </div>
        <div className="relative w-full flex items-center">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#020617] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#020617] to-transparent z-10" />
          
          <Marquee speed={40} gradient={false} pauseOnHover>
            {[
              "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800&q=80",
              "https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?w=800&q=80",
              "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
              "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
            ].map((src, i) => (
              <div key={i} className="mx-4 relative group perspective-1000">
                <div className="w-[600px] h-[360px] rounded-2xl overflow-hidden border border-white/10 transform-gpu group-hover:rotate-y-[-5deg] group-hover:rotate-x-[5deg] transition-all duration-500 shadow-2xl">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                    <span className="text-white font-medium text-lg">Live Preview</span>
                  </div>
                </div>
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      <section id="compare">
        <ComparisonTable />
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-light text-white">Loved by <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">visionaries.</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-8 hover:border-cyan-500/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-colors" />
              <div className="flex gap-1 mb-6 text-cyan-400 text-sm">★★★★★</div>
              <p className="text-slate-300 mb-8 text-sm leading-relaxed relative z-10">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-4">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-light text-white mb-4">Simple pricing.</h2>
          <p className="text-slate-400">Scale your creation without limits.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl p-8 lg:p-12">
            <h3 className="text-xl font-medium text-white mb-2">Starter</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-light text-white">$0</span>
              <span className="text-slate-500">/mo</span>
            </div>
            <p className="text-slate-400 mb-8 text-sm">Perfect for individuals starting with AI.</p>
            <button className="w-full py-3 rounded-full bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors mb-8">
              Start Free
            </button>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex gap-3"><Sparkles size={18} className="text-cyan-500 shrink-0" /> 100 Credits / month</li>
              <li className="flex gap-3"><Sparkles size={18} className="text-cyan-500 shrink-0" /> AI Chat Assistant</li>
              <li className="flex gap-3"><Sparkles size={18} className="text-cyan-500 shrink-0" /> Basic Image Gen</li>
            </ul>
          </div>
          {/* Pro */}
          <div className="bg-gradient-to-b from-[#0a0a0f] to-[#020617] border border-cyan-500/30 rounded-3xl p-8 lg:p-12 relative shadow-[0_0_50px_rgba(0,229,255,0.1)]">
            <div className="absolute top-0 inset-x-0 flex justify-center -translate-y-1/2">
              <span className="bg-cyan-500 text-[#020617] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Pro</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-light text-white">$20</span>
              <span className="text-slate-500">/mo</span>
            </div>
            <p className="text-slate-400 mb-8 text-sm">For professionals who ship daily.</p>
            <button className="w-full py-3 rounded-full bg-white text-black font-medium hover:bg-slate-200 transition-colors mb-8 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Upgrade to Pro
            </button>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex gap-3"><Sparkles size={18} className="text-cyan-500 shrink-0" /> Unlimited Chat</li>
              <li className="flex gap-3"><Sparkles size={18} className="text-cyan-500 shrink-0" /> Full Website Builder Access</li>
              <li className="flex gap-3"><Sparkles size={18} className="text-cyan-500 shrink-0" /> Advanced Image Gen</li>
              <li className="flex gap-3"><Sparkles size={18} className="text-cyan-500 shrink-0" /> Fast priority routing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-light text-center mb-12">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="space-y-4">
          {[
            { q: "What models do you use?", a: "We intelligently route between Claude Sonnet, GPT-4o, and specialized open-source models depending on the task to give you the best speed and accuracy." },
            { q: "Is my data private?", a: "Yes. All conversations and generated assets are strictly isolated to your account. We do not use your private data to train our models." },
            { q: "Can I export the websites I build?", a: "Absolutely. The Website Builder allows you to download your full React/Vite source code as a ZIP file instantly." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-white/5 border border-white/10 rounded-2xl px-6 data-[state=open]:bg-white/10 transition-colors">
              <AccordionTrigger className="text-left text-white hover:no-underline py-6">{f.q}</AccordionTrigger>
              <AccordionContent className="text-slate-400 pb-6 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 pt-20 pb-10 mt-20 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-cyan-500/10 blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 relative z-10">
          <div className="md:col-span-1">
            <GrexoLogo />
            <p className="mt-6 text-sm text-slate-400">The premium AI workspace for creators.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition">About</a></li>
              <li><a href="#" className="hover:text-white transition">Blog</a></li>
              <li><a href="#" className="hover:text-white transition">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© 2026 Grexo AI Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition">Twitter</a>
            <a href="#" className="hover:text-white transition">GitHub</a>
            <a href="#" className="hover:text-white transition">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
