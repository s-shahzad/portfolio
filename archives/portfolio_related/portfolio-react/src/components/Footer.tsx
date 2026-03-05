import { FOOTER } from "../data/content";

export default function Footer() {
  return (
    <footer className="border-t border-slate-700 py-6 text-sm text-slate-400">
      <div className="mx-auto w-[min(1240px,calc(100%-1rem))]">{FOOTER}</div>
    </footer>
  );
}
