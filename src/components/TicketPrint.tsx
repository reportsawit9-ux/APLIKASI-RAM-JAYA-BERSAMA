import React, { useState, useEffect } from 'react';
import { Printer, X, Scale } from 'lucide-react';
import { WeighingTicket, AppSettings } from '../types';
import { storage } from '../lib/storage';

interface TicketPrintProps {
  ticket: WeighingTicket;
  onClose: () => void;
}

export const TicketPrint: React.FC<TicketPrintProps> = ({ ticket, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>({
    ramName: 'RAM SUMBER REZEKI',
    address: 'Jl. Lintas Sawit Km. 12',
    phone: '0812-3456-7890',
    defaultRafaksiPct: 2,
    defaultUnloadingFeePerKg: 10,
    ownerPin: '123456',
  });

  useEffect(() => {
    storage.getSettings().then((s) => {
      if (s) setSettings(s);
    });
  }, []);

  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <style>{`
        @media print {
          @page {
            size: 210mm 148mm landscape;
            margin: 5mm;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-landscape-slip,
          .printable-landscape-slip * {
            visibility: visible !important;
          }
          .printable-landscape-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 200mm !important;
            max-width: 200mm !important;
            height: 138mm !important;
            max-height: 138mm !important;
            margin: 0 !important;
            padding: 3mm 4mm !important;
            box-sizing: border-box !important;
            border: 1.5px solid #0f172a !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-[220mm] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4">
        <div className="no-print flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                Nota Timbang Kelapa Sawit (A5 Landscape 148 x 210 mm)
              </h3>
              <p className="text-[10px] text-slate-500">
                Ukuran cetak otomatis disesuaikan ke 210 mm x 148 mm
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Nota (Landscape)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-5 overflow-x-auto bg-slate-100 flex justify-center">
          <div className="printable-landscape-slip w-[200mm] min-h-[136mm] max-h-[138mm] bg-white text-slate-900 p-3 sm:p-4 rounded-xl border border-slate-300 shadow-md flex flex-col justify-between font-sans">
            <div className="border-b-2 border-slate-900 pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#034C8C] text-white flex items-center justify-center font-black text-xs">
                      SR
                    </div>
                    <h1 className="text-base sm:text-lg font-black text-[#034C8C] tracking-tight uppercase">
                      {settings.ramName || 'RAM SUMBER REZEKI'}
                    </h1>
                  </div>
                  <p className="text-[9.5px] text-slate-600 leading-tight mt-0.5">
                    {settings.address} • Telp/WA: {settings.phone}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-[9.5px] font-black uppercase tracking-wider rounded">
                    BUKTI PENIMBANGAN KELAPA SAWIT
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-3 text-[10px]">
                    <span className="font-mono font-black text-slate-900">
                      NO: {ticket.ticketNumber}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {ticket.date} • {ticket.time} WIB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 flex-1">
              {/* KOLOM KIRI: DATA TIMBANGAN */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      1. DATA PENIMBANGAN
                    </span>
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                      {ticket.productName || ticket.productId}
                    </span>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Petani / Supplier:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[130px]">
                        {ticket.farmerName}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">No. Polisi / Truk:</span>
                      <span className="font-mono font-bold text-slate-900 uppercase">
                        {ticket.vehiclePlate || '-'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-0.5 border-t border-slate-200">
                      <span className="text-slate-600">Berat Bruto (Kotor):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {ticket.bruto.toLocaleString('id-ID')} kg
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Berat Tara (Kosong):</span>
                      <span className="font-mono font-bold text-slate-700">
                        - {ticket.tara.toLocaleString('id-ID')} kg
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                      <span className="text-slate-800">Netto 1 (Bruto - Tara):</span>
                      <span className="font-mono text-slate-900">
                        {ticket.netto1.toLocaleString('id-ID')} kg
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-rose-600">
                      <span>Potongan Rafaksi ({ticket.rafaksiPct}%):</span>
                      <span className="font-mono font-bold">
                        - {ticket.rafaksiKg.toLocaleString('id-ID')} kg
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 pt-1.5 border-t-2 border-slate-900 flex justify-between items-center bg-indigo-50/80 px-2 py-1 rounded border border-indigo-200">
                  <span className="text-[10px] font-black text-indigo-950 uppercase tracking-tight">
                    Netto 2 (Bersih Timbang):
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-indigo-900">
                    {ticket.netto2.toLocaleString('id-ID')} kg
                  </span>
                </div>
              </div>

              {/* KOLOM KANAN: RINCIAN PEMBAYARAN */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      2. RINCIAN KEUANGAN
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                        ticket.paymentStatus === 'LUNAS'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {ticket.paymentStatus === 'LUNAS' ? 'LUNAS (KAS ADMIN)' : 'BELUM DIBAYAR'}
                    </span>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Harga Beli Sawit:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(ticket.pricePerKg)} / kg
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Nilai Dasar (Netto 2 x Harga):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(ticket.baseAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-rose-600 pt-0.5 border-t border-slate-200">
                      <span>
                        Upah Bongkar ({formatRupiah(ticket.unloadingFeePerKg)}/kg):
                      </span>
                      <span className="font-mono font-bold">
                        - {formatRupiah(ticket.totalUnloadingFee)}
                      </span>
                    </div>

                    {/* Affiliate calculation is deleted as requested */}
                  </div>
                </div>

                <div className="mt-2 p-2 bg-emerald-50 rounded-lg border-2 border-emerald-500 text-emerald-950 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-900 block leading-tight">
                      TOTAL DITERIMA PETANI:
                    </span>
                    <span className="text-[8.5px] text-emerald-700">
                      Netto 2 x Harga - Upah Bongkar
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black font-mono text-emerald-800 tracking-tight">
                      {formatRupiah(ticket.farmerPayment)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {ticket.notes && (
              <div className="text-[9px] text-slate-500 italic px-1 pb-1">
                <span className="font-bold not-italic text-slate-600">Catatan:</span> {ticket.notes}
              </div>
            )}

            <div className="border-t border-slate-300 pt-1.5">
              <div className="grid grid-cols-3 gap-4 text-center text-[9.5px]">
                <div>
                  <p className="text-slate-500 font-semibold mb-6">Penerima / Petani</p>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-0.5 mx-3">
                    ( {ticket.farmerName} )
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-semibold mb-6">Sopir / Pengantar</p>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-0.5 mx-3">
                    ( {ticket.vehiclePlate || 'Sopir'} )
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-semibold mb-6">Kasir / Admin RAM</p>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-0.5 mx-3">
                    ( {ticket.operatorName || 'Admin Timbangan'} )
                  </p>
                </div>
              </div>

              <div className="text-center text-[8.5px] text-slate-500 pt-1 flex items-center justify-between px-1">
                <span>
                  * Nota ini sah sebagai bukti transaksi pembayaran kelapa sawit {settings.ramName || 'RAM SUMBER REZEKI'}.
                </span>
                <span className="font-mono text-[8px] text-slate-400">
                  AUTHO-{ticket.ticketNumber}-OK
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="no-print p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Format: A5 Landscape (210 x 148 mm) • Margin 5 mm
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
