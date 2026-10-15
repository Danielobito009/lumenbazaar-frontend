import { describe, it, expect } from "vitest";
import {
  checkPaymentPreflight,
  preflightCheckErrorToApiError,
  type PreflightCheckError,
  type PreflightCheckOptions
} from "./preflight";
import {
  TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
  TESTNET_ACCOUNT_INSUFFICIENT_BALANCE,
  TESTNET_ACCOUNT_NO_TRUSTLINE,
  TESTNET_ACCOUNT_NATIVE_ONLY,
  TESTNET_ACCOUNT_NOT_FOUND,
  TESTNET_USDC_ISSUER,
  preflightTestScenarios,
  createScenarioMockFetch
} from "@/fixtures/stellar-accounts";

describe("checkPaymentPreflight", () => {
  const mockFetch = createScenarioMockFetch();

  describe("successful validation", () => {
    it("should validate account with sufficient balance", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.validation.hasTrustline).toBe(true);
        expect(result.validation.error).toBeNull();
        expect(result.validation.balance).toBe("1000.0000000");
      }
    });

    it("should validate native XLM with sufficient balance", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "XLM",
        assetIssuer: "",
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_NATIVE_ONLY,
        requiredAmount: "10000000"
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.validation.hasTrustline).toBe(true);
        expect(result.validation.error).toBeNull();
      }
    });
  });

  describe("trustline validation", () => {
    it("should fail with TRUSTLINE_REQUIRED when account has no trustline", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_NO_TRUSTLINE,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("TRUSTLINE_REQUIRED");
        expect(result.error.assetCode).toBe("USDC");
        expect(result.error.assetIssuer).toBe(TESTNET_USDC_ISSUER);
        expect(result.error.message).toContain("trustline");
      }
    });

    it("should fail with TRUSTLINE_REQUIRED for issued asset on native-only account", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_NATIVE_ONLY,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("TRUSTLINE_REQUIRED");
      }
    });
  });

  describe("balance validation", () => {
    it("should fail with INSUFFICIENT_BALANCE when balance is low", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_INSUFFICIENT_BALANCE,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INSUFFICIENT_BALANCE");
        expect(result.error.currentBalance).toBe("10.0000000");
        expect(result.error.requiredAmount).toBe("50000000");
        expect(result.error.message).toContain("Insufficient balance");
      }
    });

    it("should fail with INSUFFICIENT_BALANCE for insufficient XLM", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "XLM",
        assetIssuer: "",
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_NATIVE_ONLY,
        requiredAmount: "100000000000000" // Extremely large amount
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INSUFFICIENT_BALANCE");
      }
    });
  });

  describe("error handling", () => {
    it("should fail with ACCOUNT_NOT_FOUND for non-existent account", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_NOT_FOUND,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("ACCOUNT_NOT_FOUND");
        expect(result.error.message).toContain("not found");
      }
    });

    it("should fail with NETWORK_ERROR on fetch failure", async () => {
      const failingFetch = async () => {
        throw new Error("Network timeout");
      };

      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: failingFetch as typeof fetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NETWORK_ERROR");
      }
    });

    it("should fail with INVALID_ASSET_CONFIG for missing issuer", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: "", // Missing issuer for non-native asset
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_ASSET_CONFIG");
        expect(result.error.message).toContain("issuer");
      }
    });

    it("should fail with INVALID_ASSET_CONFIG for invalid asset code length", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "THISISAWAYTOOLONGASSETCODE",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_ASSET_CONFIG");
      }
    });

    it("should fail with INVALID_ASSET_CONFIG for invalid Stellar address", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: "NOT_A_VALID_STELLAR_ADDRESS",
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        requiredAmount: "50000000"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_ASSET_CONFIG");
        expect(result.error.message).toContain("valid Stellar address");
      }
    });

    it("should fail with INVALID_ASSET_CONFIG for invalid amount format", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        requiredAmount: "not-a-number"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_ASSET_CONFIG");
        expect(result.error.message).toContain("positive integer");
      }
    });

    it("should fail with INVALID_ASSET_CONFIG for amount with leading zero", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        requiredAmount: "0123456"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_ASSET_CONFIG");
        expect(result.error.message).toContain("leading zeros");
      }
    });

    it("should fail with INVALID_ASSET_CONFIG for zero amount", async () => {
      const result = await checkPaymentPreflight({
        assetCode: "USDC",
        assetIssuer: TESTNET_USDC_ISSUER,
        fetchImpl: mockFetch,
        network: "stellar:testnet",
        publicKey: TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        requiredAmount: "0"
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_ASSET_CONFIG");
      }
    });
  });

  describe("test scenarios coverage", () => {
    it("validates all preflight test scenarios", async () => {
      for (const [key, scenario] of Object.entries(preflightTestScenarios)) {
        const result = await checkPaymentPreflight({
          assetCode: scenario.assetCode,
          assetIssuer: scenario.assetIssuer,
          fetchImpl: mockFetch,
          network: "stellar:testnet",
          publicKey: scenario.account,
          requiredAmount: scenario.requiredAmount
        });

        if (scenario.expectedError === null) {
          expect(result.success).toBe(true, `Scenario "${key}" should succeed`);
          if (result.success) {
            expect(result.validation.error).toBeNull();
            expect(result.validation.hasTrustline).toBe(scenario.expectedHasTrustline);
          }
        } else {
          expect(result.success).toBe(false, `Scenario "${key}" should fail`);
          if (!result.success) {
            expect(result.error.code).toBe(scenario.expectedError);
          }
        }
      }
    });
  });
});

describe("preflightCheckErrorToApiError", () => {
  it("converts TRUSTLINE_REQUIRED error", () => {
    const error: PreflightCheckError = {
      code: "TRUSTLINE_REQUIRED",
      assetCode: "USDC",
      assetIssuer: TESTNET_USDC_ISSUER,
      message: "Missing trustline for USDC"
    };

    const apiError = preflightCheckErrorToApiError(error);

    expect(apiError.code).toBe("TRUSTLINE_REQUIRED");
    expect(apiError.message).toBe("Missing trustline for USDC");
    expect(apiError.details).toEqual({
      assetCode: "USDC",
      assetIssuer: TESTNET_USDC_ISSUER
    });
  });

  it("converts INSUFFICIENT_BALANCE error", () => {
    const error: PreflightCheckError = {
      code: "INSUFFICIENT_BALANCE",
      assetCode: "USDC",
      currentBalance: "10.0000000",
      requiredAmount: "50000000",
      message: "Insufficient balance"
    };

    const apiError = preflightCheckErrorToApiError(error);

    expect(apiError.code).toBe("INSUFFICIENT_BALANCE");
    expect(apiError.details).toEqual({
      assetCode: "USDC",
      currentBalance: "10.0000000",
      requiredAmount: "50000000"
    });
  });

  it("converts ACCOUNT_NOT_FOUND error", () => {
    const error: PreflightCheckError = {
      code: "ACCOUNT_NOT_FOUND",
      publicKey: TESTNET_ACCOUNT_NOT_FOUND,
      message: "Account not found"
    };

    const apiError = preflightCheckErrorToApiError(error);

    expect(apiError.code).toBe("ACCOUNT_NOT_FOUND");
    expect(apiError.details).toEqual({
      publicKey: TESTNET_ACCOUNT_NOT_FOUND
    });
  });

  it("converts NETWORK_ERROR", () => {
    const error: PreflightCheckError = {
      code: "NETWORK_ERROR",
      message: "Network timeout"
    };

    const apiError = preflightCheckErrorToApiError(error);

    expect(apiError.code).toBe("NETWORK_ERROR");
    expect(apiError.message).toBe("Network timeout");
    expect(apiError.details).toBeUndefined();
  });

  it("converts INVALID_ASSET_CONFIG", () => {
    const error: PreflightCheckError = {
      code: "INVALID_ASSET_CONFIG",
      message: "Asset configuration invalid"
    };

    const apiError = preflightCheckErrorToApiError(error);

    expect(apiError.code).toBe("INVALID_ASSET_CONFIG");
    expect(apiError.message).toBe("Asset configuration invalid");
  });
});
