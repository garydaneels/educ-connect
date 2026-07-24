"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 1) return total === 1 ? [1] : [];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);

  if (current === 1) {
    for (let i = 1; i <= Math.min(5, total); i++) pages.add(i);
  } else {
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.add(i);
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("...");
    result.push(sorted[i]);
  }
  return result;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 mt-8 flex-wrap">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ← Précédente
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-2 text-stone-400 text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-9 h-9 text-sm rounded-xl border transition-colors ${
              p === currentPage
                ? "bg-orange-500 border-orange-500 text-white font-medium"
                : "border-stone-200 text-stone-700 hover:bg-stone-50"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Suivante →
      </button>
    </div>
  );
}
