/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TpoStudentsPanel } from "../components/tpo-dashboard/TpoStudentsPanel";

jest.mock("next/link", () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) =>
    <a href={href} {...rest}>{children}</a>;
  Link.displayName = "Link";
  return { default: Link, __esModule: true };
});

jest.mock("../lib/api", () => ({
  searchTpoStudents: jest.fn(),
  listTpoStudentsByParameters: jest.fn(),
  tpoStudent360Path: jest.fn((id: string) => `/tpo/students/${id}`),
}));

jest.mock("../components/common/MailerStatusBanner", () => ({
  MailerStatusBanner: () => <div data-testid="mailer-banner" />,
}));

import { searchTpoStudents } from "../lib/api";
const mockSearch = searchTpoStudents as jest.Mock;

const EMPTY_PAGINATION = { page: 1, pageSize: 50, total: 0, totalPages: 1, truncated: false, hasNext: false, hasPrev: false };
const SAMPLE_STUDENT = {
  studentId: "u1@test.com", fullName: "Alice Smith", email: "u1@test.com",
  branch: "CS", batch: "2025", college: "IIT", phone: "", state: "", country: "",
  areaOfStudy: "", courseClassGrade: "", resumeFile: "", inviteStatus: "", isPendingInvite: false,
};

const BASE_PROPS = {
  activeStudentTab: "all" as const,
  setActiveStudentTab: jest.fn(),
  isStudentsLoading: false,
  studentRows: [SAMPLE_STUDENT],
  studentPagination: { page: 1, pageSize: 50, total: 1, totalPages: 1, truncated: false, hasNext: false, hasPrev: false },
  goToStudentPage: jest.fn(),
  batchFilter: "",
  setBatchFilter: jest.fn(),
  addStudentForm: { email: "", fullName: "", branch: "", batch: "", year: "", phone: "" },
  setAddStudentForm: jest.fn(),
  handleAddStudent: jest.fn(),
  isAddingStudent: false,
  studentInvites: [],
  downloadFilters: { branch: "", batch: "", state: "", country: "", areaOfStudy: "" },
  setDownloadFilters: jest.fn(),
  handleDownloadFilteredStudents: jest.fn(),
  isProfileEditsLoading: false,
  profileEditRequests: [],
  loadProfileEditRequests: jest.fn(),
  handleApproveProfileEdit: jest.fn(),
  approvingStudentId: "",
  bulkUploadForm: { defaultBatch: "", defaultDepartment: "", defaultYear: "", createInviteForMissing: true },
  setBulkUploadForm: jest.fn(),
  bulkUploadFile: null,
  setBulkUploadFile: jest.fn(),
  isBulkUploading: false,
  handleBulkStudentUpload: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // jsdom doesn't implement URL.createObjectURL
  global.URL.createObjectURL = jest.fn(() => "blob:mock");
  global.URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("TpoStudentsPanel — All Students tab", () => {
  it("renders student rows in the default all tab", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("shows loading state while students load", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} isStudentsLoading={true} studentRows={[]} />);
    expect(screen.getByText(/Loading students/i)).toBeInTheDocument();
  });

  it("shows searching state while search is running", async () => {
    mockSearch.mockReturnValueOnce(new Promise(() => {}));
    render(<TpoStudentsPanel {...BASE_PROPS} />);
    const input = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(input, { target: { value: "al" } });
    act(() => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByText(/Searching/i)).toBeInTheDocument());
  });

  it("renders search results when search succeeds", async () => {
    const hit = { studentId: "u2@test.com", fullName: "Bob Jones", email: "u2@test.com", branch: "ME", batch: "2026", college: "NIT", rollNumber: "" };
    mockSearch.mockResolvedValueOnce([hit]);
    render(<TpoStudentsPanel {...BASE_PROPS} studentRows={[]} />);
    const input = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(input, { target: { value: "bob" } });
    act(() => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByText("Bob Jones")).toBeInTheDocument());
  });

  it("shows error message when search fails", async () => {
    mockSearch.mockRejectedValueOnce(new Error("Search timed out"));
    render(<TpoStudentsPanel {...BASE_PROPS} />);
    const input = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(input, { target: { value: "xyz" } });
    act(() => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByText(/Search failed: Search timed out/i)).toBeInTheDocument());
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("clears results when search is cleared", async () => {
    mockSearch.mockResolvedValueOnce([]);
    render(<TpoStudentsPanel {...BASE_PROPS} />);
    const input = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(input, { target: { value: "nobody" } });
    act(() => { jest.advanceTimersByTime(400); });
    await waitFor(() => screen.getByText(/0 results/i));
    fireEvent.click(screen.getByLabelText("Clear search"));
    // Advance timer so debounce fires runSearch("") which resets searchRows to null
    act(() => { jest.advanceTimersByTime(400); });
    await waitFor(() => expect(screen.getByText("Alice Smith")).toBeInTheDocument());
  });

  it("does not call search API for 1-char query", async () => {
    render(<TpoStudentsPanel {...BASE_PROPS} />);
    const input = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(input, { target: { value: "a" } });
    act(() => { jest.advanceTimersByTime(400); });
    expect(mockSearch).not.toHaveBeenCalled();
  });
});

describe("TpoStudentsPanel — pagination buttons", () => {
  it("calls goToStudentPage with page+1 when Next is clicked", () => {
    const goTo = jest.fn();
    render(<TpoStudentsPanel {...BASE_PROPS}
      studentPagination={{ page: 1, pageSize: 50, total: 100, totalPages: 2, truncated: false, hasPrev: false, hasNext: true }}
      goToStudentPage={goTo}
    />);
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(goTo).toHaveBeenCalledWith(2);
  });

  it("calls goToStudentPage with page-1 when Prev is clicked", () => {
    const goTo = jest.fn();
    render(<TpoStudentsPanel {...BASE_PROPS}
      studentPagination={{ page: 2, pageSize: 50, total: 100, totalPages: 2, truncated: false, hasPrev: true, hasNext: false }}
      goToStudentPage={goTo}
    />);
    fireEvent.click(screen.getByRole("button", { name: /Prev/i }));
    expect(goTo).toHaveBeenCalledWith(1);
  });
});

describe("TpoStudentsPanel — Tab switching", () => {
  it("calls setActiveStudentTab when a tab is clicked", () => {
    const setTab = jest.fn();
    render(<TpoStudentsPanel {...BASE_PROPS} setActiveStudentTab={setTab} />);
    fireEvent.click(screen.getByRole("tab", { name: /Bulk Upload/i }));
    expect(setTab).toHaveBeenCalledWith("bulk-upload");
  });

  it("marks the active tab with aria-selected", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="all" />);
    const allTab = screen.getByRole("tab", { name: /All Students/i });
    expect(allTab).toHaveAttribute("aria-selected", "true");
  });
});

describe("TpoStudentsPanel — Bulk Upload tab", () => {
  const BULK_PROPS = { ...BASE_PROPS, activeStudentTab: "bulk-upload" as const };

  it("shows the dropzone when no file is selected", () => {
    render(<TpoStudentsPanel {...BULK_PROPS} />);
    expect(screen.getByText(/Drag & drop/i)).toBeInTheDocument();
  });

  it("shows filename when a file is selected", () => {
    const file = new File(["email\nalice@test.com"], "students.csv", { type: "text/csv" });
    render(<TpoStudentsPanel {...BULK_PROPS} bulkUploadFile={file} />);
    expect(screen.getByText("students.csv")).toBeInTheDocument();
  });

  it("disables the Upload button when no file selected", () => {
    render(<TpoStudentsPanel {...BULK_PROPS} />);
    const btn = screen.getByRole("button", { name: /Upload Students/i });
    expect(btn).toBeDisabled();
  });

  it("enables the Upload button when file is selected", () => {
    const file = new File(["email\nalice@test.com"], "students.csv", { type: "text/csv" });
    render(<TpoStudentsPanel {...BULK_PROPS} bulkUploadFile={file} />);
    const btn = screen.getByRole("button", { name: /Upload Students/i });
    expect(btn).not.toBeDisabled();
  });

  it("shows progress text while upload is in progress", () => {
    const file = new File(["email\nalice@test.com"], "students.csv", { type: "text/csv" });
    render(<TpoStudentsPanel {...BULK_PROPS} bulkUploadFile={file} isBulkUploading={true} />);
    expect(screen.getByText(/Processing upload/i)).toBeInTheDocument();
  });

  it("calls handleBulkStudentUpload on form submit", () => {
    const handleBulk = jest.fn(async (e: React.FormEvent) => { e.preventDefault(); });
    const file = new File(["email\nalice@test.com"], "students.csv", { type: "text/csv" });
    render(<TpoStudentsPanel {...BULK_PROPS} bulkUploadFile={file} handleBulkStudentUpload={handleBulk} />);
    const btn = screen.getByRole("button", { name: /Upload Students/i });
    fireEvent.click(btn);
    expect(handleBulk).toHaveBeenCalled();
  });

  it("renders sample template download button", () => {
    render(<TpoStudentsPanel {...BULK_PROPS} />);
    expect(screen.getByRole("button", { name: /Sample Template/i })).toBeInTheDocument();
  });

  it("triggers download when Sample Template is clicked", () => {
    render(<TpoStudentsPanel {...BULK_PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: /Sample Template/i }));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});

describe("TpoStudentsPanel — Add Student tab", () => {
  it("renders the add student form", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="add" />);
    expect(screen.getByPlaceholderText(/student@college.edu/i)).toBeInTheDocument();
  });

  it("disables submit button while adding", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="add" isAddingStudent={true} />);
    // The button label changes to "Sending…" while in progress
    const sendingBtn = screen.getByRole("button", { name: /Sending/i });
    expect(sendingBtn).toBeDisabled();
  });
});

describe("TpoStudentsPanel — By Batch tab", () => {
  it("renders batch filter input", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="batch" />);
    expect(screen.getByPlaceholderText(/e\.g\. 2025/i)).toBeInTheDocument();
  });

  it("calls setBatchFilter when filter changes", () => {
    const setBatch = jest.fn();
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="batch" setBatchFilter={setBatch} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 2025/i), { target: { value: "2025" } });
    expect(setBatch).toHaveBeenCalledWith("2025");
  });
});

describe("TpoStudentsPanel — Invites tab", () => {
  it("shows empty state when no invites", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="invites" studentInvites={[]} />);
    expect(screen.getByText(/No invites sent yet/i)).toBeInTheDocument();
  });

  it("renders invite rows when invites exist", () => {
    const invites = [{
      id: "inv1", email: "bob@test.com", status: "Pending" as const,
      branch: "CS", batch: "2025", year: "3", expiresAt: "2026-07-01", acceptedAt: "",
    }];
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="invites" studentInvites={invites} />);
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });
});

describe("TpoStudentsPanel — Export tab", () => {
  it("renders the Download CSV button", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="download" />);
    expect(screen.getByRole("button", { name: /Download CSV/i })).toBeInTheDocument();
  });

  it("calls handleDownloadFilteredStudents when Download CSV clicked", () => {
    const handleDownload = jest.fn();
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="download" handleDownloadFilteredStudents={handleDownload} />);
    fireEvent.click(screen.getByRole("button", { name: /Download CSV/i }));
    expect(handleDownload).toHaveBeenCalledTimes(1);
  });
});

describe("TpoStudentsPanel — Profile Edits tab", () => {
  it("shows loading state while loading", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="profile-edits" isProfileEditsLoading={true} />);
    expect(screen.getByText(/Loading profile edit requests/i)).toBeInTheDocument();
  });

  it("shows empty state when no requests", () => {
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="profile-edits" profileEditRequests={[]} />);
    expect(screen.getByText(/No pending requests/i)).toBeInTheDocument();
  });

  it("renders approve button for each pending request", () => {
    const requests = [{ studentId: "u1@t.com", fullName: "Alice", email: "u1@t.com", college: "IIT", batch: "2025", branch: "CS", profileComplete: true }];
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="profile-edits" profileEditRequests={requests} />);
    expect(screen.getByRole("button", { name: /Approve/i })).toBeInTheDocument();
  });

  it("calls handleApproveProfileEdit when approve clicked", () => {
    const handleApprove = jest.fn();
    const requests = [{ studentId: "u1@t.com", fullName: "Alice", email: "u1@t.com", college: "IIT", batch: "2025", branch: "CS", profileComplete: true }];
    render(<TpoStudentsPanel {...BASE_PROPS} activeStudentTab="profile-edits" profileEditRequests={requests} handleApproveProfileEdit={handleApprove} />);
    fireEvent.click(screen.getByRole("button", { name: /Approve/i }));
    expect(handleApprove).toHaveBeenCalledWith("u1@t.com");
  });
});
