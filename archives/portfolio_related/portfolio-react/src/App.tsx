import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Section from "./components/Section";
import CardGrid from "./components/CardGrid";
import ProjectCard from "./components/ProjectCard";
import ExperienceItem from "./components/ExperienceItem";
import Footer from "./components/Footer";
import Reveal from "./components/Reveal";
import CommandPalette from "./components/CommandPalette";
import TableView from "./components/TableView";
import {
  CERTIFICATIONS,
  CONTACT,
  EDUCATION,
  EXPERIENCE,
  FEATURED,
  PUBLICATIONS,
  SKILL_GROUPS,
} from "./data/content";
import { SearchItem, createFuse } from "./utils/search";

const SEARCH_DEBOUNCE_MS = 300;

type ViewMode = "card" | "table";
type CertFilter = "all" | "security" | "cloud" | "data" | "ml";

function App() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem("portfolio:view") === "table" ? "table" : "card"));
  const [certFilter, setCertFilter] = useState<CertFilter>("all");
  const [showAllCerts, setShowAllCerts] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [highlightId, setHighlightId] = useState("");
  const [mobile, setMobile] = useState(window.matchMedia("(max-width: 768px)").matches);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") || "";
    setQuery(q);
    setDebouncedQuery(q);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    localStorage.setItem("portfolio:view", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (debouncedQuery) url.searchParams.set("q", debouncedQuery);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  }, [debouncedQuery]);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 768px)");
    const onChange = () => setMobile(m.matches);
    onChange();
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (mobile) {
      setCollapsedMap(Object.fromEntries(EXPERIENCE.map((exp) => [exp.id, true])));
    } else {
      setCollapsedMap(Object.fromEntries(EXPERIENCE.map((exp) => [exp.id, false])));
    }
  }, [mobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "Escape") setQuery("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searchItems: SearchItem[] = useMemo(() => {
    const rows: SearchItem[] = [];
    FEATURED.forEach((item) => {
      rows.push({ id: item.id, section: "Featured Work", title: item.title, body: item.lines.join(" "), keywords: [item.chip, ...item.tags], anchor: `featured-${item.id}` });
    });
    PUBLICATIONS.forEach((item) => {
      rows.push({ id: item.id, section: "Publications", title: item.title, body: `${item.summary} ${item.details.join(" ")}`, keywords: [item.chip, ...item.badges], anchor: `publications-${item.id}` });
    });
    CERTIFICATIONS.forEach((item) => {
      rows.push({ id: item.id, section: "Certifications", title: item.title, body: item.summary, keywords: [item.provider, ...item.badges, ...item.category], anchor: `certifications-${item.id}` });
    });
    SKILL_GROUPS.forEach((item) => {
      rows.push({ id: item.id, section: "Skills", title: item.title, body: item.skills.join(" "), keywords: item.skills, anchor: `skills-${item.id}` });
    });
    EDUCATION.forEach((item) => {
      rows.push({ id: item.id, section: "Education", title: item.school, body: `${item.degree} ${item.location} ${item.date}`, keywords: [item.degree, item.location], anchor: `education-${item.id}` });
    });
    EXPERIENCE.forEach((item) => {
      rows.push({ id: item.id, section: "Experience", title: `${item.role} - ${item.company}`, body: `${item.location} ${item.duration} ${item.impact} ${item.points.join(" ")}`, keywords: [item.role, item.company, item.location], anchor: `experience-${item.id}` });
    });
    return rows;
  }, []);

  const fuse: Fuse<SearchItem> = useMemo(() => createFuse(searchItems), [searchItems]);

  const matchedSet = useMemo(() => {
    if (!debouncedQuery) return new Set(searchItems.map((item) => item.id));
    return new Set(fuse.search(debouncedQuery).map((result) => result.item.id));
  }, [debouncedQuery, fuse, searchItems]);

  const featuredFiltered = FEATURED.filter((item) => matchedSet.has(item.id));
  const publicationsFiltered = PUBLICATIONS.filter((item) => matchedSet.has(item.id));
  const educationFiltered = EDUCATION.filter((item) => matchedSet.has(item.id));
  const experienceFiltered = EXPERIENCE.filter((item) => matchedSet.has(item.id));
  const skillsFiltered = SKILL_GROUPS.filter((item) => matchedSet.has(item.id));

  const certBaseFiltered = CERTIFICATIONS.filter((item) => matchedSet.has(item.id));
  const certFiltered = debouncedQuery
    ? certBaseFiltered
    : certBaseFiltered.filter((item) => (certFilter === "all" ? true : item.category.includes(certFilter))).filter((item) => (showAllCerts ? true : !item.isExtra));

  const totalResults = featuredFiltered.length + publicationsFiltered.length + certFiltered.length + skillsFiltered.length + educationFiltered.length + experienceFiltered.length;

  const clearSearch = () => setQuery("");

  const jumpToAnchor = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(anchor);
    window.setTimeout(() => setHighlightId(""), 1500);
  };

  const copyCitation = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op
    }
  };

  return (
    <div className="min-h-screen bg-[#090c12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-10 opacity-[0.045] [background-image:radial-gradient(rgba(255,255,255,0.45)_0.45px,transparent_0.45px)] [background-size:3px_3px]" />
      <Navbar query={query} onQueryChange={setQuery} onClear={clearSearch} />

      <div className="mx-auto mt-2 flex w-[min(1240px,calc(100%-1rem))] flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-slate-600 bg-slate-900/60 p-1 text-xs">
          <button onClick={() => setViewMode("card")} className={`rounded-full px-3 py-1 ${viewMode === "card" ? "bg-slate-200 text-slate-950" : "text-slate-200"}`}>Card View</button>
          <button onClick={() => setViewMode("table")} className={`rounded-full px-3 py-1 ${viewMode === "table" ? "bg-slate-200 text-slate-950" : "text-slate-200"}`}>Table View</button>
        </div>
        {debouncedQuery ? (
          <div className="text-sm text-slate-300">
            {totalResults > 0 ? `Showing ${totalResults} results for "${debouncedQuery}"` : `No results for "${debouncedQuery}"`} {totalResults === 0 ? <button className="ml-2 rounded-full border border-slate-600 px-2 py-0.5 text-xs" onClick={clearSearch}>Clear search</button> : null}
          </div>
        ) : null}
      </div>

      <Hero />

      <main className="mx-auto w-[min(1240px,calc(100%-1rem))] pb-10">
        {debouncedQuery ? (
          <Section id="search-results" title="Search Results" subtitle="Live matches across the portfolio.">
            {viewMode === "table" ? (
              <TableView
                caption="Search results table"
                rows={searchItems.filter((item) => matchedSet.has(item.id))}
                columns={[
                  { key: "title", label: "Title", sortable: true, sortValue: (r) => r.title.toLowerCase(), render: (r) => r.title },
                  { key: "section", label: "Section", sortable: true, sortValue: (r) => r.section.toLowerCase(), render: (r) => r.section },
                  { key: "keywords", label: "Keywords", render: (r) => r.keywords.join(", ") },
                  { key: "action", label: "Action", render: (r) => <button className="rounded border border-slate-600 px-2 py-1" onClick={() => jumpToAnchor(r.anchor)}>Go</button> },
                ]}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {searchItems.filter((item) => matchedSet.has(item.id)).map((item) => (
                  <button key={item.id} onClick={() => jumpToAnchor(item.anchor)} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-left hover:border-slate-500">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.section}</p>
                  </button>
                ))}
              </div>
            )}
          </Section>
        ) : null}

        <Reveal>
          <Section id="featured" title="Featured Work" subtitle="Security and ML work prioritized for hiring impact.">
            {viewMode === "table" ? (
              <TableView
                caption="Featured work table"
                rows={featuredFiltered}
                columns={[
                  { key: "title", label: "Title", sortable: true, sortValue: (r) => r.title.toLowerCase(), render: (r) => <span id={`featured-${r.id}`}>{r.title}</span> },
                  { key: "chip", label: "Type", sortable: true, sortValue: (r) => r.chip.toLowerCase(), render: (r) => r.chip },
                  { key: "tags", label: "Keywords", render: (r) => r.tags.join(", ") },
                  { key: "action", label: "Action", render: (r) => <a href={r.linkHref} className="text-sky-200">{r.linkLabel}</a> },
                ]}
              />
            ) : (
              <CardGrid>
                {featuredFiltered.map((item) => (
                  <div key={item.id} id={`featured-${item.id}`} className={highlightId === `featured-${item.id}` ? "flash-highlight rounded-2xl" : ""}>
                    <ProjectCard item={item} query={debouncedQuery} />
                  </div>
                ))}
              </CardGrid>
            )}
          </Section>
        </Reveal>

        <Reveal>
          <Section id="publications" title="Publications" subtitle="Impact-focused summaries with details available on demand." rightContent={<p className="text-slate-300">Peer-reviewed • IEEE</p>}>
            {viewMode === "table" ? (
              <TableView
                caption="Publications table"
                rows={publicationsFiltered}
                columns={[
                  { key: "title", label: "Title", sortable: true, sortValue: (r) => r.title.toLowerCase(), render: (r) => <span id={`publications-${r.id}`}>{r.title}</span> },
                  { key: "type", label: "Type", sortable: true, sortValue: (r) => r.chip.toLowerCase(), render: (r) => r.chip },
                  { key: "venue", label: "Venue", render: (r) => r.badges[0] || "-" },
                  { key: "year", label: "Year", sortable: true, sortValue: (r) => Number((r.badges.find((b) => /\d{4}/.test(b)) || "0").match(/\d{4}/)?.[0] || 0), render: (r) => (r.badges.find((b) => /\d{4}/.test(b)) || "-") },
                  { key: "doi", label: "DOI/Link", render: (r) => <a className="text-sky-200" href={r.actions[0]?.href} target="_blank" rel="noopener noreferrer">Open</a> },
                ]}
              />
            ) : (
              <CardGrid cols="2">
                {publicationsFiltered.map((item) => (
                  <div key={item.id} id={`publications-${item.id}`} className={highlightId === `publications-${item.id}` ? "flash-highlight rounded-2xl" : ""}>
                    <ProjectCard item={item} query={debouncedQuery} onCopyCitation={copyCitation} />
                  </div>
                ))}
              </CardGrid>
            )}
          </Section>
        </Reveal>

        <Reveal>
          <Section id="certifications" title="Certifications" subtitle="Industry-recognized credentials. Filter by category.">
            <div className="mb-4 flex flex-wrap gap-2">
              {(["all", "security", "cloud", "data", "ml"] as CertFilter[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setCertFilter(type)}
                  className={`rounded-full border px-3 py-1 text-xs ${certFilter === type ? "border-slate-300 bg-slate-200 text-slate-950" : "border-slate-600 text-slate-200"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            {viewMode === "table" ? (
              <TableView
                caption="Certifications table"
                rows={certFiltered}
                columns={[
                  { key: "title", label: "Title", sortable: true, sortValue: (r) => r.title.toLowerCase(), render: (r) => <span id={`certifications-${r.id}`}>{r.title}</span> },
                  { key: "provider", label: "Provider", sortable: true, sortValue: (r) => r.provider.toLowerCase(), render: (r) => r.provider },
                  { key: "category", label: "Category", render: (r) => r.category.join(", ") },
                  { key: "date", label: "Date", sortable: true, sortValue: (r) => r.dateText || "", render: (r) => r.badges[0] || "-" },
                  { key: "link", label: "Link", render: (r) => (r.verifyLink ? <a className="text-sky-200" href={r.verifyLink} target="_blank" rel="noopener noreferrer">Verify</a> : "-") },
                ]}
              />
            ) : (
              <CardGrid>
                {certFiltered.map((item) => (
                  <div key={item.id} id={`certifications-${item.id}`} className={highlightId === `certifications-${item.id}` ? "flash-highlight rounded-2xl" : ""}>
                    <ProjectCard item={item} query={debouncedQuery} />
                  </div>
                ))}
              </CardGrid>
            )}
            {!debouncedQuery ? (
              <button onClick={() => setShowAllCerts((v) => !v)} className="mt-4 rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200">
                {showAllCerts ? "Show fewer certifications" : "Show more certifications"}
              </button>
            ) : null}
          </Section>
        </Reveal>

        <Reveal>
          <Section id="skills" title="Skills" subtitle="Focused, high-signal skills for cybersecurity and ML security roles." alt>
            <CardGrid cols="2">
              {skillsFiltered.map((group) => (
                <article key={group.id} id={`skills-${group.id}`} className={`rounded-2xl border border-slate-700 bg-slate-900/70 p-4 ${highlightId === `skills-${group.id}` ? "flash-highlight" : ""}`}>
                  <h3 className="mb-2 text-lg font-semibold text-white">{group.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.skills.map((skill) => (
                      <span key={skill} className="rounded-full border border-slate-600 bg-slate-800/70 px-2 py-0.5 text-xs text-slate-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </CardGrid>
          </Section>
        </Reveal>

        <Reveal>
          <Section id="education" title="Education" subtitle="Academic foundation and specializations.">
            <div className="grid gap-4">
              {educationFiltered.map((item) => (
                <article key={item.id} id={`education-${item.id}`} className={`rounded-2xl border border-slate-700 bg-slate-900/70 p-4 ${highlightId === `education-${item.id}` ? "flash-highlight" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.school}</h3>
                      <p className="text-slate-300">{item.degree}</p>
                      <p className="text-slate-400">{item.location}</p>
                    </div>
                    <span className="text-sm text-slate-300">{item.date}</span>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal>
          <Section id="experience" title="Experience" subtitle="Selected roles across cybersecurity, data, and engineering." alt rightContent={<p>Full work history available in my resume · <a className="text-sky-200" href="/assets/Azhad_Shahzad_Shaik_Cybersecurity_Engineer_Resume.pdf" target="_blank" rel="noopener noreferrer" download>Download Resume</a></p>}>
            {viewMode === "table" ? (
              <TableView
                caption="Experience summary table"
                rows={experienceFiltered}
                columns={[
                  { key: "role", label: "Role", sortable: true, sortValue: (r) => r.role.toLowerCase(), render: (r) => <span id={`experience-${r.id}`}>{r.role}</span> },
                  { key: "company", label: "Company", sortable: true, sortValue: (r) => r.company.toLowerCase(), render: (r) => r.company },
                  { key: "location", label: "Location", sortable: true, sortValue: (r) => r.location.toLowerCase(), render: (r) => r.location },
                  { key: "duration", label: "Duration", sortable: true, sortValue: (r) => r.duration, render: (r) => r.duration },
                ]}
              />
            ) : (
              <div className="grid gap-4">
                {experienceFiltered.map((item) => (
                  <div key={item.id} id={`experience-${item.id}`} className={highlightId === `experience-${item.id}` ? "flash-highlight rounded-2xl" : ""}>
                    <ExperienceItem
                      item={item}
                      mobile={mobile}
                      collapsed={!!collapsedMap[item.id]}
                      onToggle={() => setCollapsedMap((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      query={debouncedQuery}
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>
        </Reveal>

        <Reveal>
          <Section id="contact" title={CONTACT.heading} subtitle={CONTACT.subtitle}>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="block text-xs text-slate-400">Email</span>
                  <a href={`mailto:${CONTACT.email}`} className="text-slate-100 hover:text-white">
                    {CONTACT.email}
                  </a>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">GitHub</span>
                  <a href={CONTACT.githubLink} target="_blank" rel="noopener noreferrer" className="text-slate-100 hover:text-white">
                    {CONTACT.githubLabel}
                  </a>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-300">{CONTACT.response}</p>
            </div>
          </Section>
        </Reveal>
      </main>

      <Footer />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        items={searchItems}
        onSelect={(item) => jumpToAnchor(item.anchor)}
      />
    </div>
  );
}

export default App;
