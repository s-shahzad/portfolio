import { motion } from "framer-motion";
import { NAV_LINKS } from "../data/content";
import SearchBar from "./SearchBar";

type NavbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
};

export default function Navbar({ query, onQueryChange, onClear }: NavbarProps) {
  return (
    <motion.nav
      className="sticky top-0 z-40 border-b border-slate-700/70 bg-slate-950/85 backdrop-blur"
      initial={false}
      whileInView={{ boxShadow: "0 8px 26px rgba(0,0,0,0.35)" }}
      viewport={{ amount: 0.01 }}
    >
      <div className="mx-auto flex w-[min(1240px,calc(100%-1rem))] items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0 text-sm font-extrabold tracking-[0.2em] text-white">AS</div>
          <div className="hidden items-center gap-3 lg:flex">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href} className="rounded-lg px-2 py-1 text-sm text-slate-200 hover:bg-slate-800/70 hover:text-white">
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="nav-actions">
          <SearchBar value={query} onChange={onQueryChange} onClear={onClear} />
        </div>
      </div>
    </motion.nav>
  );
}
