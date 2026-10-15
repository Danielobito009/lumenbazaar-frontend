import { PageHeader } from "@/components/layout/page-header";
import { ReceiptDetailPage as ReceiptDetailClientPage } from "@/components/receipts/receipt-detail-page";

export default async function ReceiptDetailRoute({
  params
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const { receiptId } = await params;

  return (
    <>
      <PageHeader
        title="Receipt detail"
        description={`View payment settlement evidence, finality confirmation, and transaction details for receipt ${receiptId}.`}
      />
      <ReceiptDetailClientPage receiptId={receiptId} />
    </>
  );
}
