"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorState, LoadingState } from "@/components/ui/surfaces";
import { apiClient } from "@/services/api";
import { normalizeUiError } from "@/services/ui-state";

import { ReceiptDetailSummary } from "./receipt-detail-summary";

export function ReceiptDetailPage({ receiptId }: { receiptId: string }) {
  const { data, error, isLoading, refetch } = useQuery({
    queryFn: () => apiClient.getReceipt(receiptId),
    queryKey: ["receipt", receiptId]
  });

  if (isLoading) {
    return <LoadingState label="Loading receipt details" />;
  }

  if (data === undefined || error !== null) {
    const state = normalizeUiError(error, {
      code: "RECEIPT_UNAVAILABLE",
      description: "The receipt could not be retrieved from the backend. Please verify the receipt ID and try again.",
      title: "Receipt unavailable"
    });

    return (
      <ErrorState
        code={state.code}
        description={state.description}
        onRetry={() => void refetch()}
        requestId={state.requestId}
        title={state.title}
      />
    );
  }

  return (
    <div className="space-y-5">
      <ReceiptDetailSummary receipt={data} />
    </div>
  );
}
