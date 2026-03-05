import { useMemo, useState } from "react";

type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

type Props<T> = {
  caption: string;
  rows: T[];
  columns: Column<T>[];
};

export default function TableView<T>({ caption, rows, columns }: Props<T>) {
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !col.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir, columns]);

  const onSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-700">
      <table className="min-w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-slate-900">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="border-b border-slate-700 px-3 py-2 text-left font-semibold text-slate-100">
                {col.sortable ? (
                  <button type="button" onClick={() => onSort(col.key)} className="inline-flex items-center gap-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-300/60">
                    {col.label}
                    <span className="text-xs text-slate-400">{sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr key={idx} className="border-b border-slate-800 last:border-b-0">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-slate-300 align-top">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
