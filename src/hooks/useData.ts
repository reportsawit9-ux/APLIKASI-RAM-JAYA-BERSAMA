import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { storage } from '../lib/storage';

export const useRamData = (role?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleDataReset = () => {
      queryClient.invalidateQueries({ queryKey: ['ramData'] });
    };

    window.addEventListener('ram_data_reset', handleDataReset);
    return () => {
      window.removeEventListener('ram_data_reset', handleDataReset);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['ramData', role],
    queryFn: async () => {
      const [
        cashAccounts,
        tickets,
        shipments,
        factorySales,
        stockSummary,
        products,
        loans,
        cashTransactions,
      ] = await Promise.all([
        storage.getCashAccounts(role).catch(() => []),
        storage.getTickets().catch(() => []),
        storage.getShipments().catch(() => []),
        storage.getFactorySales().catch(() => []),
        storage.getStockSummary().catch(() => ({})),
        storage.getProducts().catch(() => []),
        storage.getLoans().catch(() => []),
        storage.getCashTransactions().catch(() => []),
      ]);

      return {
        cashAccounts,
        tickets,
        shipments,
        factorySales,
        stockSummary,
        products,
        loans,
        cashTransactions,
      };
    },
  });
};
