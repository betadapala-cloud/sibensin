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
 * guaranteeing chart presence in the PDF report even if DOM canvas is absent.
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
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.fillText(`Tren Realisasi Bulanan Penggunaan BBM Tahun ${year}`, 32, 40);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = 'normal 13px Helvetica, Arial, sans-serif';
  ctx.fillText('Nilai realisasi akumulatif per bulan (Pertamax, Dex Kadin, Dex Toilet)', 32, 62);

  // Legend at top right
  const legendItems = [
    { name: 'Pertamax', color: '#2563eb' },
    { name: 'Dex Kadin', color: '#059669' },
    { name: 'Dex Toilet', color: '#d97706' },
  ];
  let legendX = width - 360;
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
    const isPeak = highestMonth && highestMonth.monthIndex === idx && highestMonth.total !== null && highestMonth.total > 0;

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
        ctx.rect(xPos, currentY, barW, segmentH);
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
    ctx.font = isPeak ? 'bold 12px Helvetica, Arial, sans-serif' : 'normal 11px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mName.slice(0, 3), xPos + barW / 2, chartY + chartH + 20);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Generates an offscreen crisp Canvas image for the Proportion Donut Chart
 * guaranteeing chart presence in the PDF report even if DOM canvas is absent.
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
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.fillText(`Proporsi Penggunaan BBM Tahun ${year}`, 32, 40);

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
  let listY = 100;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
  ctx.fillText('Rincian Komposisi Bahan Bakar:', listX, listY);
  listY += 20;

  items.forEach((item) => {
    // Card background
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(listX, listY, 460, 52, 6);
    ctx.fill();
    ctx.stroke();

    // Color bullet
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(listX + 22, listY + 26, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
    ctx.fillText(item.name, listX + 40, listY + 31);

    // Amount & Pct
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
    ctx.fillText(formatRupiah(item.total), listX + 380, listY + 31);

    ctx.fillStyle = '#475569';
    ctx.font = 'normal 12px Helvetica, Arial, sans-serif';
    ctx.fillText(`${item.percentage.toFixed(2)}%`, listX + 445, listY + 31);

    ctx.textAlign = 'left';
    listY += 60;
  });

  // Quarterly Summary at Bottom Right
  listY += 5;
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
  ctx.fillText('Ringkasan Serapan per Triwulan:', listX, listY);
  listY += 18;

  quarters.slice(0, 3).forEach((q) => {
    ctx.fillStyle = '#475569';
    ctx.font = 'normal 11.5px Helvetica, Arial, sans-serif';
    ctx.fillText(`${q.name}:`, listX, listY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11.5px Helvetica, Arial, sans-serif';
    ctx.fillText(`${formatRupiah(q.total)} (${q.percentage.toFixed(1)}%)`, listX + 445, listY);
    ctx.textAlign = 'left';

    listY += 18;
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

    const pageWidth = doc.internal.pageSize.getWidth(); // 297
    const pageHeight = doc.internal.pageSize.getHeight(); // 210
    const margin = 14;

    // --- PAGE 1: KOP, KPI, & OFFICIAL RECAP TABLE ---
    // 1. Header (Kop Surat)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('PEMERINTAH DAERAH', pageWidth / 2, 14, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text((options.agencyName || 'DINAS PERUMAHAN DAN KAWASAN PERMUKIMAN').toUpperCase(), pageWidth / 2, 21, {
      align: 'center',
    });

    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138); // Deep blue
    doc.text((options.title || `LAPORAN REKAPITULASI PENGGUNAAN BBM SEKRETARIAT TAHUN ${year}`).toUpperCase(), pageWidth / 2, 27, {
      align: 'center',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tahun Anggaran ${year} • Dokumen Resmi Pelaporan Realisasi Operasional`, pageWidth / 2, 32, {
      align: 'center',
    });

    // Divider Line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(margin, 35, pageWidth - margin, 35);
    doc.setLineWidth(0.2);
    doc.line(margin, 36, pageWidth - margin, 36);

    // 2. Executive KPI Strip (5 Boxes) - DYNAMIC HIGHEST REALIZATION
    const kpiY = 40;
    const kpiHeight = 16;
    const kpiWidth = (pageWidth - margin * 2 - 12) / 5;

    const highestMonthVal = highestMonth && highestMonth.total !== null ? formatRupiah(highestMonth.total) : '-';
    const highestMonthSub = highestMonth ? `Bulan ${highestMonth.monthName}` : 'Puncak Operasional';

    const kpis = [
      {
        label: 'JUMLAH ANGGARAN',
        value: formatRupiah(totalBudget),
        sub: `Pagu Anggaran ${year}`,
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
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 3.5, kpiY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.value, x + 3.5, kpiY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.sub, x + 3.5, kpiY + 14);
    });

    // 3. Official Table
    const tableHeaders = [
      'BULAN',
      ...MONTH_NAMES,
      'JUMLAH\nKESELURUHAN',
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

    autoTable(doc, {
      startY: 60,
      head: [tableHeaders],
      body: [...tableRows, totalRow],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        font: 'helvetica',
        lineColor: [203, 213, 225],
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
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 26 },
        1: { halign: 'right', cellWidth: 18.5 },
        2: { halign: 'right', cellWidth: 18.5 },
        3: { halign: 'right', cellWidth: 18.5 },
        4: { halign: 'right', cellWidth: 18.5 },
        5: { halign: 'right', cellWidth: 18.5 },
        6: { halign: 'right', cellWidth: 18.5 },
        7: { halign: 'right', cellWidth: 18.5 },
        8: { halign: 'right', cellWidth: 18.5 },
        9: { halign: 'right', cellWidth: 18.5 },
        10: { halign: 'right', cellWidth: 16.5 },
        11: { halign: 'right', cellWidth: 16.5 },
        12: { halign: 'right', cellWidth: 16.5 },
        13: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 26 },
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

    // 4. Quarterly Summary & Observations on Page 1
    // @ts-expect-error autoTable adds lastAutoTable to doc
    const finalTableY = doc.lastAutoTable.finalY || 105;

    // Small summary of Quarters below table
    const qSummaryY = finalTableY + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Ringkasan Realisasi per Triwulan:', margin, qSummaryY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const qText = `• Triwulan I (Jan-Mar): ${formatRupiah(quarters[0].total)} (${quarters[0].percentage.toFixed(1)}%)   |   ` +
      `• Triwulan II (Apr-Jun): ${formatRupiah(quarters[1].total)} (${quarters[1].percentage.toFixed(1)}%)   |   ` +
      `• Triwulan III (Jul-Sep): ${formatRupiah(quarters[2].total)} (${quarters[2].percentage.toFixed(1)}%)`;
    doc.text(qText, margin, qSummaryY + 4.5);

    // Signature Block on Page 1
    const sigY = qSummaryY + 12;
    const sigX = pageWidth - margin - 60;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(options.reportDate || `Pasuruan, 18 Oktober ${year}`, sigX + 30, sigY, {
      align: 'center',
    });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(options.signatoryTitle || 'Kuasa Pengguna Anggaran', sigX + 30, sigY + 4.5, {
      align: 'center',
    });
    doc.setFont('helvetica', 'bold');
    doc.text(options.signatoryName || 'H. Syaiful Anwar, S.STP., M.Si.', sigX + 30, sigY + 22, {
      align: 'center',
    });
    doc.setLineWidth(0.3);
    doc.setDrawColor(15, 23, 42);
    doc.line(sigX + 2, sigY + 23, sigX + 58, sigY + 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`NIP. ${options.signatoryNip || '19780512 200501 1 008'}`, sigX + 30, sigY + 26.5, {
      align: 'center',
    });

    // --- PAGE 2: DIAGRAM VISUAL & CATATAN EVALUASI ---
    if (options.includeCharts || options.includeAnalysis) {
      doc.addPage('a4', 'landscape');

      // Page 2 Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('LAMPIRAN DIAGRAM VISUAL DAN CATATAN EVALUASI OPERASIONAL', pageWidth / 2, 14, {
        align: 'center',
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Visualisasi Grafis Realisasi Penggunaan Bahan Bakar Minyak (BBM) Tahun ${year}`, pageWidth / 2, 19, {
        align: 'center',
      });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, 22, pageWidth - margin, 22);

      // Embedded Charts
      let currentY = 26;
      const chartColWidth = (pageWidth - margin * 2 - 8) / 2;
      const chartHeight = 88;

      if (options.includeCharts) {
        // Ensure robust chart images even if DOM canvas is not present
        const effectiveBarImage =
          barChartBase64 || createFallbackBarChartImage(data, year, highestMonth);
        const effectivePieImage =
          pieChartBase64 || createFallbackPieChartImage(data, year, grandTotal, quarters);

        // Bar Chart Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, currentY, chartColWidth, chartHeight + 8, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 58, 138);
        doc.text('1. Diagram Batang: Tren Realisasi Bulanan (Rp)', margin + 4, currentY + 5.5);

        if (effectiveBarImage) {
          doc.addImage(
            effectiveBarImage,
            'PNG',
            margin + 3,
            currentY + 7,
            chartColWidth - 6,
            chartHeight - 1
          );
        }

        // Pie Chart Box
        const pieX = margin + chartColWidth + 8;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(pieX, currentY, chartColWidth, chartHeight + 8, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9);
        doc.text('2. Diagram Lingkaran: Proporsi Penggunaan BBM', pieX + 4, currentY + 5.5);

        if (effectivePieImage) {
          doc.addImage(
            effectivePieImage,
            'PNG',
            pieX + 3,
            currentY + 7,
            chartColWidth - 6,
            chartHeight - 1
          );
        }

        currentY += chartHeight + 12;
      }

      // Analytical Notes - DYNAMIC HIGHEST REALIZATION
      if (options.includeAnalysis && currentY < pageHeight - 32) {
        const remainingH = pageHeight - currentY - 12;
        const boxH = Math.min(remainingH, 42);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, boxH, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text('POKOK EVALUASI DAN CATATAN OPERASIONAL:', margin + 5, currentY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);

        const highestMonthText = highestMonth && highestMonth.total !== null
          ? `4. Puncak realisasi tertinggi tahun ${year} tercatat pada bulan ${highestMonth.monthName} sebesar ${formatRupiah(highestMonth.total)}, dipicu oleh intensitas mobilitas armada operasional lapangan.`
          : '4. Pola realisasi bulanan operasional berjalan stabil dan terkendali sesuai perencanaan kegiatan.';

        const notes = [
          `1. Total realisasi anggaran BBM tahun ${year} tercatat sebesar ${formatRupiah(grandTotal)} dari pagu ${formatRupiah(totalBudget)}, menyisakan sisa realisasi ${formatRupiah(sisaRealisasi)} dengan rerata ${formatRupiah(Math.round(average1Tahun))} per bulan (total 1 tahun).`,
          `2. Pos Pertamax merupakan pos pemakaian terbesar kumulatif (${formatRupiah(rowTotals[0]?.total || 0)}) dengan konsumsi relatif stabil setiap bulannya.`,
          `3. Pos Dex Kadin membukukan realisasi ${formatRupiah(rowTotals[1]?.total || 0)} dan Pos Dex Toilet membukukan ${formatRupiah(rowTotals[2]?.total || 0)}.`,
          highestMonthText,
          `5. Dokumen ini disahkan sebagai laporan pertanggungjawaban realisasi belanja BBM Sekretariat Tahun Anggaran ${year}.`,
        ];

        notes.forEach((note, nIdx) => {
          doc.text(note, margin + 5, currentY + 11 + nIdx * 5.5);
        });
      }

      // Page 2 footer note
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Dokumen ini digenerate secara otomatis oleh SiBensin Tahun ${year}.`, margin, pageHeight - 5);
      doc.text('Halaman 2 dari 2', pageWidth - margin, pageHeight - 5, { align: 'right' });
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
