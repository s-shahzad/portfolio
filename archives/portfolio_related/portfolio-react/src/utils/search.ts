import Fuse from "fuse.js";

export type SearchItem = {
  id: string;
  section: string;
  title: string;
  body: string;
  keywords: string[];
  anchor: string;
};

export const createFuse = (items: SearchItem[]) =>
  new Fuse(items, {
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: "title", weight: 0.5 },
      { name: "body", weight: 0.3 },
      { name: "keywords", weight: 0.2 },
    ],
  });

export const splitQueryTerms = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const highlightText = (text: string, query: string): string => {
  const terms = splitQueryTerms(query);
  if (!terms.length) return text;
  const pattern = terms.map(escapeRegExp).join("|");
  const regex = new RegExp(`(${pattern})`, "ig");
  return text.replace(regex, "<mark class=\"hit\">$1</mark>");
};
