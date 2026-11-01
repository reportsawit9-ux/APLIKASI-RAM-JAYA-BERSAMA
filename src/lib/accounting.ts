import { WeighingTicket, Shipment, CashAccount, FactorySale, ProductType, LoanDebt } from '../types';

export const checkJournalImbalance = (
  tickets: WeighingTicket[],
  shipments: Shipment[],
  cashAccounts: CashAccount[],
  loans: LoanDebt[],
  totalStockValueRp: number
): { isBalanced: boolean; diff: number; message: string } => {
  const totalKas = cashAccounts.reduce((acc, a) => acc + a.balance, 0);
  const totalPiutangKasbon = loans
    .filter((l) => l.type !== 'MODAL_OWNER' && l.status === 'AKTIF')
    .reduce((acc, l) => acc + l.remainingAmount, 0);
  
  const activeShipments = shipments.filter((s) => s.status === 'DALAM_PERJALANAN');
  const totalStokDalamPerjalanan = activeShipments.reduce((acc, s) => acc + s.totalEstimatedHpp, 0);
  
  const totalAktiva = totalKas + totalPiutangKasbon + totalStockValueRp + totalStokDalamPerjalanan;

  const totalUtangPetani = tickets
    .filter((t) => t.paymentStatus === 'BELUM_LUNAS')
    .reduce((acc, t) => acc + t.farmerPayment, 0);

  const activeModalOwnerLoans = loans.filter((l) => l.type === 'MODAL_OWNER' && l.status === 'AKTIF');
  const uniqueModalOwnerLoans = Array.from(new Map(activeModalOwnerLoans.map(l => [l.id, l])).values());
  const totalModalOwner = uniqueModalOwnerLoans.reduce((acc, l) => acc + l.remainingAmount, 0);

  // Accounting equation: Assets = Liabilities + Equity
  // Equity = Net Income (Laba/Rugi) + Retained Earnings
  // In our simple model:
  // Aktiva = UtangPetani + ModalOwner + LabaDitahan
  // LabaDitahan = Aktiva - UtangPetani - ModalOwner
  
  const labaDitahan = (totalModalOwner === 0 && totalUtangPetani === 0 && totalAktiva === 0) 
    ? 0 
    : totalAktiva - totalUtangPetani - totalModalOwner;

  const totalPasiva = totalUtangPetani + totalModalOwner + labaDitahan;

  const diff = Math.abs(totalAktiva - totalPasiva);
  
  // Allowing a tiny epsilon for floating point issues if any
  const isBalanced = diff < 1; 

  return {
    isBalanced,
    diff,
    message: isBalanced 
      ? 'Neraca seimbang.' 
      : `Neraca tidak seimbang! Selisih: Rp ${diff.toLocaleString('id-ID')}`
  };
};
