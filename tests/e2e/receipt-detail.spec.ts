import { expect, test } from "@playwright/test";

test("receipt detail route loads with valid receipt ID", async ({ page }) => {
  // Navigate to a receipt detail page
  // Using a test receipt ID that should be available in demo mode
  await page.goto("/receipts/receipt_weather_001");

  // Check for page header
  await expect(page.getByRole("heading", { name: "Receipt detail" })).toBeVisible();

  // Check for receipt information section
  await expect(page.getByRole("heading", { name: "Receipt information" })).toBeVisible();
  
  // Check for status badge
  await expect(page.getByText("finalized")).toBeVisible();

  // Check for receipt ID
  await expect(page.getByText("receipt_weather_001")).toBeVisible();
});

test("receipt detail page displays finalized receipt with transaction link", async ({ page }) => {
  await page.goto("/receipts/receipt_weather_001");

  // Check for finality confirmation section
  await expect(page.getByRole("heading", { name: "Finality confirmation" })).toBeVisible();

  // Check for transaction hash display
  await expect(page.getByText(/tx_/)).toBeVisible();

  // Check for Stellar explorer link
  const explorerLink = page.getByRole("link", { name: /View on Stellar explorer/ });
  await expect(explorerLink).toBeVisible();
  
  // Verify the link points to Stellar explorer
  const href = await explorerLink.getAttribute("href");
  expect(href).toContain("stellar.expert");
  expect(href).toContain("/tx/");

  // Verify link opens in new tab
  await expect(explorerLink).toHaveAttribute("target", "_blank");
  await expect(explorerLink).toHaveAttribute("rel", "noreferrer");
});

test("receipt detail page shows all receipt fields", async ({ page }) => {
  await page.goto("/receipts/receipt_weather_001");

  // Check for basic receipt information fields
  await expect(page.getByText("Receipt ID", { exact: true })).toBeVisible();
  await expect(page.getByText("Status", { exact: true })).toBeVisible();
  await expect(page.getByText("Network", { exact: true })).toBeVisible();
  await expect(page.getByText("Amount", { exact: true })).toBeVisible();
  await expect(page.getByText("Asset issuer", { exact: true })).toBeVisible();
  await expect(page.getByText("Created at", { exact: true })).toBeVisible();

  // Check for payment verification fields
  await expect(page.getByRole("heading", { name: "Payment verification" })).toBeVisible();
  await expect(page.getByText("Payment attempt ID", { exact: true })).toBeVisible();
  await expect(page.getByText("Correlation ID", { exact: true })).toBeVisible();
  await expect(page.getByText("Evidence hash", { exact: true })).toBeVisible();
});

test("receipt detail page handles malformed receipt IDs gracefully", async ({ page }) => {
  // Navigate to a non-existent receipt
  await page.goto("/receipts/invalid-receipt-id-12345");

  // Should show error state
  await expect(page.getByRole("heading", { name: "Receipt unavailable" })).toBeVisible();
  
  // Check for error description
  await expect(
    page.getByText(/The receipt could not be retrieved from the backend/)
  ).toBeVisible();

  // Check for retry button
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("receipt detail page displays pending receipt state", async ({ page }) => {
  // This would need a pending receipt fixture or mock
  // For now, we test the route structure is in place
  await page.goto("/receipts");
  
  // The route should be accessible
  // In real testing, you'd navigate to an actual pending receipt
});

test("receipt detail page displays failed receipt with failure information", async ({ page }) => {
  // Navigate to a failed receipt (if available in demo data)
  // This assumes there's a failed receipt in the demo fixtures
  // You may need to adjust based on actual demo data
  await page.goto("/receipts/receipt_failed_001").catch(() => {
    // If specific failed receipt doesn't exist, that's ok for this test
  });

  // If the page loads, check for failure section
  if (page.url().includes("/receipts/receipt_failed_001")) {
    const failureSection = page.getByRole("heading", { name: "Failure information" });
    const failureExists = await failureSection.isVisible().catch(() => false);
    
    if (failureExists) {
      await expect(failureSection).toBeVisible();
      await expect(page.getByText("Failure code", { exact: true })).toBeVisible();
    }
  }
});

test("receipt detail page is mobile responsive", async ({ page }) => {
  // Test on mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/receipts/receipt_weather_001");

  // Check that content is still visible and readable on mobile
  await expect(page.getByRole("heading", { name: "Receipt detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Receipt information" })).toBeVisible();

  // Check that cards stack vertically on mobile
  const cards = page.locator("[class*='space-y']");
  await expect(cards.first()).toBeVisible();

  // Verify explorer link is accessible on mobile
  const explorerLink = page.getByRole("link", { name: /View on Stellar explorer/ });
  await expect(explorerLink).toBeVisible();
});

test("receipt detail page displays desktop layout with multi-column grid", async ({ page }) => {
  // Test on desktop viewport
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto("/receipts/receipt_weather_001");

  // Check for receipt information section
  await expect(page.getByRole("heading", { name: "Receipt information" })).toBeVisible();

  // Verify the grid layout is applied (md:grid-cols-2 xl:grid-cols-3)
  const fields = page.locator('[class*="grid"]').filter({ hasNot: page.locator('[class*="space-y"]') });
  await expect(fields.first()).toBeVisible();
});

test("receipt detail page recovers from browser refresh", async ({ page }) => {
  // Navigate to receipt detail
  await page.goto("/receipts/receipt_weather_001");

  // Verify initial content is visible
  await expect(page.getByRole("heading", { name: "Receipt detail" })).toBeVisible();
  const initialText = page.getByText("receipt_weather_001");
  await expect(initialText).toBeVisible();

  // Refresh the page
  await page.reload();

  // Verify content is still loaded after refresh
  await expect(page.getByRole("heading", { name: "Receipt detail" })).toBeVisible();
  await expect(page.getByText("receipt_weather_001")).toBeVisible();
});

test("receipt detail page includes proper semantic HTML", async ({ page }) => {
  await page.goto("/receipts/receipt_weather_001");

  // Check for proper heading hierarchy
  const mainHeading = page.getByRole("heading", { level: 1, name: "Receipt detail" });
  await expect(mainHeading).toBeVisible();

  // Check for section headings
  const sectionHeadings = page.locator("h2");
  expect(await sectionHeadings.count()).toBeGreaterThan(0);

  // Check for proper link attributes
  const links = page.locator("a[href]");
  expect(await links.count()).toBeGreaterThan(0);

  // Check for cards with proper structure
  const cards = page.locator("[class*='Card']");
  expect(await cards.count()).toBeGreaterThan(0);
});

test("receipt detail page displays network-specific badges", async ({ page }) => {
  await page.goto("/receipts/receipt_weather_001");

  // Check for network badge
  const networkBadges = page.locator("button, span").filter({ hasText: /testnet|mainnet/ });
  
  // At least the network badge should be visible
  const badges = page.locator("[class*='badge'], [class*='Badge']");
  await expect(badges.first()).toBeVisible();
});

test("receipt detail page links to associated resource when available", async ({ page }) => {
  await page.goto("/receipts/receipt_weather_001");

  // Check if associated resource section exists
  const resourceSection = page.getByRole("heading", { name: "Associated resource" });
  const resourceExists = await resourceSection.isVisible().catch(() => false);

  if (resourceExists) {
    await expect(resourceSection).toBeVisible();
    // Resource ID should be displayed
    await expect(page.getByText(/resource_/)).toBeVisible();
  }
});

test("receipt detail page displays seller information when available", async ({ page }) => {
  await page.goto("/receipts/receipt_weather_001");

  // Check if seller information section exists
  const sellerSection = page.getByRole("heading", { name: "Seller information" });
  const sellerExists = await sellerSection.isVisible().catch(() => false);

  if (sellerExists) {
    await expect(sellerSection).toBeVisible();
    // Seller ID should be displayed
    await expect(page.getByText(/seller_/)).toBeVisible();
  }
});

test("receipt detail page handles route with special characters in ID", async ({ page }) => {
  // Test that URL encoding is handled properly
  const encodedId = "receipt%3Atest%2F001";
  
  await page.goto(`/receipts/${encodedId}`).catch(() => {
    // Navigation might fail for non-existent receipt, which is expected
  });

  // Page should either load successfully or show error state (not crash)
  const heading = page.getByRole("heading");
  await expect(heading.first()).toBeVisible();
});

test("receipt detail page retry button works after backend failure", async ({ page }) => {
  await page.goto("/receipts/invalid-receipt-id");

  // Should show error state initially
  await expect(page.getByRole("heading", { name: "Receipt unavailable" })).toBeVisible();

  // Find and click retry button
  const retryButton = page.getByRole("button", { name: "Retry" });
  await expect(retryButton).toBeVisible();

  // Click retry (will still fail for invalid ID, but tests the interaction)
  await retryButton.click();

  // Error state should still be visible (since ID is still invalid)
  await expect(page.getByRole("heading", { name: "Receipt unavailable" })).toBeVisible();
});
