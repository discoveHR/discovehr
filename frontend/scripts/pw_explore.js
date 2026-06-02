const { chromium } = require("playwright");
const fs = require("fs");
const outDir = process.env.TEMP + "\\scout_test";
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  console.log("Going to student dashboard...");
  await page.goto("http://localhost:3000/student/dashboard", { waitUntil: "domcontentloaded", timeout: 60000 });
  
  // Wait for content to settle (auth check + data load)
  await page.waitForTimeout(6000);
  
  const finalUrl = page.url();
  console.log("URL after 6s:", finalUrl);
  await page.screenshot({ path: outDir + "\\03_dashboard_settled.png" });
  
  const bodyText = await page.locator("body").innerText().catch(() => "");
  console.log("Body text:", bodyText.slice(0, 600));
  
  // Check if profile nav item exists
  const profileBtn = page.getByRole("button", { name: /profile/i });
  const profileExists = await profileBtn.count();
  console.log("Profile nav button count:", profileExists);
  
  await browser.close();
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
