import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/services/api";
import {
  deleteUserInvoice,
  fetchCustomerInvoicesPage,
  type FetchCustomerInvoicesPageOptions,
  voidCustomerInvoice,
} from "./api";

const STATS_PAGE_SIZE = 200;

export const invoicingKeys = {
  customerInvoices: () => ["invoicing", "customerInvoices"] as const,
  customerInvoicesPage: (options: FetchCustomerInvoicesPageOptions) =>
    [...invoicingKeys.customerInvoices(), "page", options] as const,
  customerInvoicesAll: () => [...invoicingKeys.customerInvoices(), "all"] as const,
};

/** Paginated list — previous page stays visible while the next page loads. */
export function useCustomerInvoicesPage(options: FetchCustomerInvoicesPageOptions) {
  return useQuery({
    queryKey: invoicingKeys.customerInvoicesPage(options),
    queryFn: ({ signal }) => fetchCustomerInvoicesPage(options, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/**
 * Background exhaustive load for stats + CSV. Pages accumulate so UI can show
 * running totals instead of waiting for every invoice before painting numbers.
 */
export function useCustomerInvoicesAll() {
  return useInfiniteQuery({
    queryKey: invoicingKeys.customerInvoicesAll(),
    queryFn: ({ pageParam, signal }) =>
      fetchCustomerInvoicesPage({ page: pageParam, pageSize: STATS_PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
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
        error instanceof ApiError
          ? `Failed to void invoice: ${error.message}`
          : "Failed to void invoice.",
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
