import { PropsWithChildren, ReactNode } from "react";

type SectionProps = PropsWithChildren<{
  id: string;
  title: string;
  subtitle?: string;
  alt?: boolean;
  rightContent?: ReactNode;
}>;

export default function Section({ id, title, subtitle, alt, rightContent, children }: SectionProps) {
  return (
    <section id={id} className={`py-10 md:py-14 ${alt ? "rounded-3xl border border-white/5 bg-white/[0.02] px-4 md:px-8" : ""}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
        <div className="space-y-1 text-sm text-slate-300">
          {subtitle ? <p>{subtitle}</p> : null}
          {rightContent}
        </div>
      </div>
      {children}
    </section>
  );
}
