const { chromium } = require("playwright");
const outDir = process.env.TEMP + "\\scout_test";
require("fs").mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  await page.goto("http://localhost:3000/login");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: outDir + "\\01_login.png" });
  console.log("1. Login page:", await page.title());
  const bodyText = await page.locator("body").innerText();
  console.log("Body excerpt:", bodyText.slice(0, 400));
  await browser.close();
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
