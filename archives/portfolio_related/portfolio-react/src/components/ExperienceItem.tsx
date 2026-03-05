import { AnimatePresence, motion } from "framer-motion";
import { ExperienceItem as Experience } from "../data/content";

type Props = {
  item: Experience;
  mobile: boolean;
  collapsed: boolean;
  onToggle: () => void;
  query: string;
};

const esc = (v: string) => v.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
const mark = (text: string, query: string) => {
  if (!query.trim()) return text;
  const pattern = query.split(/\s+/).filter(Boolean).map(esc).join("|");
  if (!pattern) return text;
  const r = new RegExp(`(${pattern})`, "ig");
  return text.split(r).map((part, i) => (new RegExp(`^(${pattern})$`, "i").test(part) ? <mark className="hit" key={i}>{part}</mark> : <span key={i}>{part}</span>));
};

export default function ExperienceItem({ item, mobile, collapsed, onToggle, query }: Props) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{mark(item.company, query)}</h3>
          <p className="text-slate-300">{mark(item.role, query)}</p>
          <p className="text-slate-400">{mark(item.location, query)}</p>
        </div>
        <div className="text-sm text-slate-300">{mark(item.duration, query)}</div>
      </div>
      {mobile ? (
        <button type="button" onClick={onToggle} className="mt-2 rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200">
          {collapsed ? "Expand" : "Collapse"}
        </button>
      ) : null}
      <AnimatePresence initial={false}>
        {(!mobile || !collapsed) && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-sm text-slate-300">{mark(item.impact, query)}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {item.points.map((point) => (
                <li key={point}>{mark(point, query)}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
