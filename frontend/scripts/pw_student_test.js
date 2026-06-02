const { chromium } = require("playwright");
const fs = require("fs");
const outDir = process.env.TEMP + "\\scout_test";
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  // Login
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.fill("#email", "test.student.live@scout.dev");
  await page.fill("#password", "Scout@1234");
  await page.click("button[type=submit]");
  await page.waitForURL("**/student/dashboard**", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);
  console.log("Logged in, URL:", page.url());

  // Click Profile nav
  const profileBtn = page.getByRole("button", { name: "Profile" });
  await profileBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: outDir + "\\04_profile.png" });
  console.log("Profile section opened");

  // Click step 6: ID & profiles
  const idStepBtn = page.getByRole("button", { name: /ID.*profiles/i });
  if (await idStepBtn.count() > 0) {
    await idStepBtn.click();
    await page.waitForTimeout(1000);
  } else {
    // Try clicking by index (6th wizard step button)
    const wizardBtns = page.locator(".wizard-step");
    const count = await wizardBtns.count();
    console.log("Wizard step count:", count);
    if (count >= 6) {
      await wizardBtns.nth(5).click(); // 0-indexed, step 6 = index 5
      await page.waitForTimeout(1000);
    }
  }
  
  await page.screenshot({ path: outDir + "\\05_id_profiles.png" });
  console.log("ID & profiles step clicked");

  // Check for Aadhaar section
  const kycWidget = page.locator(".kyc-widget");
  const kycBadge = page.locator(".kyc-badge");
  const kycWidgetCount = await kycWidget.count();
  const kycBadgeCount = await kycBadge.count();
  console.log(".kyc-widget:", kycWidgetCount, "| .kyc-badge:", kycBadgeCount);

  // Screenshot the full identification step panel
  const panel = page.locator(".job-wizard-panel");
  if (await panel.count() > 0) {
    await panel.screenshot({ path: outDir + "\\05b_panel_detail.png" });
    const panelText = await panel.innerText();
    console.log("Panel text:", panelText.slice(0, 500));
  }

  // Fill Aadhaar number
  const aadhaarInput = page.locator("input[placeholder='12-digit number']");
  const aadhaarCount = await aadhaarInput.count();
  console.log("Aadhaar input found:", aadhaarCount);
  
  if (aadhaarCount > 0) {
    await aadhaarInput.fill("999999990019");
    await page.waitForTimeout(500);
    await page.screenshot({ path: outDir + "\\06_aadhaar_filled.png" });
    console.log("Aadhaar number filled");
    
    // Look for Send OTP button
    const sendOtpBtn = page.getByRole("button", { name: /send otp/i });
    if (await sendOtpBtn.count() > 0) {
      console.log("Send OTP button found - clicking...");
      await sendOtpBtn.click();
      await page.waitForTimeout(5000); // wait for SurePass API
      await page.screenshot({ path: outDir + "\\07_after_send_otp.png" });
      
      const errors = await page.locator(".form-error").evaluateAll(els => els.map(e => e.textContent));
      const kycHint = await page.locator(".kyc-hint").evaluateAll(els => els.map(e => e.textContent));
      const otpInput = page.locator(".kyc-otp-input");
      
      console.log("Errors:", JSON.stringify(errors));
      console.log("KYC hints:", JSON.stringify(kycHint));
      console.log("OTP input shown:", await otpInput.count() > 0);
    } else {
      console.log("Send OTP button NOT found");
      // Print all visible buttons in panel
      const btns = await page.locator(".job-wizard-panel button").evaluateAll(bs => bs.map(b => b.textContent?.trim()));
      console.log("Buttons in panel:", btns);
    }
  }

  await browser.close();
  console.log("\nAll screenshots saved to:", outDir);
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
