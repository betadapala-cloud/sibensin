import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BbmItemRow,
  MONTH_NAMES,
  calculateTotals,
  formatRupiah,
  formatRupiahCompact,
  formatAngka,
} from '../data/bbmData';

export interface PdfExportOptions {
  title: string;
  agencyName: string;
  reportDate: string;
  signatoryTitle: string;
  signatoryName: string;
  signatoryNip: string;
  includeCharts: boolean;
  includeAnalysis: boolean;
}

/**
 * Generates an offscreen crisp Canvas image for the 12-Month Bar Chart
 * identical in style and content to PrintReportView.
 */
function createFallbackBarChartImage(
  data: BbmItemRow[],
  year: number,
  highestMonth: { monthIndex: number; monthName: string; total: number | null } | null
): string {
  const width = 960;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border & subtle header
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Chart Title
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.fillText(`1. Diagram Batang: Tren Realisasi Bulanan (Tahun ${year})`, 32, 40);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = 'normal 13px Helvetica, Arial, sans-serif';
  ctx.fillText('Distribusi serapan per bulan dengan penanda puncak realisasi tertinggi', 32, 62);

  // Legend at top right
  const legendItems = [
    { name: 'Pertamax', color: '#2563eb' },
    { name: 'Dex Kadin', color: '#059669' },
    { name: 'Dex Toilet', color: '#d97706' },
  ];
  let legendX = width - 420;
  legendItems.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(legendX, 36, 14, 14, 3);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
    ctx.fillText(item.name, legendX + 20, 48);
    legendX += 115;
  });

  // Calculate monthly totals to find scale
  const monthlySums = MONTH_NAMES.map((_, mIdx) => {
    let sum = 0;
    data.forEach((row) => {
      const v = row.values[mIdx];
      if (v !== null) sum += v;
    });
    return sum;
  });

  const maxVal = Math.max(...monthlySums, 45000000);
  const ceilMax = Math.ceil(maxVal / 10000000) * 10000000;

  // Chart plotting area
  const chartX = 90;
  const chartY = 95;
  const chartW = width - chartX - 40;
  const chartH = height - chartY - 65;

  // Draw Y Axis Gridlines and Labels
  const steps = 5;
  ctx.textAlign = 'right';
  ctx.font = 'normal 11px Helvetica, Arial, sans-serif';
  for (let i = 0; i <= steps; i++) {
    const stepVal = (ceilMax / steps) * i;
    const yPos = chartY + chartH - (i / steps) * chartH;

    // Gridline
    ctx.strokeStyle = i === 0 ? '#94a3b8' : '#f1f5f9';
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(chartX, yPos);
    ctx.lineTo(chartX + chartW, yPos);
    ctx.stroke();

    // Y Label
    ctx.fillStyle = '#64748b';
    ctx.fillText(formatRupiahCompact(stepVal), chartX - 10, yPos + 4);
  }

  // Draw 12 Bars (Stacked)
  const barCount = 12;
  const slotW = chartW / barCount;
  const barW = slotW * 0.58;

  MONTH_NAMES.forEach((mName, idx) => {
    const xPos = chartX + idx * slotW + (slotW - barW) / 2;
    const isPeak =
      highestMonth &&
      highestMonth.monthIndex === idx &&
      highestMonth.total !== null &&
      highestMonth.total > 0;

    // Draw stack from bottom up
    let currentY = chartY + chartH;
    let stackTotal = 0;

    data.forEach((row) => {
      const val = row.values[idx];
      if (val !== null && val > 0) {
        stackTotal += val;
        const segmentH = (val / ceilMax) * chartH;
        currentY -= segmentH;

        ctx.fillStyle = row.color || '#2563eb';
        ctx.beginPath();
        ctx.roundRect(xPos, currentY, barW, segmentH, 2);
        ctx.fill();
      }
    });

    // Draw outline around stack if peak
    if (isPeak) {
      const totalH = (stackTotal / ceilMax) * chartH;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(xPos - 1, chartY + chartH - totalH - 1, barW + 2, totalH + 2);

      // Peak Badge
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(xPos - 10, chartY + chartH - totalH - 24, barW + 20, 18, 4);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 9px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PUNCAK', xPos + barW / 2, chartY + chartH - totalH - 12);
    } else if (stackTotal > 0) {
      // Small total label above bar
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 9px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatRupiahCompact(stackTotal), xPos + barW / 2, currentY - 5);
    }

    // X Axis Month Label
    ctx.fillStyle = isPeak ? '#b45309' : '#334155';
    ctx.font = isPeak
      ? 'bold 12px Helvetica, Arial, sans-serif'
      : 'normal 11px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mName.slice(0, 3), xPos + barW / 2, chartY + chartH + 20);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Generates an offscreen crisp Canvas image for the Proportion Donut Chart
 * with all 4 Quarters summary, identical to PrintReportView.
 */
function createFallbackPieChartImage(
  data: BbmItemRow[],
  year: number,
  grandTotal: number,
  quarters: { name: string; total: number; percentage: number }[]
): string {
  const width = 960;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Chart Title
  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.fillText(`2. Diagram Lingkaran Proporsi BBM (Tahun ${year})`, 32, 40);

  ctx.fillStyle = '#64748b';
  ctx.font = 'normal 13px Helvetica, Arial, sans-serif';
  ctx.fillText('Distribusi alokasi anggaran kumulatif antar pos bahan bakar', 32, 62);

  // Compute row totals
  const items = data.map((item) => {
    const total = item.values.reduce<number>((acc, v) => acc + (v || 0), 0);
    const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
    return {
      name: item.name,
      color: item.color || '#2563eb',
      total,
      percentage: pct,
    };
  });

  // Donut Geometry
  const centerX = 230;
  const centerY = 270;
  const radius = 135;
  const innerRadius = 75;

  let currentAngle = -0.5 * Math.PI;

  items.forEach((item) => {
    const sliceAngle = (item.total / (grandTotal || 1)) * (2 * Math.PI);
    const endAngle = currentAngle + sliceAngle;

    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, currentAngle, true);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    currentAngle = endAngle;
  });

  // Center Donut text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
  ctx.fillText('TOTAL REALISASI', centerX, centerY - 10);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
  ctx.fillText(formatRupiahCompact(grandTotal), centerX, centerY + 14);

  // Right Side: Item Breakdown Cards
  const listX = 460;
  let listY = 95;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
  ctx.fillText('Rincian Alokasi per Jenis Bahan Bakar:', listX, listY);
  listY += 20;

  items.forEach((item) => {
    // Card background
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(listX, listY, 460, 48, 6);
    ctx.fill();
    ctx.stroke();

    // Color bullet
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(listX + 20, listY + 24, 7, 0, 2 * Math.PI);
    ctx.fill();

    // Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
    ctx.fillText(item.name, listX + 38, listY + 29);

    // Amount & Pct
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
    ctx.fillText(formatRupiah(item.total), listX + 380, listY + 29);

    ctx.fillStyle = '#475569';
    ctx.font = 'normal 12px Helvetica, Arial, sans-serif';
    ctx.fillText(`${item.percentage.toFixed(2)}%`, listX + 445, listY + 29);

    ctx.textAlign = 'left';
    listY += 56;
  });

  // 4 Quarters Summary at Bottom Right (All 4 Quarters!)
  listY += 4;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
  ctx.fillText('Realisasi Kumulatif per Triwulan (4 Triwulan):', listX, listY);
  listY += 16;

  // Render 4 Quarters as 4 boxes
  const qBoxW = 108;
  quarters.forEach((q, idx) => {
    const qX = listX + idx * (qBoxW + 8);
    const roman = ['TW I', 'TW II', 'TW III', 'TW IV'][idx];

    ctx.fillStyle = '#eff6ff';
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(qX, listY, qBoxW, 46, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(roman, qX + 8, listY + 16);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
    ctx.fillText(formatRupiahCompact(q.total), qX + 8, listY + 30);

    ctx.fillStyle = '#64748b';
    ctx.font = 'normal 9.5px Helvetica, Arial, sans-serif';
    ctx.fillText(`${q.percentage.toFixed(1)}% prosentase dari total`, qX + 8, listY + 41);
  });

  return canvas.toDataURL('image/png');
}

export function generateOfficialPdf(
  data: BbmItemRow[],
  options: PdfExportOptions,
  barChartBase64?: string | null,
  pieChartBase64?: string | null,
  totalBudget: number = 350000000,
  year: number = 2026
): boolean {
  try {
    const { rowTotals, monthlyTotals, grandTotal, quarters, highestMonth } =
      calculateTotals(data);
    const sisaRealisasi = totalBudget - grandTotal;
    const average1Tahun = grandTotal / 12;

    // Create A4 Landscape PDF (297mm x 210mm)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
    const margin = 10; // 10mm margins

    // --- PAGE 1: KOP, KPI, OFFICIAL RECAP TABLE & 4 TRIWULAN ---
    // 1. Header (Kop Surat)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PEMERINTAH DAERAH', pageWidth / 2, 12, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(
      (options.agencyName || 'DINAS PERUMAHAN DAN KAWASAN PERMUKIMAN').toUpperCase(),
      pageWidth / 2,
      18,
      { align: 'center' }
    );

    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138); // Deep blue
    doc.text(
      (options.title || `LAPORAN REKAPITULASI PENGGUNAAN BBM SEKRETARIAT TAHUN ${year}`).toUpperCase(),
      pageWidth / 2,
      23.5,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Tahun Anggaran ${year} • Dokumen Resmi Pelaporan Realisasi Operasional`,
      pageWidth / 2,
      28,
      { align: 'center' }
    );

    // Divider Line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(margin, 30.5, pageWidth - margin, 30.5);
    doc.setLineWidth(0.2);
    doc.line(margin, 31.5, pageWidth - margin, 31.5);

    // 2. Executive KPI Strip (5 Boxes)
    const kpiY = 34.5;
    const kpiHeight = 14;
    const kpiWidth = (pageWidth - margin * 2 - 12) / 5;

    const highestMonthVal =
      highestMonth && highestMonth.total !== null
        ? `${highestMonth.monthName} (${formatRupiah(highestMonth.total)})`
        : '-';
    const highestMonthSub = highestMonth
      ? `Puncak Bulan ${highestMonth.monthName}`
      : 'Puncak Operasional';

    const kpis = [
      {
        label: 'JUMLAH ANGGARAN',
        value: formatRupiah(totalBudget),
        sub: `Pagu ${year}`,
      },
      {
        label: 'TOTAL REALISASI BBM',
        value: formatRupiah(grandTotal),
        sub: 'Kumulatif 12 Bulan',
      },
      {
        label: 'SISA REALISASI BBM',
        value: formatRupiah(sisaRealisasi),
        sub: sisaRealisasi >= 0 ? 'Saldo Tersedia' : 'Defisit Anggaran',
      },
      {
        label: 'RATA-RATA BULANAN',
        value: formatRupiah(Math.round(average1Tahun)),
        sub: 'Total 1 Tahun',
      },
      {
        label: 'REALISASI TERTINGGI',
        value: highestMonthVal,
        sub: highestMonthSub,
      },
    ];

    kpis.forEach((kpi, idx) => {
      const x = margin + idx * (kpiWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 3, kpiY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.value, x + 3, kpiY + 8.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.sub, x + 3, kpiY + 12);
    });

    // 3. Official Table (Matching PrintReportView: JENIS BBM, 12 Months, JUMLAH KESELURUHAN)
    const tableHeaders = [
      'JENIS BBM',
      ...MONTH_NAMES,
      'JUMLAH KESELURUHAN',
    ];

    const tableRows = data.map((item, idx) => {
      const vals = item.values.map((v) => (v !== null ? formatAngka(v) : '-'));
      return [item.name, ...vals, formatAngka(rowTotals[idx].total)];
    });

    const totalRow = [
      'JUMLAH',
      ...monthlyTotals.map((m) => (m.total !== null ? formatAngka(m.total) : '-')),
      formatAngka(grandTotal),
    ];

    // Table title label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`TABEL REKAPITULASI PENGGUNAAN BBM TAHUN ${year}`, margin, 52.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('(Satuan: Rupiah)', pageWidth - margin, 52.5, { align: 'right' });

    autoTable(doc, {
      startY: 54,
      head: [tableHeaders],
      body: [...tableRows, totalRow],
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        font: 'helvetica',
        lineColor: [30, 41, 59],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 32 },
        1: { halign: 'right', cellWidth: 17.5 },
        2: { halign: 'right', cellWidth: 17.5 },
        3: { halign: 'right', cellWidth: 17.5 },
        4: { halign: 'right', cellWidth: 17.5 },
        5: { halign: 'right', cellWidth: 17.5 },
        6: { halign: 'right', cellWidth: 17.5 },
        7: { halign: 'right', cellWidth: 17.5 },
        8: { halign: 'right', cellWidth: 17.5 },
        9: { halign: 'right', cellWidth: 17.5 },
        10: { halign: 'right', cellWidth: 17.5 },
        11: { halign: 'right', cellWidth: 17.5 },
        12: { halign: 'right', cellWidth: 17.5 },
        13: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 },
      },
      didParseCell: function (dataHook) {
        // Highlight footer row (JUMLAH)
        if (dataHook.row.index === tableRows.length) {
          dataHook.cell.styles.fontStyle = 'bold';
          dataHook.cell.styles.fillColor = [224, 231, 255]; // Soft indigo/blue tint
          dataHook.cell.styles.textColor = [30, 58, 138];
        }
      },
      margin: { left: margin, right: margin },
    });

    // 4. 4 Quarters Summary Cards below table (All 4 Quarters!)
    // @ts-expect-error autoTable adds lastAutoTable to doc
    const finalTableY = doc.lastAutoTable.finalY || 96;

    const qCardY = finalTableY + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`RINGKASAN PERKEMBANGAN SERAPAN 4 TRIWULAN (TA ${year}):`, margin, qCardY);

    const qCardWidth = (pageWidth - margin * 2 - 9) / 4;
    const qLabels = [
      'Triwulan I (Jan - Mar)',
      'Triwulan II (Apr - Jun)',
      'Triwulan III (Jul - Sep)',
      'Triwulan IV (Okt - Des)',
    ];

    quarters.forEach((q, idx) => {
      const qX = margin + idx * (qCardWidth + 3);
      const cardTop = qCardY + 2;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(qX, cardTop, qCardWidth, 13, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      doc.text(qLabels[idx].toUpperCase(), qX + 3, cardTop + 3.8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(q.total), qX + 3, cardTop + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${q.percentage.toFixed(1)}% prosentase dari total`, qX + 3, cardTop + 11.2);
    });

    // 5. Signature Block on Page 1
    const sigY = qCardY + 19;
    const sigX = pageWidth - margin - 65;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(options.reportDate || `Pasuruan, 18 Oktober ${year}`, sigX + 32, sigY, {
      align: 'center',
    });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(options.signatoryTitle || 'Kuasa Pengguna Anggaran', sigX + 32, sigY + 4, {
      align: 'center',
    });
    doc.setFont('helvetica', 'bold');
    doc.text(options.signatoryName || 'H. Syaiful Anwar, S.STP., M.Si.', sigX + 32, sigY + 18, {
      align: 'center',
    });
    doc.setLineWidth(0.3);
    doc.setDrawColor(15, 23, 42);
    doc.line(sigX + 2, sigY + 19, sigX + 62, sigY + 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`NIP. ${options.signatoryNip || '19780512 200501 1 008'}`, sigX + 32, sigY + 22.5, {
      align: 'center',
    });

    // Page 1 footer note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Resmi SiBensin • Dicetak pada: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`,
      margin,
      pageHeight - 6
    );
    doc.text('Halaman 1 dari 2', pageWidth - margin, pageHeight - 6, { align: 'right' });

    // --- PAGE 2: DIAGRAM VISUAL & CATATAN EVALUASI ---
    if (options.includeCharts || options.includeAnalysis) {
      doc.addPage('a4', 'landscape');

      // Page 2 Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('LAMPIRAN DOKUMEN LAPORAN RESMI', pageWidth / 2, 10, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `VISUALISASI DIAGRAM GRAFIK DAN EVALUASI OPERASIONAL BBM TAHUN ${year}`,
        pageWidth / 2,
        15,
        { align: 'center' }
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Pemerintah Daerah • ${options.agencyName || 'Dinas Perumahan dan Kawasan Permukiman'}`,
        pageWidth / 2,
        19,
        { align: 'center' }
      );

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, 21, pageWidth - margin, 21);

      // Embedded Charts
      let currentY = 24;
      const chartColWidth = (pageWidth - margin * 2 - 8) / 2;
      const chartHeight = 84;

      if (options.includeCharts) {
        const effectiveBarImage =
          barChartBase64 || createFallbackBarChartImage(data, year, highestMonth);
        const effectivePieImage =
          pieChartBase64 || createFallbackPieChartImage(data, year, grandTotal, quarters);

        // Bar Chart Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, currentY, chartColWidth, chartHeight + 6, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138);
        doc.text('1. Diagram Batang: Tren Realisasi Bulanan (Tahun ' + year + ')', margin + 4, currentY + 5);

        if (effectiveBarImage) {
          doc.addImage(
            effectiveBarImage,
            'PNG',
            margin + 2.5,
            currentY + 6.5,
            chartColWidth - 5,
            chartHeight - 2
          );
        }

        // Pie Chart Box
        const pieX = margin + chartColWidth + 8;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(pieX, currentY, chartColWidth, chartHeight + 6, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(146, 64, 14);
        doc.text('2. Diagram Lingkaran: Proporsi Penggunaan BBM', pieX + 4, currentY + 5);

        if (effectivePieImage) {
          doc.addImage(
            effectivePieImage,
            'PNG',
            pieX + 2.5,
            currentY + 6.5,
            chartColWidth - 5,
            chartHeight - 2
          );
        }

        currentY += chartHeight + 10;
      }

      // Analytical Notes (5 Points, identical to PrintReportView)
      if (options.includeAnalysis && currentY < pageHeight - 30) {
        const remainingH = pageHeight - currentY - 10;
        const boxH = Math.min(remainingH, 44);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, boxH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(
          `CATATAN EVALUASI DAN ANALISIS OPERASIONAL TAHUN ${year}:`,
          margin + 4,
          currentY + 5
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);

        const highestMonthText =
          highestMonth && highestMonth.total !== null
            ? `4. Puncak realisasi tertinggi tahun ${year} tercatat pada bulan ${highestMonth.monthName} sebesar ${formatRupiah(highestMonth.total)}, dipicu oleh eskalasi kegiatan dinas dan penugasan luar.`
            : '4. Pola serapan bulanan berjalan stabil dan proporsional sepanjang 4 triwulan tahun anggaran ' + year + '.';

        const notes = [
          `1. Total serapan anggaran bahan bakar operasional periode ${year} mencapai ${formatRupiah(grandTotal)} dari pagu ${formatRupiah(totalBudget)}, menyisakan saldo realisasi ${formatRupiah(sisaRealisasi)} dengan rerata bulanan ${formatRupiah(Math.round(average1Tahun))}.`,
          `2. Bahan bakar Pertamax menyerap porsi terbesar (${formatRupiah(rowTotals[0]?.total || 0)}) dengan konsumsi bulanan yang relatif stabil untuk operasional kendaraan dinas pimpinan dan dinas harian.`,
          `3. Pos Dex Kadin (${formatRupiah(rowTotals[1]?.total || 0)}) dan pos Dex Toilet (${formatRupiah(rowTotals[2]?.total || 0)}) mendukung mobilitas armada operasional lapangan dan penugasan kedinasan luar.`,
          highestMonthText,
          `5. Dokumen ini disahkan sebagai laporan pertanggungjawaban realisasi belanja BBM Sekretariat Tahun Anggaran ${year}.`,
        ];

        notes.forEach((note, nIdx) => {
          doc.text(note, margin + 4, currentY + 10.5 + nIdx * 5.2);
        });
      }

      // Page 2 footer note
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Lampiran resmi Laporan Penggunaan BBM Sekretariat Tahun ${year} • Sistem Informasi SiBensin`,
        margin,
        pageHeight - 6
      );
      doc.text('Halaman 2 dari 2', pageWidth - margin, pageHeight - 6, { align: 'right' });
    }

    // Save PDF
    const filename = `Laporan_Penggunaan_BBM_Sekretariat_${year}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating official PDF:', error);
    return false;
  }
}
