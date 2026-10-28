export interface BbmItemRow {
  id: string;
  name: string;
  color: string;
  hoverColor: string;
  bgLight: string;
  values: (number | null)[];
}

export const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const INITIAL_BBM_DATA: BbmItemRow[] = [
  {
    id: 'pertamax',
    name: 'Pertamax',
    color: '#2563eb', // Royal Blue
    hoverColor: '#1d4ed8',
    bgLight: 'rgba(37, 99, 235, 0.1)',
    values: [
      12350000, 11859000, 11623500, 11931000, 8979000, 9893250, 11293750,
      10606750, 11962500, null, null, null,
    ],
  },
  {
    id: 'dex_kadin',
    name: 'Dex Kadin',
    color: '#059669', // Emerald Green
    hoverColor: '#047857',
    bgLight: 'rgba(5, 150, 105, 0.1)',
    values: [
      7616000, 8707500, 10222500, 8681500, 13810500, 8928000, 9940500,
      8671500, 16884000, null, null, null,
    ],
  },
  {
    id: 'dex_toilet',
    name: 'Dex Toilet',
    color: '#d97706', // Amber / Gold
    hoverColor: '#b45309',
    bgLight: 'rgba(217, 119, 6, 0.1)',
    values: [
      4352000, 4455000, 3915000, 8201000, 8788500, 8060000, 6768000,
      11421000, 12474000, null, null, null,
    ],
  },
];

export const AVAILABLE_YEARS = [2026, 2027, 2028, 2029, 2030] as const;
export type AppYear = (typeof AVAILABLE_YEARS)[number];

export interface YearlyStoreItem {
  budget: number;
  data: BbmItemRow[];
}

export type YearlyStore = Record<number, YearlyStoreItem>;

export const DEFAULT_YEARLY_DATA: YearlyStore = {
  2026: {
    budget: 350000000,
    data: INITIAL_BBM_DATA,
  },
  2027: {
    budget: 370000000,
    data: [
      {
        id: 'pertamax',
        name: 'Pertamax',
        color: '#2563eb',
        hoverColor: '#1d4ed8',
        bgLight: 'rgba(37, 99, 235, 0.1)',
        values: [
          12950000, 12450000, 12200000, 12500000, 9400000, 10350000,
          11800000, 11100000, 12500000, null, null, null,
        ],
      },
      {
        id: 'dex_kadin',
        name: 'Dex Kadin',
        color: '#059669',
        hoverColor: '#047857',
        bgLight: 'rgba(5, 150, 105, 0.1)',
        values: [
          8000000, 9150000, 10750000, 9100000, 14500000, 9350000,
          10450000, 9100000, 17500000, null, null, null,
        ],
      },
      {
        id: 'dex_toilet',
        name: 'Dex Toilet',
        color: '#d97706',
        hoverColor: '#b45309',
        bgLight: 'rgba(217, 119, 6, 0.1)',
        values: [
          4550000, 4650000, 4100000, 8600000, 9200000, 8450000,
          7100000, 12000000, 13000000, null, null, null,
        ],
      },
    ],
  },
  2028: {
    budget: 390000000,
    data: [
      {
        id: 'pertamax',
        name: 'Pertamax',
        color: '#2563eb',
        hoverColor: '#1d4ed8',
        bgLight: 'rgba(37, 99, 235, 0.1)',
        values: [
          13600000, 13000000, 12800000, 13100000, 9850000, 10850000,
          12400000, 11650000, 13100000, null, null, null,
        ],
      },
      {
        id: 'dex_kadin',
        name: 'Dex Kadin',
        color: '#059669',
        hoverColor: '#047857',
        bgLight: 'rgba(5, 150, 105, 0.1)',
        values: [
          8400000, 9600000, 11300000, 9550000, 15200000, 9800000,
          11000000, 9550000, 18350000, null, null, null,
        ],
      },
      {
        id: 'dex_toilet',
        name: 'Dex Toilet',
        color: '#d97706',
        hoverColor: '#b45309',
        bgLight: 'rgba(217, 119, 6, 0.1)',
        values: [
          4780000, 4880000, 4300000, 9000000, 9650000, 8850000,
          7450000, 12600000, 13650000, null, null, null,
        ],
      },
    ],
  },
  2029: {
    budget: 410000000,
    data: [
      {
        id: 'pertamax',
        name: 'Pertamax',
        color: '#2563eb',
        hoverColor: '#1d4ed8',
        bgLight: 'rgba(37, 99, 235, 0.1)',
        values: [
          14250000, 13650000, 13400000, 13750000, 10300000, 11400000,
          13000000, 12200000, 13750000, null, null, null,
        ],
      },
      {
        id: 'dex_kadin',
        name: 'Dex Kadin',
        color: '#059669',
        hoverColor: '#047857',
        bgLight: 'rgba(5, 150, 105, 0.1)',
        values: [
          8800000, 10000000, 11800000, 10000000, 15900000, 10300000,
          11500000, 10000000, 19200000, null, null, null,
        ],
      },
      {
        id: 'dex_toilet',
        name: 'Dex Toilet',
        color: '#d97706',
        hoverColor: '#b45309',
        bgLight: 'rgba(217, 119, 6, 0.1)',
        values: [
          5000000, 5100000, 4500000, 9450000, 10100000, 9300000,
          7800000, 13200000, 14300000, null, null, null,
        ],
      },
    ],
  },
  2030: {
    budget: 430000000,
    data: [
      {
        id: 'pertamax',
        name: 'Pertamax',
        color: '#2563eb',
        hoverColor: '#1d4ed8',
        bgLight: 'rgba(37, 99, 235, 0.1)',
        values: [
          14950000, 14300000, 14050000, 14400000, 10800000, 11950000,
          13650000, 12800000, 14400000, null, null, null,
        ],
      },
      {
        id: 'dex_kadin',
        name: 'Dex Kadin',
        color: '#059669',
        hoverColor: '#047857',
        bgLight: 'rgba(5, 150, 105, 0.1)',
        values: [
          9200000, 10500000, 12400000, 10500000, 16700000, 10800000,
          12050000, 10500000, 20150000, null, null, null,
        ],
      },
      {
        id: 'dex_toilet',
        name: 'Dex Toilet',
        color: '#d97706',
        hoverColor: '#b45309',
        bgLight: 'rgba(217, 119, 6, 0.1)',
        values: [
          5250000, 5350000, 4700000, 9900000, 10600000, 9750000,
          8200000, 13850000, 15000000, null, null, null,
        ],
      },
    ],
  },
};

// --- Storage Keys & Passwords ---
export const STORAGE_DATABASE_KEY = 'sibensin_database_v2';
export const STORAGE_PASSWORD_KEY = 'sibensin_security_pin';
export const DEFAULT_APP_PASSWORD = 'admin123';

export function getStoredYearlyData(): { data: YearlyStore; lastSaved: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_DATABASE_KEY);
    if (!raw) {
      return { data: DEFAULT_YEARLY_DATA, lastSaved: null };
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      // Check if wrapped with timestamp
      if (parsed.yearlyStore) {
        return {
          data: { ...DEFAULT_YEARLY_DATA, ...parsed.yearlyStore },
          lastSaved: parsed.lastSaved || null,
        };
      }
      return {
        data: { ...DEFAULT_YEARLY_DATA, ...parsed },
        lastSaved: null,
      };
    }
  } catch (e) {
    console.error('Failed to load stored yearly data:', e);
  }
  return { data: DEFAULT_YEARLY_DATA, lastSaved: null };
}

export function saveStoredYearlyData(yearlyStore: YearlyStore): string {
  const timestamp = new Date().toISOString();
  try {
    const payload = {
      app: 'SiBensin - Rekapitulasi Penggunaan BBM Sekretariat',
      version: '2.0.0',
      lastSaved: timestamp,
      yearlyStore,
    };
    localStorage.setItem(STORAGE_DATABASE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
  return timestamp;
}

export function getStoredPassword(): string {
  try {
    const stored = localStorage.getItem(STORAGE_PASSWORD_KEY);
    if (stored) return stored;
  } catch (e) {
    console.error('Failed to get stored password:', e);
  }
  return DEFAULT_APP_PASSWORD;
}

export function saveStoredPassword(newPassword: string): void {
  try {
    localStorage.setItem(STORAGE_PASSWORD_KEY, newPassword);
  } catch (e) {
    console.error('Failed to save stored password:', e);
  }
}

export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRupiahCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(2)} Jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)} Rb`;
  }
  return formatRupiah(value);
}

export function formatAngka(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('id-ID').format(value);
}

export function calculateTotals(data: BbmItemRow[]) {
  // Total per category
  const rowTotals = data.map((item) => {
    const sum = item.values.reduce<number>(
      (acc, val) => acc + (val !== null ? val : 0),
      0
    );
    return {
      id: item.id,
      name: item.name,
      color: item.color,
      total: sum,
    };
  });

  const grandTotal = rowTotals.reduce((acc, row) => acc + row.total, 0);

  // Total per month
  const monthlyTotals = MONTH_NAMES.map((month, monthIndex) => {
    let hasData = false;
    let sum = 0;
    data.forEach((item) => {
      const val = item.values[monthIndex];
      if (val !== null) {
        hasData = true;
        sum += val;
      }
    });
    return {
      monthIndex,
      monthName: month,
      total: hasData ? sum : null,
    };
  });

  // Active months with data
  const activeMonths = monthlyTotals.filter((m) => m.total !== null);
  const activeMonthsCount = activeMonths.length;
  const averageMonthly =
    activeMonthsCount > 0 ? grandTotal / activeMonthsCount : 0;

  // Highest and lowest month
  let highestMonth = activeMonths[0] || null;
  let lowestMonth = activeMonths[0] || null;

  activeMonths.forEach((m) => {
    if (m.total !== null && highestMonth && highestMonth.total !== null && m.total > highestMonth.total) {
      highestMonth = m;
    }
    if (m.total !== null && lowestMonth && lowestMonth.total !== null && m.total < lowestMonth.total) {
      lowestMonth = m;
    }
  });

  // Quarterly calculation
  const q1Total = [0, 1, 2].reduce((acc, idx) => {
    const val = monthlyTotals[idx].total;
    return acc + (val || 0);
  }, 0);
  const q2Total = [3, 4, 5].reduce((acc, idx) => {
    const val = monthlyTotals[idx].total;
    return acc + (val || 0);
  }, 0);
  const q3Total = [6, 7, 8].reduce((acc, idx) => {
    const val = monthlyTotals[idx].total;
    return acc + (val || 0);
  }, 0);
  const q4Total = [9, 10, 11].reduce((acc, idx) => {
    const val = monthlyTotals[idx].total;
    return acc + (val || 0);
  }, 0);

  return {
    rowTotals,
    grandTotal,
    monthlyTotals,
    activeMonths,
    activeMonthsCount,
    averageMonthly,
    highestMonth,
    lowestMonth,
    quarters: [
      { name: 'Triwulan I (Jan - Mar)', total: q1Total, percentage: grandTotal ? (q1Total / grandTotal) * 100 : 0 },
      { name: 'Triwulan II (Apr - Jun)', total: q2Total, percentage: grandTotal ? (q2Total / grandTotal) * 100 : 0 },
      { name: 'Triwulan III (Jul - Sep)', total: q3Total, percentage: grandTotal ? (q3Total / grandTotal) * 100 : 0 },
      { name: 'Triwulan IV (Okt - Des)', total: q4Total, percentage: grandTotal ? (q4Total / grandTotal) * 100 : 0 },
    ],
  };
}
