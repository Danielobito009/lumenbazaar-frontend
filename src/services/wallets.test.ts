import { describe, expect, it } from "vitest";

import { getNetworkConfig } from "@/config/networks";

import {
  isNetworkMismatch,
  mapAuthorizationErrorToOutcome,
  type WalletOutcome
} from "./wallets";

describe("wallet service", () => {
  it("detects wallet network mismatch by passphrase", () => {
    expect(
      isNetworkMismatch(
        getNetworkConfig("stellar:pubnet").passphrase,
        getNetworkConfig("stellar:testnet").passphrase
      )
    ).toBe(true);
  });

  it("accepts the configured network passphrase", () => {
    expect(
      isNetworkMismatch(
        getNetworkConfig("stellar:testnet").passphrase,
        getNetworkConfig("stellar:testnet").passphrase
      )
    ).toBe(false);
  });

  describe("wallet outcome mapping", () => {
    it("maps WALLET_REJECTED to rejected outcome", () => {
      const outcome = mapAuthorizationErrorToOutcome("WALLET_REJECTED");
      expect(outcome).toMatchObject({
        type: "rejected",
        retryable: true,
        errorCode: "WALLET_REJECTED"
      });
      expect(outcome.message).toContain("declined");
    });

    it("maps WALLET_TIMEOUT to timeout outcome", () => {
      const outcome = mapAuthorizationErrorToOutcome("WALLET_TIMEOUT");
      expect(outcome).toMatchObject({
        type: "timeout",
        retryable: true,
        errorCode: "WALLET_TIMEOUT"
      });
      expect(outcome.message).toContain("timed out");
    });

    it("maps WALLET_SIGNING_TIMEOUT to timeout outcome", () => {
      const outcome = mapAuthorizationErrorToOutcome("WALLET_SIGNING_TIMEOUT");
      expect(outcome).toMatchObject({
        type: "timeout",
        retryable: true,
        errorCode: "WALLET_SIGNING_TIMEOUT"
      });
    });

    it("maps WALLET_UNAVAILABLE to unavailable outcome", () => {
      const outcome = mapAuthorizationErrorToOutcome("WALLET_UNAVAILABLE");
      expect(outcome).toMatchObject({
        type: "unavailable",
        retryable: true,
        errorCode: "WALLET_UNAVAILABLE"
      });
      expect(outcome.message).toContain("not available");
    });

    it("maps SIGNATURE_INVALID to malformed_signature outcome", () => {
      const outcome = mapAuthorizationErrorToOutcome("SIGNATURE_INVALID");
      expect(outcome).toMatchObject({
        type: "malformed_signature",
        retryable: true,
        errorCode: "SIGNATURE_INVALID"
      });
      expect(outcome.message).toContain("invalid signature");
    });

    it("maps WALLET_MALFORMED_SIGNATURE to malformed_signature outcome", () => {
      const outcome = mapAuthorizationErrorToOutcome("WALLET_MALFORMED_SIGNATURE");
      expect(outcome).toMatchObject({
        type: "malformed_signature",
        retryable: true,
        errorCode: "WALLET_MALFORMED_SIGNATURE"
      });
    });

    it("maps WALLET_NETWORK_MISMATCH to network_mismatch outcome as non-retryable", () => {
      const outcome = mapAuthorizationErrorToOutcome("WALLET_NETWORK_MISMATCH");
      expect(outcome).toMatchObject({
        type: "network_mismatch",
        retryable: false,
        errorCode: "WALLET_NETWORK_MISMATCH"
      });
      expect(outcome.message).toContain("different network");
    });

    it("maps unknown error code to unavailable outcome", () => {
      const outcome = mapAuthorizationErrorToOutcome("UNKNOWN_ERROR");
      expect(outcome).toMatchObject({
        type: "unavailable",
        retryable: true
      });
      expect(outcome.message).toContain("unexpected");
    });

    it("ensures distinct outcomes for each failure type", () => {
      const outcomes: Record<string, WalletOutcome["type"]> = {
        WALLET_REJECTED: mapAuthorizationErrorToOutcome("WALLET_REJECTED").type,
        WALLET_TIMEOUT: mapAuthorizationErrorToOutcome("WALLET_TIMEOUT").type,
        WALLET_UNAVAILABLE: mapAuthorizationErrorToOutcome("WALLET_UNAVAILABLE").type,
        SIGNATURE_INVALID: mapAuthorizationErrorToOutcome("SIGNATURE_INVALID").type,
        WALLET_NETWORK_MISMATCH: mapAuthorizationErrorToOutcome("WALLET_NETWORK_MISMATCH").type
      };

      const types = Object.values(outcomes);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });
  });
});
