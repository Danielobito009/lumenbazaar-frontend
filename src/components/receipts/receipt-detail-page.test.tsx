import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/services/api/query";
import type { Receipt } from "@/services/api/schemas";

import { ReceiptDetailPage } from "./receipt-detail-page";

// Mock the API client
vi.mock("@/services/api", () => ({
  apiClient: {
    getReceipt: vi.fn()
  }
}));

describe("ReceiptDetailPage", () => {
  it("renders a loading state while fetching the receipt", () => {
    const { apiClient } = require("@/services/api");
    apiClient.getReceipt.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_123" />
      </QueryClientProvider>
    );

    expect(screen.getByText("Loading receipt details")).toBeInTheDocument();
  });

  it("renders receipt details when successfully loaded", async () => {
    const { apiClient } = require("@/services/api");
    const mockReceipt: Receipt = {
      amount: "100",
      assetCode: "USDC",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWBRXM6LSV7XYJJJX34ZPUSC6D6P2",
      correlationId: "corr_123",
      createdAt: "2026-10-15T10:00:00Z",
      evidenceHash: "hash_abc123",
      failureCode: null,
      failureReason: null,
      id: "receipt_123",
      ledger: 12345,
      network: "stellar:testnet",
      paymentAttemptId: "attempt_123",
      resourceId: "resource_456",
      sellerId: "seller_789",
      settledAt: "2026-10-15T10:05:00Z",
      status: "finalized",
      transactionHash: "tx_hash_abc123",
      updatedAt: "2026-10-15T10:05:00Z"
    };
    apiClient.getReceipt.mockResolvedValue(mockReceipt);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_123" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Receipt information")).toBeInTheDocument();
    });

    expect(screen.getByText("receipt_123")).toBeInTheDocument();
    expect(screen.getByText("finalized")).toBeInTheDocument();
    expect(screen.getByText("stellar:testnet")).toBeInTheDocument();
    expect(screen.getByText("100 USDC")).toBeInTheDocument();
  });

  it("renders finality confirmation section for finalized receipts", async () => {
    const { apiClient } = require("@/services/api");
    const mockReceipt: Receipt = {
      amount: "50",
      assetCode: "USDC",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWBRXM6LSV7XYJJJX34ZPUSC6D6P2",
      correlationId: "corr_123",
      createdAt: "2026-10-15T10:00:00Z",
      evidenceHash: "hash_abc123",
      failureCode: null,
      failureReason: null,
      id: "receipt_456",
      ledger: 54321,
      network: "stellar:testnet",
      paymentAttemptId: "attempt_456",
      resourceId: null,
      sellerId: null,
      settledAt: "2026-10-15T10:05:00Z",
      status: "finalized",
      transactionHash: "tx_def456",
      updatedAt: "2026-10-15T10:05:00Z"
    };
    apiClient.getReceipt.mockResolvedValue(mockReceipt);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_456" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Finality confirmation")).toBeInTheDocument();
    });

    expect(screen.getByText("tx_def456")).toBeInTheDocument();
    expect(screen.getByText("54321")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View on Stellar explorer/ })).toBeInTheDocument();
  });

  it("renders failure information for failed receipts", async () => {
    const { apiClient } = require("@/services/api");
    const mockReceipt: Receipt = {
      amount: "25",
      assetCode: "USDC",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWBRXM6LSV7XYJJJX34ZPUSC6D6P2",
      correlationId: "corr_failed",
      createdAt: "2026-10-15T10:00:00Z",
      evidenceHash: "hash_fail",
      failureCode: "AMOUNT_MISMATCH",
      failureReason: "Payment amount did not match resource requirement",
      id: "receipt_failed",
      ledger: null,
      network: "stellar:testnet",
      paymentAttemptId: "attempt_failed",
      resourceId: null,
      sellerId: null,
      settledAt: null,
      status: "failed",
      transactionHash: null,
      updatedAt: "2026-10-15T10:01:00Z"
    };
    apiClient.getReceipt.mockResolvedValue(mockReceipt);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_failed" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Failure information")).toBeInTheDocument();
    });

    expect(screen.getByText("AMOUNT_MISMATCH")).toBeInTheDocument();
    expect(screen.getByText("Payment amount did not match resource requirement")).toBeInTheDocument();
  });

  it("renders pending state message for pending receipts", async () => {
    const { apiClient } = require("@/services/api");
    const mockReceipt: Receipt = {
      amount: "75",
      assetCode: "USDC",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWBRXM6LSV7XYJJJX34ZPUSC6D6P2",
      correlationId: "corr_pending",
      createdAt: "2026-10-15T10:00:00Z",
      evidenceHash: "hash_pending",
      failureCode: null,
      failureReason: null,
      id: "receipt_pending",
      ledger: null,
      network: "stellar:testnet",
      paymentAttemptId: "attempt_pending",
      resourceId: null,
      sellerId: null,
      settledAt: null,
      status: "pending",
      transactionHash: null,
      updatedAt: "2026-10-15T10:00:00Z"
    };
    apiClient.getReceipt.mockResolvedValue(mockReceipt);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_pending" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Pending settlement")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/awaiting finalization on the Stellar network/)
    ).toBeInTheDocument();
  });

  it("renders an error state when the receipt cannot be retrieved", async () => {
    const { apiClient } = require("@/services/api");
    const error = new Error("Not found");
    apiClient.getReceipt.mockRejectedValue(error);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_missing" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Receipt unavailable")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "The receipt could not be retrieved from the backend. Please verify the receipt ID and try again."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("includes associated resource information when present", async () => {
    const { apiClient } = require("@/services/api");
    const mockReceipt: Receipt = {
      amount: "100",
      assetCode: "USDC",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWBRXM6LSV7XYJJJX34ZPUSC6D6P2",
      correlationId: "corr_123",
      createdAt: "2026-10-15T10:00:00Z",
      evidenceHash: "hash_abc123",
      failureCode: null,
      failureReason: null,
      id: "receipt_123",
      ledger: 12345,
      network: "stellar:testnet",
      paymentAttemptId: "attempt_123",
      resourceId: "resource_456",
      sellerId: "seller_789",
      settledAt: "2026-10-15T10:05:00Z",
      status: "finalized",
      transactionHash: "tx_hash_abc123",
      updatedAt: "2026-10-15T10:05:00Z"
    };
    apiClient.getReceipt.mockResolvedValue(mockReceipt);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_123" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Associated resource")).toBeInTheDocument();
    });

    expect(screen.getByText("resource_456")).toBeInTheDocument();
  });

  it("includes seller information when present", async () => {
    const { apiClient } = require("@/services/api");
    const mockReceipt: Receipt = {
      amount: "100",
      assetCode: "USDC",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWBRXM6LSV7XYJJJX34ZPUSC6D6P2",
      correlationId: "corr_123",
      createdAt: "2026-10-15T10:00:00Z",
      evidenceHash: "hash_abc123",
      failureCode: null,
      failureReason: null,
      id: "receipt_123",
      ledger: 12345,
      network: "stellar:testnet",
      paymentAttemptId: "attempt_123",
      resourceId: null,
      sellerId: "seller_789",
      settledAt: "2026-10-15T10:05:00Z",
      status: "finalized",
      transactionHash: "tx_hash_abc123",
      updatedAt: "2026-10-15T10:05:00Z"
    };
    apiClient.getReceipt.mockResolvedValue(mockReceipt);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_123" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Seller information")).toBeInTheDocument();
    });

    expect(screen.getByText("seller_789")).toBeInTheDocument();
  });

  it("calls the API client with the correct receipt ID", async () => {
    const { apiClient } = require("@/services/api");
    const mockReceipt: Receipt = {
      amount: "100",
      assetCode: "USDC",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWBRXM6LSV7XYJJJX34ZPUSC6D6P2",
      correlationId: "corr_123",
      createdAt: "2026-10-15T10:00:00Z",
      evidenceHash: "hash_abc123",
      failureCode: null,
      failureReason: null,
      id: "receipt_malformed_id",
      ledger: 12345,
      network: "stellar:testnet",
      paymentAttemptId: "attempt_123",
      resourceId: null,
      sellerId: null,
      settledAt: "2026-10-15T10:05:00Z",
      status: "finalized",
      transactionHash: "tx_hash_abc123",
      updatedAt: "2026-10-15T10:05:00Z"
    };
    apiClient.getReceipt.mockResolvedValue(mockReceipt);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ReceiptDetailPage receiptId="receipt_malformed_id" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(apiClient.getReceipt).toHaveBeenCalledWith("receipt_malformed_id");
    });
  });
});
