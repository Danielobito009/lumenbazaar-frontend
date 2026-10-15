import { describe, it, expect } from "vitest";
import {
  queryAccountInfo,
  validateAccountPreflight,
  type StellarAccountInfo
} from "./horizon";
import {
  TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
  TESTNET_ACCOUNT_INSUFFICIENT_BALANCE,
  TESTNET_ACCOUNT_NO_TRUSTLINE,
  TESTNET_USDC_ISSUER,
  createAccountWithSufficientBalance,
  createAccountWithInsufficientBalance,
  createAccountWithoutTrustline,
  createHorizonResponse404,
  createHorizonResponse500,
  createScenarioMockFetch
} from "@/fixtures/stellar-accounts";

describe("queryAccountInfo", () => {
  const mockFetch = createScenarioMockFetch();

  it("should query account info successfully", async () => {
    const result = await queryAccountInfo(
      TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
      "stellar:testnet",
      mockFetch
    );

    expect(result.id).toBe(TESTNET_ACCOUNT_SUFFICIENT_BALANCE);
    expect(result.balances).toHaveLength(2);
    expect(result.sequence).toBeDefined();
  });

  it("should parse native XLM balance", async () => {
    const result = await queryAccountInfo(
      TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
      "stellar:testnet",
      mockFetch
    );

    const xlmBalance = result.balances.find((b) => b.assetCode === "XLM");
    expect(xlmBalance).toBeDefined();
    expect(xlmBalance?.assetIssuer).toBeNull();
    expect(xlmBalance?.balance).toBe("100.0000000");
    expect(xlmBalance?.limit).toBe("unlimited");
  });

  it("should parse issued asset balance", async () => {
    const result = await queryAccountInfo(
      TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
      "stellar:testnet",
      mockFetch
    );

    const usdcBalance = result.balances.find((b) => b.assetCode === "USDC");
    expect(usdcBalance).toBeDefined();
    expect(usdcBalance?.assetIssuer).toBe(TESTNET_USDC_ISSUER);
    expect(usdcBalance?.balance).toBe("1000.0000000");
    expect(usdcBalance?.limit).toBe("10000.0000000");
  });

  it("should throw error on 404 response", async () => {
    const notFoundFetch = async () => createHorizonResponse404();

    await expect(
      queryAccountInfo("GNOTFOUND", "stellar:testnet", notFoundFetch as typeof fetch)
    ).rejects.toThrow("not found");
  });

  it("should throw error on 500 response", async () => {
    const errorFetch = async () => createHorizonResponse500();

    await expect(
      queryAccountInfo(TESTNET_ACCOUNT_SUFFICIENT_BALANCE, "stellar:testnet", errorFetch as typeof fetch)
    ).rejects.toThrow("Horizon API error");
  });

  it("should throw error on invalid response", async () => {
    const invalidFetch = async () =>
      new Response(JSON.stringify({ invalid: "response" }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });

    await expect(
      queryAccountInfo(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "stellar:testnet",
        invalidFetch as typeof fetch
      )
    ).rejects.toThrow("Invalid Horizon API response");
  });

  it("should throw error on fetch exception", async () => {
    const failingFetch = async () => {
      throw new Error("Network timeout");
    };

    await expect(
      queryAccountInfo(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "stellar:testnet",
        failingFetch as typeof fetch
      )
    ).rejects.toThrow("Failed to query account");
  });
});

describe("validateAccountPreflight", () => {
  const mockFetch = createScenarioMockFetch();

  describe("trustline validation", () => {
    it("should return hasTrustline=true when balance exists", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "50000000",
        "stellar:testnet",
        mockFetch
      );

      expect(result.hasTrustline).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should return hasTrustline=false when balance missing", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_NO_TRUSTLINE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "50000000",
        "stellar:testnet",
        mockFetch
      );

      expect(result.hasTrustline).toBe(false);
      expect(result.error).toBe("TRUSTLINE_REQUIRED");
    });

    it("should detect native XLM trustline", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "XLM",
        "", // Native asset has empty issuer
        "10000000",
        "stellar:testnet",
        mockFetch
      );

      expect(result.hasTrustline).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("balance validation", () => {
    it("should return null error when balance sufficient", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "50000000",
        "stellar:testnet",
        mockFetch
      );

      expect(result.error).toBeNull();
      expect(result.balance).toBe("1000.0000000");
    });

    it("should return INSUFFICIENT_BALANCE when balance too low", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_INSUFFICIENT_BALANCE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "50000000",
        "stellar:testnet",
        mockFetch
      );

      expect(result.error).toBe("INSUFFICIENT_BALANCE");
      expect(result.balance).toBe("10.0000000");
    });

    it("should handle large balance amounts", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "999999999999999999", // Very large amount (still less than 1000.0000000 converted)
        "stellar:testnet",
        mockFetch
      );

      // This should fail because 1000.0000000 < 999999999999999999 in stroops
      expect(result.error).toBe("INSUFFICIENT_BALANCE");
    });

    it("should validate exact balance match", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "10000000000", // Exactly 1000.0000000 in atomic units
        "stellar:testnet",
        mockFetch
      );

      expect(result.error).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should throw on account query failure", async () => {
      const failingFetch = async () => {
        throw new Error("Network error");
      };

      await expect(
        validateAccountPreflight(
          TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
          "USDC",
          TESTNET_USDC_ISSUER,
          "50000000",
          "stellar:testnet",
          failingFetch as typeof fetch
        )
      ).rejects.toThrow("Preflight validation failed");
    });
  });

  describe("asset configuration", () => {
    it("should handle XLM vs USDC correctly", async () => {
      const xlmResult = await validateAccountPreflight(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "XLM",
        "",
        "50000000",
        "stellar:testnet",
        mockFetch
      );

      expect(xlmResult.assetCode).toBe("XLM");
      expect(xlmResult.assetIssuer).toBe("");

      const usdcResult = await validateAccountPreflight(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "50000000",
        "stellar:testnet",
        mockFetch
      );

      expect(usdcResult.assetCode).toBe("USDC");
      expect(usdcResult.assetIssuer).toBe(TESTNET_USDC_ISSUER);
    });
  });

  describe("validation result structure", () => {
    it("should include all required fields on success", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "50000000",
        "stellar:testnet",
        mockFetch
      );

      expect(result).toHaveProperty("hasTrustline");
      expect(result).toHaveProperty("balance");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("assetCode");
      expect(result).toHaveProperty("assetIssuer");
      expect(result).toHaveProperty("requiredAmount");
    });

    it("should include asset details on error", async () => {
      const result = await validateAccountPreflight(
        TESTNET_ACCOUNT_NO_TRUSTLINE,
        "USDC",
        TESTNET_USDC_ISSUER,
        "50000000",
        "stellar:testnet",
        mockFetch
      );

      if (result.error) {
        expect(result.assetCode).toBe("USDC");
        expect(result.assetIssuer).toBe(TESTNET_USDC_ISSUER);
      }
    });
  });
});

describe("big integer balance comparison", () => {
  const mockFetch = createScenarioMockFetch();

  it("should correctly compare identical amounts", async () => {
    // This tests the internal compareBigInt function indirectly
    const result = await validateAccountPreflight(
      TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
      "USDC",
      TESTNET_USDC_ISSUER,
      "10000000000", // Exactly 1000 USDC in stroops
      "stellar:testnet",
      mockFetch
    );

    expect(result.error).toBeNull();
  });

  it("should correctly compare very large amounts", async () => {
    const result = await validateAccountPreflight(
      TESTNET_ACCOUNT_SUFFICIENT_BALANCE,
      "USDC",
      TESTNET_USDC_ISSUER,
      "100000000000000000000", // Way more than available
      "stellar:testnet",
      mockFetch
    );

    expect(result.error).toBe("INSUFFICIENT_BALANCE");
  });

  it("should handle amounts with leading zeros in balance", async () => {
    // Mock account with balance like "001000.0000000" (with leading zeros in account data)
    const customFetch = async () => {
      const account: StellarAccountInfo = {
        id: "GTEST",
        sequence: "123",
        balances: [
          {
            assetCode: "XLM",
            assetIssuer: null,
            balance: "100.0000000",
            limit: "unlimited"
          },
          {
            assetCode: "USDC",
            assetIssuer: TESTNET_USDC_ISSUER,
            balance: "00500.0000000", // With leading zeros
            limit: "10000.0000000"
          }
        ]
      };

      return new Response(JSON.stringify(account), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    };

    const result = await validateAccountPreflight(
      "GTEST",
      "USDC",
      TESTNET_USDC_ISSUER,
      "60000000", // 6 USDC, less than 500 USDC available
      "stellar:testnet",
      customFetch as typeof fetch
    );

    expect(result.error).toBeNull();
    expect(result.balance).toBe("00500.0000000");
  });
});
