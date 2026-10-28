import React, { useState, useRef, useEffect } from 'react';
import { AVAILABLE_YEARS, AppYear } from '../data/bbmData';
import { Calendar, ChevronDown, Check } from 'lucide-react';

interface YearSelectorProps {
  selectedYear: AppYear;
  onSelectYear: (year: AppYear) => void;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  onSelectYear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
      {/* Title & Info */}
      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <span className="block text-slate-900 font-bold text-sm">Pilih Tahun Anggaran</span>
          <span className="text-[11px] text-slate-500 font-normal">
            Beralih data rekapitulasi, grafik, dan pagu antar tahun anggaran
          </span>
        </div>
      </div>

      {/* Interactive Dropdown Button & Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full sm:w-auto inline-flex items-center justify-between gap-3 px-4 py-2 text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-sm font-bold text-blue-900">
              Tahun {selectedYear}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu Panel */}
        {isOpen && (
          <div
            className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
            role="listbox"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              Daftar Tahun Anggaran (2026 - 2030)
            </div>
            <div className="py-1">
              {AVAILABLE_YEARS.map((year) => {
                const isSelected = selectedYear === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      onSelectYear(year);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs">Tahun {year}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {year === 2026
                          ? 'Rekapitulasi Dokumen Asli'
                          : `Data Alokasi & Proyeksi ${year}`}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
