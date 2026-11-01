import React, { useState, useEffect } from 'react';
import { Printer, X, Truck } from 'lucide-react';
import { Shipment, AppSettings } from '../types';
import { storage } from '../lib/storage';

interface ShipmentPrintModalProps {
  shipment: Shipment;
  onClose: () => void;
}

export const ShipmentPrintModal: React.FC<ShipmentPrintModalProps> = ({ shipment, onClose }) => {
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

  const handlePrint = () => {
    window.print();
  };

  const formatRupiah = (val?: number) => {
    if (!val) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
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
          .printable-landscape-shipment,
          .printable-landscape-shipment * {
            visibility: visible !important;
          }
          .printable-landscape-shipment {
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

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-[220mm] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* Header Controls (Hidden on Print) */}
        <div className="no-print flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                Surat Jalan Pengiriman PKS (A5 Landscape 148 x 210 mm)
              </h3>
              <p className="text-[10px] text-slate-500">
                Ukuran cetak otomatis disesuaikan ke 210 mm x 148 mm (1 Halaman Pas)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Surat Jalan (Landscape)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable preview */}
        <div className="p-3 sm:p-5 overflow-x-auto bg-slate-100 flex justify-center">
          {/* Printable Landscape Slip */}
          <div className="printable-landscape-shipment w-[200mm] min-h-[136mm] max-h-[138mm] bg-white text-slate-900 p-3 sm:p-4 rounded-xl border border-slate-300 shadow-md flex flex-col justify-between font-sans">
            {/* Kop / Header Surat Jalan */}
            <div className="border-b-2 border-slate-900 pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#034C8C] text-white flex items-center justify-center font-black text-xs">
                      SJ
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
                    SURAT JALAN PENGIRIMAN PKS
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-3 text-[10px]">
                    <span className="font-mono font-black text-slate-900">
                      NO: {shipment.shipmentNumber}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {shipment.date} • {shipment.time} WIB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid 2 Kolom: Info Ekspedisi & Rincian Muatan */}
            <div className="grid grid-cols-2 gap-3 py-2 flex-1">
              {/* KOLOM KIRI: DATA PENGIRIMAN & ARMADA */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      1. DATA EKSPEDISI & PABRIK
                    </span>
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 uppercase">
                      {shipment.status === 'SELESAI_TERJUAL' ? 'Terjual' : 'Dalam Perjalanan'}
                    </span>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Pabrik PKS Tujuan:</span>
                      <span className="font-bold text-indigo-900 text-[10.5px]">
                        {shipment.factoryName}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Nama Sopir:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[140px]">
                        {shipment.driverName}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">No. Polisi Truk:</span>
                      <span className="font-mono font-bold text-slate-900 uppercase">
                        {shipment.vehiclePlate}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-0.5 border-t border-slate-200">
                      <span className="text-slate-600">Ongkos Angkut Truk:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(shipment.shippingCost)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Upah Muat Truk:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(shipment.loadingCost)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 pt-1 border-t border-slate-200 text-[9px] text-slate-500">
                  <span className="font-bold text-slate-600">Instruksi:</span> Sopir wajib meminta stempel dan bukti timbang asli dari PKS penerima.
                </div>
              </div>

              {/* KOLOM KANAN: RINCIAN KOMODITAS BUAH */}
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      2. RINCIAN KOMODITAS MUATAN
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      Netto Timbang RAM
                    </span>
                  </div>

                  <div className="overflow-hidden border border-slate-200 rounded">
                    <table className="w-full text-left text-[9.5px]">
                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th className="py-1 px-1.5 text-center w-6">No</th>
                          <th className="py-1 px-1.5">Komoditas Buah</th>
                          <th className="py-1 px-1.5 text-right">Berat RAM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {shipment.items && shipment.items.length > 0 ? (
                          shipment.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-1 px-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-1 px-1.5 font-bold text-slate-900">{it.productName}</td>
                              <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                                {it.nettoKg.toLocaleString('id-ID')} kg
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="py-1 px-1.5 text-center font-mono text-slate-500">1</td>
                            <td className="py-1 px-1.5 font-bold text-slate-900">{shipment.productName || 'TBS Sawit Standar'}</td>
                            <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                              {shipment.ramNettoKg.toLocaleString('id-ID')} kg
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Berat Highlight */}
                <div className="mt-1.5 p-1.5 bg-indigo-50/80 rounded border-2 border-indigo-500 text-indigo-950 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-tight text-indigo-950">
                    TOTAL BERAT MUATAN TRUK:
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono text-indigo-900">
                    {shipment.ramNettoKg.toLocaleString('id-ID')} kg
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Area Tanda Tangan */}
            <div className="border-t border-slate-300 pt-1.5">
              <div className="grid grid-cols-3 gap-4 text-center text-[9.5px]">
                <div>
                  <p className="text-slate-500 font-semibold mb-6">Sopir Pengangkut</p>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-0.5 mx-3">
                    ( {shipment.driverName} )
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-semibold mb-6">Petugas Timbang PKS</p>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-0.5 mx-3">
                    ( ................................ )
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-semibold mb-6">Pengurus / Kasir RAM</p>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-0.5 mx-3">
                    ( {settings.ramName || 'Pengurus RAM'} )
                  </p>
                </div>
              </div>

              {/* Footer Disclaimer */}
              <div className="text-center text-[8.5px] text-slate-500 pt-1 flex items-center justify-between px-1">
                <span>
                  * Surat jalan ini sah sebagai bukti resmi pengiriman muatan buah kelapa sawit ke PKS.
                </span>
                <span className="font-mono text-[8px] text-slate-400">
                  AUTHO-SJ-{shipment.shipmentNumber}-OK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
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
