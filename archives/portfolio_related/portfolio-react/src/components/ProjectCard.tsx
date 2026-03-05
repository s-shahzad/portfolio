import { motion } from "framer-motion";
import { PublicationItem, FeaturedItem, CertificationItem } from "../data/content";

type ProjectCardProps = {
  item: FeaturedItem | PublicationItem | CertificationItem;
  query: string;
  onCopyCitation?: (text: string) => void;
};

const regexEscape = (value: string) => value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

const mark = (text: string, query: string) => {
  if (!query.trim()) return text;
  const tokens = query.split(/\s+/).filter(Boolean);
  if (!tokens.length) return text;
  const pattern = tokens.map(regexEscape).join("|");
  const regex = new RegExp(`(${pattern})`, "ig");
  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <mark className="hit" key={`${part}-${i}`}>
        {part}
      </mark>
    ) : (
      <span key={`${part}-${i}`}>{part}</span>
    )
  );
};

export default function ProjectCard({ item, query, onCopyCitation }: ProjectCardProps) {
  const isPublication = "readLink" in item;
  const isFeatured = "lines" in item;
  const isCertification = "provider" in item && !isPublication && !isFeatured;

  return (
    <motion.article
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-slate-500"
    >
      <span className="mb-3 inline-flex rounded-full border border-slate-600 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-200">
        {("chip" in item ? item.chip : item.provider) || ""}
      </span>
      <h3 className="mb-2 text-lg font-semibold text-white">{mark(item.title, query)}</h3>

      {isFeatured && item.lines.map((line) => <p key={line} className="mb-1 text-sm text-slate-300">{mark(line, query)}</p>)}
      {isPublication && <p className="mb-2 text-sm text-slate-300">{mark(item.summary, query)}</p>}
      {isCertification && (
        <>
          <p className="mb-2 text-sm text-slate-300">{mark(item.summary, query)}</p>
          {!!item.badges.length && (
            <div className="mb-2 flex flex-wrap gap-2">
              {item.badges.map((b) => (
                <span key={b} className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-200">
                  {mark(b, query)}
                </span>
              ))}
            </div>
          )}
          {item.verifyLink ? (
            <a
              className="inline-flex rounded-lg border border-slate-600 px-2.5 py-1 text-sm text-slate-100 hover:border-slate-400"
              href={item.verifyLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Verify
            </a>
          ) : null}
        </>
      )}

      {isFeatured && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-200">
                {mark(tag, query)}
              </span>
            ))}
          </div>
          <a
            className="mt-3 inline-flex text-sm text-sky-200 hover:text-sky-100"
            href={item.linkHref}
            target={item.linkHref.startsWith("http") ? "_blank" : undefined}
            rel={item.linkHref.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {item.linkLabel}
          </a>
        </>
      )}

      {isPublication && (
        <>
          <details className="mt-3 border-t border-slate-700 pt-2 text-sm text-slate-300">
            <summary className="cursor-pointer text-slate-100">View details</summary>
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {item.badges.map((b) => (
                  <span key={b} className="rounded-full border border-slate-600 px-2 py-0.5 text-xs">
                    {mark(b, query)}
                  </span>
                ))}
              </div>
              {item.details.map((d) => (
                <p key={d}>{mark(d, query)}</p>
              ))}
            </div>
          </details>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.actions.map((a) =>
              a.isCitationButton ? (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => onCopyCitation?.(a.citationText || "")}
                  className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                >
                  {a.label}
                </button>
              ) : (
                <a
                  key={a.href}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                >
                  {a.label}
                </a>
              )
            )}
          </div>
          <a className="mt-2 inline-flex text-sm text-sky-200" href={item.readLink} target="_blank" rel="noopener noreferrer">
            Read
          </a>
        </>
      )}
    </motion.article>
  );
}
