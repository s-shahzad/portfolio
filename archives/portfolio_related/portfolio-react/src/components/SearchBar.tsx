import { useEffect, useMemo, useRef, useState } from "react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export default function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMac = useMemo(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform), []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChangeMq = () => {
      const isMobile = mq.matches;
      setMobile(isMobile);
      if (!isMobile) setMobileOpen(false);
    };
    onChangeMq();
    mq.addEventListener("change", onChangeMq);
    return () => mq.removeEventListener("change", onChangeMq);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (mobile) setMobileOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (event.key === "Escape") {
        if (value) onClear();
        if (mobile) setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile, onClear, value]);

  useEffect(() => {
    if (mobileOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [mobileOpen]);

  const hint = isMac ? "⌘K" : "Ctrl+K";

  const field = (
    <div className="search-pill">
      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M11 3a8 8 0 1 0 5.293 14.003l4.352 4.352 1.414-1.414-4.352-4.352A8 8 0 0 0 11 3Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
          fill="currentColor"
        />
      </svg>

      <input
        ref={inputRef}
        id="site-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search projects, skills, certs..."
        aria-label="Search site"
        className="search-input"
      />

      <span className="search-shortcut" aria-hidden="true">
        {isMac ? <kbd>⌘</kbd> : <kbd>Ctrl</kbd>}
        {!isMac ? <kbd>K</kbd> : <kbd>K</kbd>}
      </span>

      {value ? (
        <button type="button" onClick={onClear} className="search-clear-inline" aria-label="Clear search">
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );

  if (mobile) {
    return (
      <>
        <button
          type="button"
          className="search-mobile-trigger"
          aria-label="Open search"
          onClick={() => setMobileOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M11 3a8 8 0 1 0 5.293 14.003l4.352 4.352 1.414-1.414-4.352-4.352A8 8 0 0 0 11 3Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
              fill="currentColor"
            />
          </svg>
        </button>
        {mobileOpen ? (
          <div className="search-mobile-overlay" role="dialog" aria-modal="true" aria-label="Search">
            <div className="search-mobile-panel">
              {field}
              <button
                type="button"
                className="search-mobile-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close search"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return field;
}
