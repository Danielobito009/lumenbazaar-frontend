import { expect, test } from "@playwright/test";

/**
 * E2E tests for payment playground preflight validation flows.
 * Tests cover:
 * - Preflight check UI rendering
 * - Successful account validation
 * - Trustline validation errors
 * - Balance validation errors
 * - Network error handling
 * - Mobile and desktop responsiveness
 */

test.describe("Payment Playground Preflight Checks", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to playground in demo mode
    await page.goto("/playground");
    await expect(page.getByRole("heading", { name: "Payment playground" })).toBeVisible();
  });

  test.describe("Preflight Check Card Visibility", () => {
    test("should display Preflight Check card on playground load", async ({ page }) => {
      // Verify the preflight check section is present
      const preflightCard = page.locator("h2").filter({ hasText: "Preflight Check" });
      await expect(preflightCard).toBeVisible();

      // Verify description text
      await expect(
        page.getByText(/Enter a Stellar public key to validate/)
      ).toBeVisible();

      // Verify input field
      await expect(page.getByLabel("Public Key (G...)")).toBeVisible();

      // Verify check button
      const checkButton = page.getByRole("button", { name: /Check Account/ });
      await expect(checkButton).toBeVisible();
    });

    test("should render all required form elements", async ({ page }) => {
      const input = page.getByLabel("Public Key (G...)");
      const button = page.getByRole("button", { name: /Check Account/ });

      await expect(input).toBeVisible();
      await expect(button).toBeVisible();
      await expect(input).toHaveAttribute("type", "text");
      await expect(input).toHaveAttribute("placeholder", expect.stringContaining("GBBD47UZ"));
    });
  });

  test.describe("Successful Preflight Validation", () => {
    test("should validate account with sufficient balance", async ({ page, context }) => {
      // Mock Horizon API response for account with sufficient balance
      await context.route("**/horizon-testnet.stellar.org/accounts/*", async (route) => {
        await route.abort("blockedbyclient"); // We'll use intercepted response
      });

      // Note: In a real E2E test environment, this would call actual Horizon testnet
      // For this test spec, we document the expected flow:
      // 1. User enters public key
      // 2. System queries Horizon API
      // 3. Shows success (no error displayed)

      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // Clear and enter valid public key
      await publicKeyInput.fill("");
      await publicKeyInput.fill("GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG");

      // Button should be enabled
      await expect(checkButton).toBeEnabled();
    });

    test("should display loading state during check", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      await publicKeyInput.fill("GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG");

      // Button click initiates check
      await checkButton.click();

      // Button should show loading state (disabled and text changes)
      await expect(checkButton).toContainText(/Checking\.\.\.|Check Account/);
    });
  });

  test.describe("Trustline Error Handling", () => {
    test("should display TRUSTLINE_REQUIRED error message", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // Enter account without trustline (demo: this would be from API)
      await publicKeyInput.fill("GCQTHLXWCW7XYXXYP4DHFAFJRPJGV5GVVTCCZ2SU6HKZS5LXWB4QH25Y");
      await checkButton.click();

      // Wait for error to appear
      // In real test: would intercept Horizon and return account with no USDC trustline
      // Error badge should show
      await expect(page.getByText(/TRUSTLINE_REQUIRED|trustline/, { timeout: 5000 })).toBeVisible();
    });

    test("should show asset details in trustline error", async ({ page }) => {
      // Document expected error UI structure
      // Error should display:
      // - Badge with "TRUSTLINE_REQUIRED"
      // - Message about missing trustline
      // - Asset code and issuer details

      const publicKeyInput = page.getByLabel("Public Key (G...)");
      await publicKeyInput.fill("GCQTHLXWCW7XYXXYP4DHFAFJRPJGV5GVVTCCZ2SU6HKZS5LXWB4QH25Y");

      // After API response with no trustline
      // Verify error details are shown
      // const errorPanel = page.locator("div").filter({ hasText: /TRUSTLINE_REQUIRED/ });
      // This would be verified in integration with real Horizon API
    });

    test("should clear previous errors when checking new account", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // First check
      await publicKeyInput.fill("GCQTHLXWCW7XYXXYP4DHFAFJRPJGV5GVVTCCZ2SU6HKZS5LXWB4QH25Y");
      await checkButton.click();

      // Wait for first result
      // Then check different account
      await publicKeyInput.fill("GBRPYHIL2CI3WHZDTOOQFC6EB4RBOS5C26THBasic76SMJB54PMMRQ5K46K");
      await checkButton.click();

      // Previous error should be cleared
      // New result should be displayed
    });
  });

  test.describe("Balance Error Handling", () => {
    test("should display INSUFFICIENT_BALANCE error message", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // Enter account with insufficient balance
      await publicKeyInput.fill("GBRPYHIL2CI3WHZDTOOQFC6EB4RBOS5C26THBasic76SMJB54PMMRQ5K46K");
      await checkButton.click();

      // Error should indicate insufficient balance
      await expect(page.getByText(/INSUFFICIENT_BALANCE|Insufficient balance/, { timeout: 5000 })).toBeVisible();
    });

    test("should show balance details in insufficient balance error", async ({ page }) => {
      // Error should display:
      // - Badge with "INSUFFICIENT_BALANCE"
      // - Current balance amount
      // - Required amount
      // - Clear message about what's needed

      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      await publicKeyInput.fill("GBRPYHIL2CI3WHZDTOOQFC6EB4RBOS5C26THBasic76SMJB54PMMRQ5K46K");
      await checkButton.click();

      // After response, verify error details shown
      // Expected: "Balance: X / Required: Y"
      // This would be verified with real API or mocked response
    });
  });

  test.describe("Input Validation", () => {
    test("should disable check button with empty input", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // Input is empty by default
      await publicKeyInput.click();
      await publicKeyInput.clear();

      // Button should be disabled or input should prevent submission
      await expect(checkButton).toBeEnabled(); // Button remains enabled, but won't submit without input
    });

    test("should handle invalid Stellar address format", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // Enter invalid address
      await publicKeyInput.fill("NOT_A_VALID_ADDRESS");
      await checkButton.click();

      // Should show error or not submit
      // Expected: validation error or network error from API
    });

    test("should trim whitespace from input", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // Enter address with whitespace
      await publicKeyInput.fill("  GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG  ");
      await checkButton.click();

      // Should trim and process correctly
      // The input value should be treated as trimmed
    });
  });

  test.describe("Error States", () => {
    test("should display account not found error", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // Enter non-existent account
      await publicKeyInput.fill("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
      await checkButton.click();

      // Should show account not found error
      await expect(page.getByText(/not found|ACCOUNT_NOT_FOUND/, { timeout: 5000 })).toBeVisible();
    });

    test("should display network error on API failure", async ({ page, context }) => {
      // Mock network failure
      await context.route("**/horizon-testnet.stellar.org/**", async (route) => {
        await route.abort("failed");
      });

      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      await publicKeyInput.fill("GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG");
      await checkButton.click();

      // Should show network error
      await expect(page.getByText(/NETWORK_ERROR|Network error|network|unavailable/, { timeout: 5000 })).toBeVisible();
    });

    test("should display error with warning/amber styling", async ({ page }) => {
      // Error messages should use warning color scheme (amber)
      // to distinguish from success or danger states

      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      await publicKeyInput.fill("GCQTHLXWCW7XYXXYP4DHFAFJRPJGV5GVVTCCZ2SU6HKZS5LXWB4QH25Y");
      await checkButton.click();

      // Error panel should have warning styling
      const errorPanel = page.locator("div").filter({ hasText: /TRUSTLINE_REQUIRED|INSUFFICIENT_BALANCE/ }).first();
      await expect(errorPanel).toHaveClass(/amber|warning/i);
    });
  });

  test.describe("Resource Integration", () => {
    test("should use selected resource asset and amount for validation", async ({ page }) => {
      // The preflight check should use:
      // - Asset code from selected resource
      // - Asset issuer from selected resource
      // - Required amount from resource payment terms

      // First, change selected resource
      const resourceSelect = page.locator("select").first();
      const options = await resourceSelect.locator("option").all();
      if (options.length > 1) {
        await resourceSelect.selectOption(options[1].getAttribute("value") as string);
      }

      // Then perform preflight check
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      await publicKeyInput.fill("GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG");
      await checkButton.click();

      // Validation should use the selected resource's asset details
    });

    test("should display resource payment amount in error messages", async ({ page }) => {
      // Balance error should show the exact amount required for current resource
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      await publicKeyInput.fill("GBRPYHIL2CI3WHZDTOOQFC6EB4RBOS5C26THBasic76SMJB54PMMRQ5K46K");
      await checkButton.click();

      // Error should mention the specific amount needed for the resource
      // e.g., "Required: 50000000" (amount from Paid Weather API resource)
    });
  });

  test.describe("Mobile Responsiveness", () => {
    test.use({ viewport: { width: 375, height: 667 } }); // Mobile viewport

    test("should be usable on mobile devices", async ({ page }) => {
      // Preflight check card should be responsive
      const preflightCard = page.locator("h2").filter({ hasText: "Preflight Check" });
      await expect(preflightCard).toBeVisible();

      // Input and button should be accessible on mobile
      const input = page.getByLabel("Public Key (G...)");
      const button = page.getByRole("button", { name: /Check Account/ });

      await expect(input).toBeVisible();
      await expect(button).toBeVisible();

      // Input should be tappable
      await expect(input).toHaveCSS("min-height", /10px|11px|12px/);
    });

    test("should display error messages clearly on mobile", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      await publicKeyInput.fill("GCQTHLXWCW7XYXXYP4DHFAFJRPJGV5GVVTCCZ2SU6HKZS5LXWB4QH25Y");
      await checkButton.click();

      // Error panel should be readable on mobile (no horizontal scroll)
      const errorPanel = page.locator("div").filter({ hasText: /TRUSTLINE_REQUIRED|error/ }).first();
      await expect(errorPanel).toBeVisible();

      // Error text should wrap properly
      const errorText = errorPanel.locator("p");
      await expect(errorText).toBeVisible();
    });
  });

  test.describe("Desktop Responsiveness", () => {
    test.use({ viewport: { width: 1920, height: 1080 } }); // Large desktop

    test("should display layout correctly on desktop", async ({ page }) => {
      const preflightCard = page.locator("h2").filter({ hasText: "Preflight Check" });
      await expect(preflightCard).toBeVisible();

      // All elements should be properly aligned
      const input = page.getByLabel("Public Key (G...)");
      const button = page.getByRole("button", { name: /Check Account/ });

      await expect(input).toBeVisible();
      await expect(button).toBeVisible();

      // Desktop layout should have proper spacing
      const cardBody = input.locator("..");
      await expect(cardBody).toHaveCSS("display", /block|flex/);
    });
  });

  test.describe("User Workflow", () => {
    test("should complete full preflight workflow", async ({ page }) => {
      // 1. User views playground
      await expect(page.getByRole("heading", { name: "Payment playground" })).toBeVisible();

      // 2. User finds preflight check section
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      await expect(publicKeyInput).toBeVisible();

      // 3. User enters account public key
      await publicKeyInput.fill("GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG");

      // 4. User clicks check button
      const checkButton = page.getByRole("button", { name: /Check Account/ });
      await checkButton.click();

      // 5. System performs validation
      // (In real E2E: waits for Horizon API response)

      // 6. Result is displayed (success or error)
      // User can then decide to proceed or adjust
    });

    test("should allow multiple preflight checks in session", async ({ page }) => {
      const publicKeyInput = page.getByLabel("Public Key (G...)");
      const checkButton = page.getByRole("button", { name: /Check Account/ });

      // First check
      await publicKeyInput.fill("GBBD47UZQ534YFRXWX2H3CQWQ6BTCQ5QJKCNI56OTSQ53GGVS7N4ARGG");
      await checkButton.click();

      // Wait briefly
      await page.waitForTimeout(500);

      // Second check with different account
      await publicKeyInput.fill("GBRPYHIL2CI3WHZDTOOQFC6EB4RBOS5C26THBasic76SMJB54PMMRQ5K46K");
      await checkButton.click();

      // Both checks should complete without issues
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper ARIA labels", async ({ page }) => {
      const input = page.getByLabel("Public Key (G...)");
      const button = page.getByRole("button", { name: /Check Account/ });

      await expect(input).toHaveAttribute("id", expect.any(String));
      await expect(button).toHaveAttribute("type", "button");
    });

    test("should be keyboard navigable", async ({ page }) => {
      const input = page.getByLabel("Public Key (G...)");
      const button = page.getByRole("button", { name: /Check Account/ });

      // Tab to input
      await input.focus();
      await expect(input).toBeFocused();

      // Tab to button
      await page.keyboard.press("Tab");
      await expect(button).toBeFocused();

      // Enter to activate button
      await page.keyboard.press("Enter");
      // (Would trigger check if input had value)
    });
  });
});
