import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/services/api";
import { deleteUserInvoice, fetchCustomerInvoices, voidCustomerInvoice } from "./api";

export const invoicingKeys = {
  customerInvoices: () => ["invoicing", "customerInvoices"] as const,
};

/** Loads the full customer invoice list (500 per page ceiling, like Angular). */
export function useCustomerInvoices() {
  return useQuery({
    queryKey: invoicingKeys.customerInvoices(),
    queryFn: ({ signal }) => fetchCustomerInvoices(signal),
    staleTime: 60_000,
  });
}

export function useVoidCustomerInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: number) => voidCustomerInvoice(invoiceId),
    onSuccess: (result) => {
      toast.success(`Invoice voided — ${result.count_jobs} visits removed.`);
      void queryClient.invalidateQueries({ queryKey: invoicingKeys.customerInvoices() });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? `Failed to void invoice: ${error.message}` : "Failed to void invoice.",
      ),
  });
}

export function useDeleteUserInvoice() {
  return useMutation({
    mutationFn: (id: number) => deleteUserInvoice(id),
    onSuccess: () => toast.success("User invoice deleted."),
    onError: () => toast.error("Failed to delete user invoice."),
  });
}
