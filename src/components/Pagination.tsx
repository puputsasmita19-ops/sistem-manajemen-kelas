import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
  itemLabel = 'data',
  className = ''
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(validCurrentPage * itemsPerPage, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (validCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (validCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs ${className}`}
    >
      {/* Kiri: Info Jumlah & Ukuran Halaman */}
      <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
        <span>
          Menampilkan{' '}
          <strong className="text-slate-900 dark:text-white font-bold">{startItem}</strong> -{' '}
          <strong className="text-slate-900 dark:text-white font-bold">{endItem}</strong> dari{' '}
          <strong className="text-slate-900 dark:text-white font-bold">{totalItems}</strong> {itemLabel}
        </span>

        {onItemsPerPageChange && itemsPerPageOptions.length > 0 && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2 pl-0 sm:pl-3 border-l-0 sm:border-l border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Baris:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs"
              aria-label="Pilih jumlah baris per halaman"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / hal
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Kanan: Navigasi Tombol Pagination */}
      <div className="flex items-center gap-1">
        {/* Tombol Pertama (<<) */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={validCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Halaman Pertama"
          aria-label="Halaman Pertama"
        >
          <ChevronsLeft className="w-4 h-4 text-black dark:text-white" />
        </button>

        {/* Tombol Sebelumnya (<) */}
        <button
          type="button"
          onClick={() => onPageChange(validCurrentPage - 1)}
          disabled={validCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Halaman Sebelumnya"
          aria-label="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4 text-black dark:text-white" />
        </button>

        {/* Nomor Halaman */}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-slate-400 dark:text-slate-500 font-bold select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === validCurrentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Halaman ${pageNum}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Tombol Berikutnya (>) */}
        <button
          type="button"
          onClick={() => onPageChange(validCurrentPage + 1)}
          disabled={validCurrentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Halaman Berikutnya"
          aria-label="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4 text-black dark:text-white" />
        </button>

        {/* Tombol Terakhir (>>) */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={validCurrentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title="Halaman Terakhir"
          aria-label="Halaman Terakhir"
        >
          <ChevronsRight className="w-4 h-4 text-black dark:text-white" />
        </button>
      </div>
    </div>
  );
};
