import { motion, useReducedMotion } from "framer-motion";
import { HERO } from "../data/content";

export default function Hero() {
  const reduced = useReducedMotion();

  return (
    <header className="py-4">
      <div className="mx-auto grid min-h-[80vh] w-[min(1240px,calc(100%-1rem))] grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-slate-700/70 shadow-deep"
          animate={reduced ? undefined : { scale: [1.02, 1.05] }}
          transition={reduced ? undefined : { duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        >
          <img src={HERO.imageSrc} alt="Azhad Shahzad Shaik" className="h-full min-h-[420px] w-full object-cover grayscale" />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/55 to-transparent" />
        </motion.div>

        <div className="flex flex-col justify-center gap-5 rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-7 shadow-soft">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{HERO.eyebrow}</p>
          <h1 className="text-5xl font-bold leading-[0.95] tracking-tight text-white lg:text-7xl">{HERO.name}</h1>
          <div className="h-px w-4/5 bg-gradient-to-r from-slate-500/80 to-transparent" />
          {HERO.subtitles.map((line) => (
            <p key={line} className="text-slate-300">{line}</p>
          ))}
          <p className="font-semibold text-slate-100">{HERO.availability}</p>
          <div className="flex flex-wrap gap-3">
            <a href={HERO.ctaPrimary.href} className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-white">
              {HERO.ctaPrimary.label}
            </a>
            <a
              href={HERO.ctaSecondary.href}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="rounded-full border border-slate-500 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:border-slate-300"
            >
              {HERO.ctaSecondary.label}
            </a>
          </div>
          <div className="mt-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">{HERO.cardTitle}</p>
            <p>{HERO.cardBody}</p>
            <p className="mt-2">
              <span className="text-slate-400">{HERO.cardMetaLabel}</span> <strong className="text-slate-100">{HERO.cardMetaValue}</strong>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
