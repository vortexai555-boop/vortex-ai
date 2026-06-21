import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GrexoLogo from "@/components/GrexoLogo";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Marquee from "react-fast-marquee";
import { ChatCircleDots, Sparkle, ShieldCheck, Lightning, Globe, Code, MagicWand, FileText, List, X } from "@phosphor-icons/react";

const HERO_BG = "https://images.pexels.com/photos/12707786/pexels-photo-12707786.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&w=200",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=200",
];

const features = [
  { icon: ChatCircleDots, title: "AI Chat Assistant", text: "ChatGPT-style interface powered by Claude Sonnet 4.5. Save, rename and revisit any conversation." },
  { icon: Lightning, title: "Lightning fast", text: "Stream responses with sub-second time-to-first-token. No waiting, just creating." },
  { icon: ShieldCheck, title: "Private by default", text: "Per-user isolation. Your conversations belong only to you. JWT + Google OAuth." },
  { icon: Sparkle, title: "Premium models", text: "Built on the latest Claude reasoning models for accurate, nuanced, helpful answers." },
  { icon: Globe, title: "Anywhere, any device", text: "Mobile-first, glass dashboard. Continue your work from desktop, tablet or phone." },
  { icon: Code, title: "Developer ready", text: "Modular architecture designed to plug in more AI models and tools as you grow." },
  { icon: MagicWand, title: "AI Image Generator", text: "Generate high quality images from text prompts with different styling options immediately." },
  { icon: FileText, title: "Productivity Hub", text: "10 added features: Document Writer, Resume Builder, Cover Letter, Email Writer, Grammar Checker, Text Summarizer, Translator, Meeting Notes, PDF QA, OCR Extract." }
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
    <div className="min-h-screen bg-grexo-bg text-white relative overflow-x-hidden" id="top">
      <div className="grexo-grain absolute inset-0 opacity-30 pointer-events-none" />

      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-grexo-bg/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <GrexoLogo />
          
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#top" className="hover:text-white transition" data-testid="nav-home">Home</a>
            <a href="#features" className="hover:text-white transition" data-testid="nav-features">Features</a>
            <a href="#pricing" className="hover:text-white transition" data-testid="nav-pricing">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition" data-testid="nav-testimonials">Reviews</a>
            <a href="#faq" className="hover:text-white transition" data-testid="nav-faq">FAQ</a>
          </nav>
          
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" className="text-slate-200 hover:bg-white/5" data-testid="nav-login">Sign in</Button></Link>
            <Link to="/signup"><Button className="btn-primary-grexo" data-testid="nav-signup">Start Free</Button></Link>
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
              className="md:hidden border-t border-white/10 bg-grexo-bg/95 backdrop-blur-lg overflow-hidden"
            >
              <nav className="flex flex-col px-6 py-6 gap-6 text-base text-slate-300">
                <a href="#top" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition">Home</a>
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition">Features</a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition">Pricing</a>
                <a href="#testimonials" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition">Reviews</a>
                <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white transition">FAQ</a>
                
                <div className="flex flex-col gap-3 mt-4 pt-6 border-t border-white/10">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-center text-slate-200 hover:bg-white/5">Sign in</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full justify-center btn-primary-grexo">Start Free</Button>
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-24">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-grexo-bg via-grexo-bg/60 to-grexo-bg" />
          <div className="aurora" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="text-mono-accent mb-6" data-testid="hero-tagline">The Future of Creation</div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl tracking-tighter font-light leading-[1.05]">
              Create Anything with
              <span className="block text-gradient-cyan font-medium mt-2">GREXO AI</span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              A premium AI assistant with the elegance of a flagship product. Ask, learn, build — with Claude Sonnet 4.5 under the hood.
            </p>

            {/* Simulated Chat Input Box */}
            <div className="mt-10 max-w-2xl mx-auto bg-black/40 backdrop-blur-md rounded-2xl p-2 pl-5 flex items-center gap-3 border border-white/10 shadow-[0_0_30px_-10px_rgba(0,240,255,0.2)] transition-all focus-within:border-[#00F0FF]/50 focus-within:shadow-[0_0_50px_-10px_rgba(0,240,255,0.3)]">
              <Sparkle size={24} className="text-[#00F0FF] shrink-0" weight="duotone" />
              <input 
                type="text" 
                placeholder="Ask GREXO anything..." 
                className="flex-1 bg-transparent border-none text-white text-base outline-none focus:ring-0 placeholder:text-slate-500 w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    window.location.href = '/signup';
                  }
                }}
              />
              <Link to="/signup">
                <Button size="lg" className="btn-primary-grexo h-12 px-6 text-base rounded-xl">
                  Send Message
                </Button>
              </Link>
            </div>

            {/* Quick Action Suggestions */}
            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap max-w-4xl mx-auto">
              {[
                "AI Chat Assistant", 
                "Website Builder", 
                "Image Generator",
                "Document Writer", 
                "Resume Builder", 
                "Cover Letter", 
                "Email Writer", 
                "Grammar Checker", 
                "Text Summarizer", 
                "Translator", 
                "Meeting Notes", 
                "PDF QA", 
                "OCR Extract"
              ].map((suggestion) => (
                <Link key={suggestion} to="/signup" className="text-xs text-slate-400 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-4 py-2 transition-colors cursor-pointer">
                  {suggestion}
                </Link>
              ))}
            </div>

            <div className="mt-10 text-mono-accent text-[10px]">Trusted by builders worldwide</div>
            <div className="mt-3 flex items-center justify-center gap-6 text-slate-500 text-sm">
              <span>★★★★★ 4.9/5</span>
              <span className="hidden sm:inline">·</span>
              <span>10k+ creators</span>
              <span className="hidden sm:inline">·</span>
              <span>SOC-friendly</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <div className="text-mono-accent mb-3">02 / Capabilities</div>
            <h2 className="text-4xl sm:text-5xl tracking-tight font-light">Everything you need, nothing you don&apos;t.</h2>
            <p className="mt-4 text-slate-400">A focused chat experience built around real conversations, fast streaming and persistent history — all wrapped in a beautiful dark interface.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-8 hover:border-white/20 hover:-translate-y-1 transition-all"
                data-testid={`feature-${i}`}
              >
                <f.icon size={28} weight="duotone" color="#00F0FF" />
                <h3 className="mt-5 text-xl font-medium">{f.title}</h3>
                <p className="mt-2 text-slate-400 text-sm leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <div className="text-mono-accent mb-3">03 / Pricing</div>
            <h2 className="text-4xl sm:text-5xl tracking-tight font-light">Simple plans. Honest pricing.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Free", price: "0 rs", desc: "Try Grexo with daily credits.", features: ["100 credits / month", "Chat with Claude Sonnet 4.5", "Save chat history"], cta: "Start Free", highlight: false },
              { name: "Pro", price: "299 rs", desc: "For creators who ship daily.", features: ["2,000 credits / month", "Priority response speed", "Export conversations"], cta: "Upgrade to Pro", highlight: true },
              { name: "Enterprise", price: "499 rs", desc: "Teams and power users.", features: ["Unlimited credits", "Premium support", "Team features (soon)"], cta: "Contact Sales", highlight: false },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-8 transition-all hover:-translate-y-1 ${p.highlight ? "glass-strong border-[#00F0FF]/40 glow-cyan-strong" : "glass"}`}
                data-testid={`pricing-${p.name.toLowerCase()}`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-medium">{p.name}</h3>
                  {p.highlight && <span className="text-mono-accent">Most popular</span>}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-light">{p.price}</span>
                  <span className="text-slate-500 text-sm">/mo</span>
                </div>
                <p className="mt-2 text-slate-400 text-sm">{p.desc}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {p.features.map((x) => <li key={x} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#00F0FF]"/>{x}</li>)}
                </ul>
                <Link to="/signup">
                  <Button className={`mt-8 w-full ${p.highlight ? "btn-primary-grexo" : "btn-ghost-grexo"}`} data-testid={`pricing-cta-${p.name.toLowerCase()}`}>{p.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="text-mono-accent mb-3">04 / Reviews</div>
          <h2 className="text-4xl sm:text-5xl tracking-tight font-light">Loved by makers.</h2>
        </div>
        <Marquee gradient gradientColor="#030305" gradientWidth={120} speed={36} pauseOnHover>
          {testimonials.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-6 mx-3 w-[340px]">
              <p className="text-slate-200 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </Marquee>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12 text-center">
            <div className="text-mono-accent mb-3">05 / FAQ</div>
            <h2 className="text-4xl sm:text-5xl tracking-tight font-light">Common questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {[
              { q: "Is my chat history private?", a: "Yes. Conversations are stored per user and isolated. We never share your data." },
              { q: "Can I sign in with Google?", a: "Yes, Grexo supports both Google OAuth and email/password authentication." },
              { q: "Do you offer a free tier?", a: "Absolutely. The Free plan gives you 100 credits per month — perfect to explore Grexo." },
              { q: "Can I cancel anytime?", a: "Yes, plans are flexible and you can switch or cancel from your settings at any time." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="glass rounded-xl px-5 border-0" data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-left hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-slate-400">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative pt-24 pb-10 border-t border-white/5 mt-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10 text-sm">
          <div>
            <GrexoLogo />
            <p className="mt-4 text-slate-500 max-w-xs">The future of creation, distilled into a beautiful chat.</p>
          </div>
          <div>
            <div className="text-mono-accent mb-3">Product</div>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><Link to="/signup">Sign up</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-mono-accent mb-3">Legal</div>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">Security</a></li>
            </ul>
          </div>
          <div>
            <div className="text-mono-accent mb-3">Social</div>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#">Twitter</a></li>
              <li><a href="#">LinkedIn</a></li>
              <li><a href="#">Discord</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-16">
          <div className="text-[14vw] sm:text-[10vw] font-heading font-light tracking-tighter leading-none text-white/[0.04] select-none">
            GREXO
          </div>
          <div className="mt-6 text-xs text-slate-600 flex justify-between">
            <span>© 2026 Grexo AI. All rights reserved.</span>
            <span>v1.0 · MVP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
