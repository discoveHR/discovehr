/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MailerStatusBanner } from "../components/common/MailerStatusBanner";

jest.mock("../lib/api/email", () => ({
  getMailerConfig: jest.fn(),
  sendTestEmail: jest.fn(),
}));

import { getMailerConfig, sendTestEmail } from "../lib/api/email";
const mockGetMailerConfig = getMailerConfig as jest.Mock;
const mockSendTestEmail = sendTestEmail as jest.Mock;

const CONFIGURED_CONFIG = {
  provider: "postmark",
  configured: true,
  fromEmail: "noreply@college.edu",
};

const UNCONFIGURED_CONFIG = {
  provider: "none",
  configured: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MailerStatusBanner — unconfigured", () => {
  it("shows warning when email is not configured", async () => {
    mockGetMailerConfig.mockResolvedValueOnce(UNCONFIGURED_CONFIG);
    render(<MailerStatusBanner />);
    await waitFor(() => expect(screen.getByText(/Email not configured/i)).toBeInTheDocument());
  });
});

describe("MailerStatusBanner — configured", () => {
  it("shows provider badge and from address", async () => {
    mockGetMailerConfig.mockResolvedValueOnce(CONFIGURED_CONFIG);
    render(<MailerStatusBanner />);
    await waitFor(() => expect(screen.getByText("Postmark")).toBeInTheDocument());
    expect(screen.getByText("noreply@college.edu")).toBeInTheDocument();
  });

  it("collapses test section by default", async () => {
    mockGetMailerConfig.mockResolvedValueOnce(CONFIGURED_CONFIG);
    render(<MailerStatusBanner />);
    await waitFor(() => expect(screen.getByText("Postmark")).toBeInTheDocument());
    expect(screen.queryByPlaceholderText(/Recipient/i)).not.toBeInTheDocument();
  });

  it("expands test section on toggle click", async () => {
    mockGetMailerConfig.mockResolvedValueOnce(CONFIGURED_CONFIG);
    render(<MailerStatusBanner />);
    await waitFor(() => screen.getByText("Test delivery"));
    fireEvent.click(screen.getByText("Test delivery"));
    expect(screen.getByPlaceholderText(/Recipient/i)).toBeInTheDocument();
  });

  it("sends test email on button click", async () => {
    mockGetMailerConfig.mockResolvedValueOnce(CONFIGURED_CONFIG);
    mockSendTestEmail.mockResolvedValueOnce({ sentTo: "test@example.com" });
    render(<MailerStatusBanner />);
    await waitFor(() => screen.getByText("Test delivery"));
    fireEvent.click(screen.getByText("Test delivery"));
    fireEvent.click(screen.getByText("Send test"));
    await waitFor(() => expect(screen.getByText(/Sent to/i)).toBeInTheDocument());
    expect(mockSendTestEmail).toHaveBeenCalledTimes(1);
  });

  it("shows error feedback on failed test email", async () => {
    mockGetMailerConfig.mockResolvedValueOnce(CONFIGURED_CONFIG);
    mockSendTestEmail.mockRejectedValueOnce(new Error("SMTP connection refused"));
    render(<MailerStatusBanner />);
    await waitFor(() => screen.getByText("Test delivery"));
    fireEvent.click(screen.getByText("Test delivery"));
    fireEvent.click(screen.getByText("Send test"));
    await waitFor(() => expect(screen.getByText(/SMTP connection refused/i)).toBeInTheDocument());
  });

  it("pressing Enter triggers send", async () => {
    mockGetMailerConfig.mockResolvedValueOnce(CONFIGURED_CONFIG);
    mockSendTestEmail.mockResolvedValueOnce({ sentTo: "test@example.com" });
    render(<MailerStatusBanner />);
    await waitFor(() => screen.getByText("Test delivery"));
    fireEvent.click(screen.getByText("Test delivery"));
    const input = screen.getByPlaceholderText(/Recipient/i);
    await userEvent.type(input, "test@example.com");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(mockSendTestEmail).toHaveBeenCalledTimes(1));
  });

  it("pressing Enter does NOT trigger second send while already sending", async () => {
    mockGetMailerConfig.mockResolvedValueOnce(CONFIGURED_CONFIG);
    let resolveSend!: (v: { sentTo: string }) => void;
    mockSendTestEmail.mockImplementationOnce(
      () => new Promise<{ sentTo: string }>((res) => { resolveSend = res; })
    );
    render(<MailerStatusBanner />);
    await waitFor(() => screen.getByText("Test delivery"));
    fireEvent.click(screen.getByText("Test delivery"));
    const input = screen.getByPlaceholderText(/Recipient/i);
    fireEvent.click(screen.getByText("Send test"));
    // While in-flight, pressing Enter should be a no-op
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    await act(async () => { resolveSend({ sentTo: "test@example.com" }); });
    // Only one call — the two Enter presses during send were suppressed
    expect(mockSendTestEmail).toHaveBeenCalledTimes(1);
  });

  it("returns null when config is still loading", () => {
    mockGetMailerConfig.mockReturnValueOnce(new Promise(() => {}));
    const { container } = render(<MailerStatusBanner />);
    expect(container.firstChild).toBeNull();
  });
});
