const https = require("https");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3OTg3NTMzMiwianRpIjoiNzExOWRlYjItN2QxMy00NzdmLTllNjQtMDI0NWU4OWIxOGE5IiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LnByaW5jZV8xNzMzNTVAc3VyZXBhc3MuaW8iLCJuYmYiOjE3Nzk4NzUzMzIsImV4cCI6MTc4MjQ2NzMzMiwiZW1haWwiOiJwcmluY2VfMTczMzU1QHN1cmVwYXNzLmlvIiwidGVuYW50X2lkIjoibWFpbiIsInVzZXJfY2xhaW1zIjp7InNjb3BlcyI6WyJ1c2VyIl19fQ.OYUpzQdPSUw8hvjKqkma_QSzGWyJlWjuUmzes3oRcjQ";

const body = JSON.stringify({ id_number: "999999990019" });

const options = {
  hostname: "sandbox.surepass.app",
  path: "/api/v1/aadhaar-v2/generate-otp",
  method: "POST",
  headers: {
    "Authorization": `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

console.log("Testing SurePass sandbox API...");
const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log("Response:", JSON.stringify(parsed, null, 2));
    } catch {
      console.log("Raw response:", data.slice(0, 500));
    }
  });
});
req.on("error", (e) => console.error("Request error:", e.message));
req.write(body);
req.end();
