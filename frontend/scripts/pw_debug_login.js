const { chromium } = require("playwright");
const fs = require("fs");
const outDir = process.env.TEMP + "\\scout_test";
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  // Capture console and network errors
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  
  await page.fill("#email", "test.student.live@scout.dev");
  await page.fill("#password", "Scout@1234");
  await page.click("button[type=submit]");
  
  // Wait a bit to capture response
  await page.waitForTimeout(6000);
  
  const url = page.url();
  const bodyText = await page.locator("body").innerText();
  const formErrors = await page.locator(".form-error").evaluateAll(els => els.map(e => e.textContent));
  
  console.log("URL:", url);
  console.log("Form errors:", JSON.stringify(formErrors));
  console.log("Console errors:", JSON.stringify(errors));
  console.log("Body (500 chars):", bodyText.slice(0, 500));
  
  await page.screenshot({ path: outDir + "\\login_debug.png" });
  await browser.close();
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
