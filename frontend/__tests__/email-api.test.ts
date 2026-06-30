import { getMailerConfig, sendTestEmail } from "../lib/api/email";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function ok(data: object) {
  return { ok: true, status: 200, text: async () => JSON.stringify({ message: { ok: true, data } }) } as unknown as Response;
}
function err(status: number, message: string) {
  return { ok: false, status, text: async () => JSON.stringify({ message: { ok: false, message } }) } as unknown as Response;
}

beforeEach(() => mockFetch.mockReset());

describe("getMailerConfig", () => {
  it("returns config on success", async () => {
    mockFetch.mockResolvedValueOnce(ok({ provider: "postmark", configured: true, fromEmail: "a@b.com" }));
    const cfg = await getMailerConfig();
    expect(cfg.provider).toBe("postmark");
    expect(cfg.configured).toBe(true);
    expect(cfg.fromEmail).toBe("a@b.com");
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce(err(500, "Email backend unavailable"));
    await expect(getMailerConfig()).rejects.toThrow("Email backend unavailable");
  });

  it("calls the correct endpoint", async () => {
    mockFetch.mockResolvedValueOnce(ok({ provider: "none", configured: false }));
    await getMailerConfig();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("get_mailer_config"),
      expect.objectContaining({ method: "GET" })
    );
  });
});

describe("sendTestEmail", () => {
  it("sends test email to provided address", async () => {
    mockFetch.mockResolvedValueOnce(ok({ sentTo: "test@example.com" }));
    const result = await sendTestEmail("test@example.com");
    expect(result.sentTo).toBe("test@example.com");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("send_test_email"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends test email without address (uses login email)", async () => {
    mockFetch.mockResolvedValueOnce(ok({ sentTo: "me@college.edu" }));
    const result = await sendTestEmail();
    expect(result.sentTo).toBe("me@college.edu");
    // Body should be empty object when no email provided
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody).toEqual({});
  });

  it("trims whitespace from email address", async () => {
    mockFetch.mockResolvedValueOnce(ok({ sentTo: "trim@test.com" }));
    await sendTestEmail("  trim@test.com  ");
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody).toEqual({ toEmail: "trim@test.com" });
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce(err(500, "SMTP connection refused"));
    await expect(sendTestEmail("x@y.com")).rejects.toThrow("SMTP connection refused");
  });
});
