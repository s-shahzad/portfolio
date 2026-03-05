import { useEffect, useMemo, useState } from "react";
import { SearchItem } from "../utils/search";

type Props = {
  open: boolean;
  onClose: () => void;
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
};

export default function CommandPalette({ open, onClose, items, onSelect }: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 20);
    return items.filter((item) => `${item.title} ${item.body} ${item.keywords.join(" ")}`.toLowerCase().includes(q)).slice(0, 20);
  }, [items, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
      }
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4" onClick={onClose}>
      <div className="mx-auto mt-20 w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-3" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything..."
          className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300/60"
        />
        <div className="mt-2 max-h-[52vh] overflow-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item);
                onClose();
              }}
              className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-800"
            >
              <div>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-xs text-slate-300">{item.section}</div>
              </div>
              <span className="text-xs text-slate-400">Open</span>
            </button>
          ))}
          {!filtered.length ? <p className="px-3 py-4 text-sm text-slate-400">No results</p> : null}
        </div>
      </div>
    </div>
  );
}
