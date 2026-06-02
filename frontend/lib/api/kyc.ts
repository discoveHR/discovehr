import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

export type AadhaarOtpResponse = {
  clientId: string;
};

export type AadhaarVerifyData = {
  name: string | null;
  maskedAadhaar: string | null;
  dob: string | null;
  gender: string | null;
  address: Record<string, string> | null;
  photo: string | null;
};

export async function generateAadhaarOtp(aadhaarNumber: string): Promise<AadhaarOtpResponse> {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.student.generate_aadhaar_otp`,
    {
      method: "POST",
      headers: scoutJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({ aadhaar_number: aadhaarNumber }),
    },
  );
  const { body, raw } = await readScoutApiJson<{ client_id: string }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "OTP generation failed.");
  }
  return { clientId: body.data?.client_id ?? "" };
}

export async function verifyAadhaarOtp(
  clientId: string,
  otp: string,
): Promise<{ message: string; data: AadhaarVerifyData }> {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.student.verify_aadhaar_otp`,
    {
      method: "POST",
      headers: scoutJsonHeaders(),
      credentials: "include",
      body: JSON.stringify({ client_id: clientId, otp }),
    },
  );
  const { body, raw } = await readScoutApiJson<AadhaarVerifyData>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "OTP verification failed.");
  }
  return { message: body.message ?? "Verified.", data: body.data as unknown as AadhaarVerifyData };
}
