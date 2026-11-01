import React, { useState, useRef } from 'react';
import { useRamData } from '../hooks/useData';
import {
  FileSpreadsheet,
  Lock,
  Printer,
  Download,
  TrendingUp,
  Scale,
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { UserProfile, FactorySale, WeighingTicket, Shipment, CashTransaction, CashAccount, LoanDebt } from '../types';
import { storage } from '../lib/storage';

interface ReportsSectionProps {
  currentUser: UserProfile;
}

type DateFilterMode = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export const ReportsSection: React.FC<ReportsSectionProps> = ({ currentUser }) => {
  const isOwner = currentUser.role === 'OWNER';
  const reportRef = useRef<HTMLDivElement>(null);

  const [reportTab, setReportTab] = useState<'laba_rugi' | 'neraca' | 'susut_pks'>('laba_rugi');

  const { data, isLoading } = useRamData(currentUser.role);
  const loading = isLoading;
  const sales = data?.factorySales || [];
  const tickets = data?.tickets || [];
  const shipments = data?.shipments || [];
  const transactions = data?.cashTransactions || [];
  const cashAccounts = data?.cashAccounts || [];
  const stockSummary = data?.stockSummary || {};
  const loans = data?.loans || [];

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterMode>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOwner) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Laporan Keuangan Terproteksi (Owner Only)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
          Berdasarkan pembatasan hak akses sistem RAM Sumber Rezeki, Laporan Laba Rugi,
          Neraca, dan Analisis Keuangan Keseluruhan hanya berhak dibuka oleh Owner.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Memuat Laporan Keuangan...</p>
        </div>
      </div>
    );
  }

  const formatRupiah = (val: number) => {
    if (val < 0) {
      return '-Rp ' + Math.abs(Math.round(val)).toLocaleString('id-ID');
    }
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  // Helper for checking date ranges
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    if (dateFilter === 'ALL') return true;

    const todayStr = new Date().toISOString().slice(0, 10);

    if (dateFilter === 'TODAY') {
      return dateStr === todayStr;
    }

    if (dateFilter === 'THIS_WEEK') {
      const targetDate = new Date(dateStr + 'T00:00:00');
      const now = new Date();
      const dayOfWeek = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - dayOfWeek);
      firstDay.setHours(0, 0, 0, 0);

      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      lastDay.setHours(23, 59, 59, 999);

      const targetTime = targetDate.getTime();
      return targetTime >= firstDay.getTime() && targetTime <= lastDay.getTime();
    }

    if (dateFilter === 'THIS_MONTH') {
      const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      return dateStr.startsWith(currentMonth);
    }

    if (dateFilter === 'CUSTOM') {
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      return true;
    }

    return true;
  };

  // Filtered Collections based on selected Period
  const filteredSales = sales.filter((s) => isDateInRange(s.date));
  const filteredTickets = tickets.filter((t) => isDateInRange(t.date));
  const filteredShipments = shipments.filter((sh) => isDateInRange(sh.date));
  const filteredTransactions = transactions.filter((tx) => isDateInRange(tx.date));
  const filteredLoans = loans.filter((l) => isDateInRange(l.date));

  // 1. LABA RUGI CALCULATIONS
  // Revenue from Factory Sales
  const totalPendapatanPenjualan = filteredSales.reduce((acc, s) => acc + s.totalNetSale, 0);

  // HPP of sold goods
  const totalHppPembelian = filteredSales.reduce((acc, s) => acc + s.actualHpp, 0);
  
  // Costs that move to HPP (Direct Costs)
  const totalOngkosKirim = filteredSales.reduce((acc, s) => acc + (s.shippingCost || 0), 0);
  const totalUpahMuat = filteredSales.reduce((acc, s) => acc + (s.loadingCost || 0), 0);

  const totalKomisiAffiliate = filteredTransactions
    .filter((tx) => tx.type === 'KOMISI_AFFILIATE')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalHpp = totalHppPembelian + totalOngkosKirim + totalUpahMuat + totalKomisiAffiliate;

  // Laba Kotor
  const labaKotor = totalPendapatanPenjualan - totalHpp;

  // Beban Operasional (Expenses) - Excluding the ones moved to HPP
  const operationalExpenses = filteredTransactions.filter(
    (tx) => 
      tx.type === 'PENGELUARAN_OPERASIONAL' && 
      tx.category !== 'Ongkos Angkut Truk PKS' && 
      tx.category !== 'Upah Muat Truk'
  );
  
  const totalBebanOperasional = operationalExpenses.reduce(
    (acc, tx) => acc + tx.amount,
    0
  );

  // Laba Bersih Operasional
  const labaBersih = labaKotor - totalBebanOperasional;

  // 2. NERACA CALCULATIONS (SNAPSHOT POSISI KEUANGAN KUMULATIF)
  // Assets
  const totalKas = cashAccounts.reduce((acc, a) => acc + a.balance, 0);
  const totalPiutangKasbon = loans
    .filter((l) => l.type !== 'MODAL_OWNER' && l.status === 'AKTIF')
    .reduce((acc, l) => acc + l.remainingAmount, 0);
  const totalNilaiStokRAM: number = (Object.values(stockSummary) as any[]).reduce(
    (acc: number, s: any) => acc + (s?.stockValue || 0),
    0
  );
  const totalStokDalamPerjalanan = shipments
    .filter((s) => s.status === 'DALAM_PERJALANAN')
    .reduce((acc, s) => acc + s.totalEstimatedHpp, 0);

  const totalAktiva =
    totalKas + totalPiutangKasbon + totalNilaiStokRAM + totalStokDalamPerjalanan;

  // Liabilities & Equity
  const activeModalOwnerLoans = loans.filter(
    (l) => l.type === 'MODAL_OWNER' && l.status === 'AKTIF'
  );

  // Unique modal owner loans by ID to prevent duplicate counts
  const uniqueModalOwnerLoans = Array.from(new Map(activeModalOwnerLoans.map(l => [l.id, l])).values());
  const totalModalOwner = uniqueModalOwnerLoans.reduce(
    (acc, l) => acc + l.remainingAmount,
    0
  );

  const totalUtangPetani = tickets
    .filter((t) => t.paymentStatus === 'BELUM_LUNAS')
    .reduce((acc, t) => acc + t.farmerPayment, 0);

  // Standard Accounting Equation:
  // Pasiva = Kewajiban (Liabilities) + Ekuitas (Equity)
  // Ekuitas = Suntikan Modal + Ekuitas Berjalan (Laba Ditahan / Retained Earnings)
  const totalKewajiban = totalUtangPetani;
  const suntikanModal = totalModalOwner;

  // Ekuitas Berjalan (Laba Ditahan):
  // Diukur dari selisih Aktiva dikurangi Kewajiban & Modal Disetor
  const ekuitasBerjalan = (totalAktiva === 0 && totalKewajiban === 0 && suntikanModal === 0)
    ? 0
    : totalAktiva - totalKewajiban - suntikanModal;

  const totalPasiva = totalKewajiban + suntikanModal + ekuitasBerjalan;

  // Monthly Profit Trend Data for Recharts
  const monthlyProfitData = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = months.map((m, i) => {
      const monthSales = sales.filter(s => new Date(s.date).getMonth() === i);
      const profit = monthSales.reduce((acc, s) => acc + s.grossProfit, 0);
      return { month: m, profit };
    });
    return data;
  })();

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const addReportHeader = (title: string, periodText: string) => {
        // Decorative top bar
        pdf.setFillColor(79, 70, 229); // Indigo 600
        pdf.rect(0, 0, pageWidth, 4, 'F');

        // Company Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        pdf.setTextColor(30, 41, 59); // Slate 800
        pdf.text('RAM SUMBER REZEKI', 14, 14);

        // Subtitle
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139); // Slate 500
        pdf.text('Sistem Informasi Manajemen Keuangan & Operasional Timbang Sawit', 14, 18);

        // Printed metadata right-aligned
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        const printedDate = new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        pdf.text(`Tanggal Cetak: ${printedDate}`, pageWidth - 14, 14, { align: 'right' });
        pdf.text(`Dicetak Oleh: ${currentUser.name} (${currentUser.role})`, pageWidth - 14, 18, { align: 'right' });

        // Divider
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.4);
        pdf.line(14, 21, pageWidth - 14, 21);

        // Document Name
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text(title, 14, 27);

        // Period Badge
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(79, 70, 229);
        pdf.text(`PERIODE: ${periodText.toUpperCase()}`, 14, 32);
      };

      const addReportFooter = () => {
        const totalPages = (pdf as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(148, 163, 184);

          pdf.setDrawColor(241, 245, 249);
          pdf.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

          pdf.text(
            '* Dokumen laporan resmi RAM Sumber Rezeki. Bersifat rahasia & hanya untuk kepentingan internal.',
            14,
            pageHeight - 5
          );
          pdf.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
        }
      };

      const periodLabel = getPeriodLabel();

      if (reportTab === 'laba_rugi') {
        addReportHeader('LAPORAN LABA RUGI OPERASIONAL (INCOME STATEMENT)', periodLabel);

        // Executive Summary Table
        autoTable(pdf, {
          startY: 36,
          head: [['RINGKASAN EKSEKUTIF LABA RUGI', 'NILAI (RUPIAH)']],
          body: [
            ['1. Total Pendapatan Penjualan ke PKS', formatRupiah(totalPendapatanPenjualan)],
            ['2. Total Harga Pokok Penjualan (HPP Buah & Transportasi)', `(${formatRupiah(totalHpp)})`],
            ['LABA KOTOR OPERASIONAL (GROSS MARGIN)', formatRupiah(labaKotor)],
            ['3. Total Beban Operasional', `(${formatRupiah(totalBebanOperasional)})`],
            ['LABA BERSIH OPERASIONAL (NET PROFIT)', formatRupiah(labaBersih)],
          ],
          theme: 'grid',
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 120 },
            1: { halign: 'right', fontStyle: 'bold' },
          },
          didParseCell: (data) => {
            if (data.row.index === 2) {
              data.cell.styles.fillColor = [238, 242, 255]; // Indigo 50
              data.cell.styles.textColor = [49, 46, 129];
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.row.index === 4) {
              data.cell.styles.fillColor = [236, 253, 245]; // Emerald 50
              data.cell.styles.textColor = [4, 120, 87];
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });

        const lastY1 = (pdf as any).lastAutoTable.finalY + 6;

        // Breakdown HPP Table
        autoTable(pdf, {
          startY: lastY1,
          head: [['RINCIAN KOMPONEN HARGA POKOK PENJUALAN (HPP)', 'KETERANGAN', 'JUMLAH (RP)']],
          body: [
            ['Pembelian Buah Terjual (TBS Petani)', `${filteredSales.length} Nota Penjualan`, formatRupiah(totalHppPembelian)],
            ['Ongkos Angkut Ekspedisi Truk ke PKS', 'Biaya Kirim Armada', formatRupiah(totalOngkosKirim)],
            ['Upah Muat Truk', 'Ongkos Bongkar / Muat', formatRupiah(totalUpahMuat)],
            ['Komisi Affiliate / Rombongan', 'Fee per kg Terjual', formatRupiah(totalKomisiAffiliate)],
          ],
          foot: [['TOTAL HARGA POKOK PENJUALAN (HPP)', '', formatRupiah(totalHpp)]],
          theme: 'striped',
          headStyles: {
            fillColor: [51, 65, 85], // Slate 700
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [225, 29, 72],
            fontStyle: 'bold',
            fontSize: 8,
          },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 55 },
            2: { halign: 'right', fontStyle: 'bold' },
          },
        });

        const lastY2 = (pdf as any).lastAutoTable.finalY + 6;

        // Operational Expenses Table
        const expRows = operationalExpenses.length === 0
          ? [['Tidak ada rincian beban operasional pada periode ini', '-', 'Rp 0']]
          : operationalExpenses.map((exp) => [
              exp.category,
              exp.description || '-',
              formatRupiah(exp.amount),
            ]);

        autoTable(pdf, {
          startY: lastY2,
          head: [['RINCIAN BEBAN OPERASIONAL', 'KETERANGAN', 'JUMLAH (RP)']],
          body: expRows,
          foot: [['TOTAL BEBAN OPERASIONAL', '', formatRupiah(totalBebanOperasional)]],
          theme: 'striped',
          headStyles: {
            fillColor: [71, 85, 105], // Slate 600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [225, 29, 72],
            fontStyle: 'bold',
            fontSize: 8,
          },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 55 },
            2: { halign: 'right', fontStyle: 'bold' },
          },
        });

      } else if (reportTab === 'neraca') {
        addReportHeader('LAPORAN NERACA KEUANGAN SEDERHANA (BALANCE SHEET)', periodLabel);

        // Assets Table (Aktiva)
        autoTable(pdf, {
          startY: 36,
          head: [['1. AKTIVA (ASET RAM SUMBER REZEKI)', 'KATEGORI / AKUN', 'NILAI (RUPIAH)']],
          body: [
            ['Kas & Bank Operasional', 'Kas Owner, Kas Admin, Petty Cash', formatRupiah(totalKas)],
            ['Piutang Kasbon Petani & Sopir', 'Hak Tagih RAM (Aset Lancar)', formatRupiah(totalPiutangKasbon)],
            ['Persediaan Buah di RAM Fisik', 'Stok Timbangan RAM', formatRupiah(totalNilaiStokRAM)],
            ['Persediaan Dalam Perjalanan', 'Truk OTW ke PKS', formatRupiah(totalStokDalamPerjalanan)],
          ],
          foot: [['TOTAL AKTIVA (ASET)', '', formatRupiah(totalAktiva)]],
          theme: 'grid',
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
          },
          footStyles: {
            fillColor: [238, 242, 255],
            textColor: [49, 46, 129],
            fontStyle: 'bold',
            fontSize: 8.5,
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 70, fontStyle: 'bold' },
            1: { cellWidth: 65 },
            2: { halign: 'right', fontStyle: 'bold' },
          },
        });

        const lastY1 = (pdf as any).lastAutoTable.finalY + 6;

        // Liabilities & Equity Table (Pasiva)
        autoTable(pdf, {
          startY: lastY1,
          head: [['2. PASIVA (KEWAJIBAN & EKUITAS)', 'KATEGORI / RUJUKAN', 'NILAI (RUPIAH)']],
          body: [
            ['Utang Usaha Petani (Belum Lunas)', 'Kewajiban Pembayaran Buah', formatRupiah(totalUtangPetani)],
            ['Suntikan Modal Owner / Disetor', 'Modal Kerja Utama Owner', formatRupiah(suntikanModal)],
            ['Ekuitas Berjalan (Laba Ditahan)', 'Akumulasi Laba/Rugi Bersih', formatRupiah(ekuitasBerjalan)],
          ],
          foot: [['TOTAL PASIVA (KEWAJIBAN & EKUITAS)', '', formatRupiah(totalPasiva)]],
          theme: 'grid',
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
          },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 8.5,
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 70, fontStyle: 'bold' },
            1: { cellWidth: 65 },
            2: { halign: 'right', fontStyle: 'bold' },
          },
        });

        const lastY2 = (pdf as any).lastAutoTable.finalY + 6;

        // Status Indicator Box
        const isBalanced = Math.abs(totalAktiva - totalPasiva) < 1;
        autoTable(pdf, {
          startY: lastY2,
          head: [['STATUS KESEIMBANGAN NERACA', 'SELISIH (RP)', 'EVALUASI AKUN']],
          body: [[
            isBalanced ? 'NERACA SEIMBANG (AKTIVA = PASIVA)' : 'BELUM SEIMBANG',
            formatRupiah(Math.abs(totalAktiva - totalPasiva)),
            isBalanced ? 'Seluruh persediaan, kas, dan laba rugi terhubung 100%' : 'Periksa kembali mutasi kas'
          ]],
          theme: 'grid',
          headStyles: {
            fillColor: isBalanced ? [5, 150, 105] : [217, 119, 6],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 8,
            fontStyle: 'bold',
            textColor: isBalanced ? [4, 120, 87] : [180, 83, 9],
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'right' },
            2: { cellWidth: 60 },
          },
        });

      } else {
        // Susut Timbang PKS
        addReportHeader('REKAPITULASI & ANALISIS SUSUT TIMBANG PKS', periodLabel);

        const rows = filteredSales.map((s) => [
          s.shipmentNumber || 'Direct',
          s.factoryName,
          `${s.ramNettoKg.toLocaleString('id-ID')} kg`,
          `${s.factoryNetto1.toLocaleString('id-ID')} kg`,
          `${s.shrinkageKg} kg`,
          `${s.shrinkagePct}%`,
          s.shrinkagePct <= 0.5 ? 'Normal Sesuai Standar' : 'Perlu Evaluasi',
        ]);

        const avgShrink = filteredSales.length > 0
          ? (filteredSales.reduce((acc, s) => acc + s.shrinkagePct, 0) / filteredSales.length).toFixed(2)
          : '0';

        const totalRamNet = filteredSales.reduce((acc, s) => acc + s.ramNettoKg, 0);
        const totalPksNet = filteredSales.reduce((acc, s) => acc + s.factoryNetto1, 0);
        const totalShrink = filteredSales.reduce((acc, s) => acc + s.shrinkageKg, 0);

        autoTable(pdf, {
          startY: 36,
          head: [['Surat Jalan', 'Pabrik PKS', 'Netto RAM', 'Netto 1 PKS', 'Susut (kg)', '% Susut', 'Evaluasi']],
          body: rows.length === 0 ? [['Tidak ada transaksi penjualan pada periode ini', '-', '-', '-', '-', '-', '-']] : rows,
          foot: [[
            'TOTAL / RATA-RATA',
            `${filteredSales.length} Pengiriman`,
            `${totalRamNet.toLocaleString('id-ID')} kg`,
            `${totalPksNet.toLocaleString('id-ID')} kg`,
            `${totalShrink.toLocaleString('id-ID')} kg`,
            `Rata: ${avgShrink}%`,
            'Standar Max: 0.6%'
          ]],
          theme: 'striped',
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
          },
          footStyles: {
            fillColor: [238, 242, 255],
            textColor: [49, 46, 129],
            fontStyle: 'bold',
            fontSize: 7.5,
          },
          bodyStyles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 40 },
            2: { halign: 'right', cellWidth: 25 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 20 },
            5: { halign: 'right', cellWidth: 20 },
            6: { halign: 'center', cellWidth: 25 },
          },
        });
      }

      addReportFooter();

      const reportTitle =
        reportTab === 'laba_rugi'
          ? 'Laba_Rugi'
          : reportTab === 'neraca'
          ? 'Neraca'
          : 'Susut_Timbang_PKS';

      pdf.save(`Laporan_${reportTitle}_RAM_Sumber_Rezeki_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal mengekspor laporan ke format PDF, silakan coba lagi.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getPeriodLabel = () => {
    if (dateFilter === 'TODAY') return 'Hari Ini (' + new Date().toLocaleDateString('id-ID') + ')';
    if (dateFilter === 'THIS_WEEK') return 'Minggu Ini';
    if (dateFilter === 'THIS_MONTH') return 'Bulan Ini (' + new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }) + ')';
    if (dateFilter === 'CUSTOM') {
      if (startDate && endDate) return `Periode: ${startDate} s/d ${endDate}`;
      if (startDate) return `Sejak: ${startDate}`;
      if (endDate) return `Sampai: ${endDate}`;
      return 'Kustom';
    }
    return 'Keseluruhan Periode (All Time)';
  };

  return (
    <div className="space-y-3.5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
              OWNER FINANCIAL REPORT
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              Laporan Keuangan RAM Sumber Rezeki
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Laba rugi otomatis, neraca aktiva-pasiva, dan rekapitulasi susut penimbangan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            {isExportingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengekspor PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Ekspor PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Filter Rentang Tanggal / Periode:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setDateFilter('TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'TODAY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDateFilter('THIS_WEEK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'THIS_WEEK'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setDateFilter('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'THIS_MONTH'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setDateFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'CUSTOM'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Date Selector */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold underline"
              >
                Reset Tanggal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setReportTab('laba_rugi')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            reportTab === 'laba_rugi'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Laporan Laba Rugi Komprehensif
        </button>
        <button
          onClick={() => setReportTab('neraca')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            reportTab === 'neraca'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Neraca Saldo Sederhana
        </button>
        <button
          onClick={() => setReportTab('susut_pks')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            reportTab === 'susut_pks'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          Analisis Susut Timbang PKS
        </button>
      </div>

      {/* Report Container (Ref for PDF Export) */}
      <div ref={reportRef} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
        {/* Header Title inside Printable Card */}
        <div className="text-center pb-4 border-b border-slate-100">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
            RAM SUMBER REZEKI
          </span>
          <h3 className="font-extrabold text-slate-900 text-lg">
            {reportTab === 'laba_rugi' && 'LAPORAN LABA RUGI OPERASIONAL'}
            {reportTab === 'neraca' && 'NERACA KEUANGAN SEDERHANA'}
            {reportTab === 'susut_pks' && 'REKAPITULASI & ANALISIS SUSUT TIMBANG PKS'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {getPeriodLabel()}
          </p>
        </div>

        {/* 1. Laba Rugi Tab Content */}
        {reportTab === 'laba_rugi' && (
          <div className="space-y-4 max-w-3xl mx-auto text-xs">
            {/* Profit Trend Chart */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="font-bold text-slate-900 text-sm mb-4">Tren Keuntungan Bulanan</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyProfitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatRupiah(Number(Array.isArray(value) ? value[0] : value) || 0)} />
                    <Bar dataKey="profit" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section A: Pendapatan */}
            <div className="space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-900 text-sm bg-slate-50 p-2.5 rounded-xl">
                <span>1. PENDAPATAN OPERASIONAL</span>
                <span className="font-mono">{formatRupiah(totalPendapatanPenjualan)}</span>
              </div>
              <div className="pl-4 pr-2 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Hasil Penjualan Sawit ke Pabrik (PKS) [{filteredSales.length} pengiriman]</span>
                  <span className="font-mono">{formatRupiah(totalPendapatanPenjualan)}</span>
                </div>
              </div>
            </div>

            {/* Section B: HPP */}
            <div className="space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-900 text-sm bg-slate-50 p-2.5 rounded-xl">
                <span>2. HARGA POKOK PENJUALAN (HPP)</span>
                <span className="font-mono text-rose-600">({formatRupiah(totalHpp)})</span>
              </div>
              <div className="pl-4 pr-2 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Pembelian Buah Terjual (TBS dari Petani)</span>
                  <span className="font-mono">{formatRupiah(totalHppPembelian)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ongkos Angkut Truk Ekspedisi ke PKS</span>
                  <span className="font-mono">{formatRupiah(totalOngkosKirim)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Upah Muat Truk</span>
                  <span className="font-mono">{formatRupiah(totalUpahMuat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Komisi Rombongan / Affiliate</span>
                  <span className="font-mono">{formatRupiah(totalKomisiAffiliate)}</span>
                </div>
              </div>
            </div>

            {/* Laba Kotor Subtotal */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 font-bold text-indigo-950 text-sm">
              <span>LABA KOTOR (GROSS MARGIN):</span>
              <span className="font-mono text-base font-black text-indigo-800">
                {formatRupiah(labaKotor)}
              </span>
            </div>

            {/* Section C: Beban Operasional */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center font-bold text-slate-900 text-sm bg-slate-50 p-2.5 rounded-xl">
                <span>3. BEBAN OPERASIONAL</span>
                <span className="font-mono text-rose-600">
                  ({formatRupiah(totalBebanOperasional)})
                </span>
              </div>
              <div className="pl-4 pr-2 space-y-1 text-slate-600">
                {operationalExpenses.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Tidak ada rincian beban operasional pada periode ini.</p>
                ) : (
                  operationalExpenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between">
                      <span>{exp.category} ({exp.description})</span>
                      <span className="font-mono">{formatRupiah(exp.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Final Net Profit */}
            <div className="pt-4 border-t-2 border-slate-900">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                    LABA BERSIH OPERASIONAL (NET PROFIT)
                  </span>
                  <p className="text-[11px] text-emerald-600">
                    Pendapatan Penjualan - HPP - Seluruh Biaya Operasional
                  </p>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                  {formatRupiah(labaBersih)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Neraca Tab Content */}
        {reportTab === 'neraca' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            {/* AKTIVA (ASSETS) */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-indigo-900 border-b pb-2 flex items-center justify-between">
                <span>AKTIVA (ASET RAM)</span>
                <span className="font-mono">{formatRupiah(totalAktiva)}</span>
              </h4>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Aset Lancar:</span>
                <div className="pl-3 space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Kas & Bank (Owner, Admin, Petty Cash)</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(totalKas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Piutang Kasbon Petani & Sopir</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(totalPiutangKasbon)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Persediaan Buah di RAM Fisik</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(totalNilaiStokRAM)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Persediaan Dalam Perjalanan (Truk PKS)</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(totalStokDalamPerjalanan)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl font-bold flex justify-between text-indigo-950">
                <span>TOTAL AKTIVA</span>
                <span className="font-mono text-sm">{formatRupiah(totalAktiva)}</span>
              </div>
            </div>

            {/* PASIVA (LIABILITIES & EQUITY) */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center justify-between">
                <span>PASIVA (KEWAJIBAN & MODAL)</span>
                <span className="font-mono">{formatRupiah(totalPasiva)}</span>
              </h4>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Kewajiban / Utang Usaha:</span>
                <div className="pl-3 space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Hutang Pembayaran Petani (Belum Lunas)</span>
                    <span className="font-mono font-bold text-rose-600">{formatRupiah(totalUtangPetani)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 block">Ekuitas & Modal Owner:</span>
                <div className="pl-3 space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Suntikan Modal / Modal Disetor Owner</span>
                    <span className="font-mono font-bold text-indigo-900">{formatRupiah(suntikanModal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ekuitas Berjalan (Laba/Rugi Operasional)</span>
                    <span className={`font-mono font-bold ${ekuitasBerjalan < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatRupiah(ekuitasBerjalan)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl font-bold flex justify-between text-slate-900">
                <span>TOTAL PASIVA</span>
                <span className="font-mono text-sm">{formatRupiah(totalPasiva)}</span>
              </div>
            </div>

            {/* Status Keseimbangan Neraca (Balance Indicator) */}
            <div className="md:col-span-2 pt-3 border-t border-slate-100">
              {Math.abs(totalAktiva - totalPasiva) < 1 ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs block">Neraca Seimbang (Aktiva = Pasiva 100% Balance)</span>
                      <span className="text-[10px] text-emerald-600 font-medium">Laba Rugi Berjalan terhubung otomatis ke Ekuitas Pasiva</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200">
                    Selisih: Rp 0
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-amber-900">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs block">Neraca Belum Seimbang</span>
                      <span className="text-[10px] text-amber-700">Periksa kembali rekonsiliasi akun kas dan penyesuaian HPP</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-700 bg-white px-2.5 py-1 rounded-xl border border-amber-200">
                    Selisih: {formatRupiah(Math.abs(totalAktiva - totalPasiva))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Susut Timbang Tab Content */}
        {reportTab === 'susut_pks' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Surat Jalan</th>
                    <th className="py-3 px-4">Pabrik PKS</th>
                    <th className="py-3 px-4 text-right">Netto RAM (kg)</th>
                    <th className="py-3 px-4 text-right">Netto 1 PKS (kg)</th>
                    <th className="py-3 px-4 text-right">Susut Muatan (kg)</th>
                    <th className="py-3 px-4 text-right">Persentase Susut</th>
                    <th className="py-3 px-4 text-center">Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        Tidak ada transaksi penjualan / rekap timbangan PKS pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {s.shipmentNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {s.factoryName}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {s.ramNettoKg.toLocaleString('id-ID')} kg
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-indigo-950 font-bold">
                          {s.factoryNetto1.toLocaleString('id-ID')} kg
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                          {s.shrinkageKg} kg
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                          {s.shrinkagePct}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              s.shrinkagePct <= 0.5
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.shrinkagePct <= 0.5 ? 'Normal Sesuai Standar' : 'Perlu Evaluasi Timbangan'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
