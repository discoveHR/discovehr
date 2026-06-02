const http = require("http");

const body = JSON.stringify({ aadhaar_number: "123456789012" });

const options = {
  hostname: "localhost",
  port: 8000,
  path: "/api/method/scout.api.student.generate_aadhaar_otp",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

console.log("Testing Frappe KYC endpoint registration...");
const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data.slice(0, 500));
    
    if (res.statusCode === 404) {
      console.log("\n⚠️  404 = endpoint NOT registered in Frappe");
    } else if (res.statusCode === 403 || res.statusCode === 401) {
      console.log("\n✓ Endpoint IS registered (auth required - expected)");
    } else {
      console.log("\nOther status - check details above");
    }
  });
});
req.on("error", (e) => console.error("Error:", e.message));
req.write(body);
req.end();
