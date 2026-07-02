/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { TpoHomePanel } from "../components/tpo-dashboard/TpoHomePanel";

const BASE_PROFILE = {
  tpoName: "TPO Admin",
  collegeName: "Test College",
  collegeLocation: "Mumbai",
  state: "Maharashtra",
  country: "India",
  district: "",
  address: "",
  pincode: "",
  websiteLink: "",
  linkedinUrl: "",
  socialMediaLink: "",
};

const BASE_PROPS = {
  studentDirectoryCount: 150,
  studentCountCapped: false,
  dashboardRollup: null,
  isRollupLoading: false,
  tpoProfile: BASE_PROFILE,
  activePostingsCount: 3,
  pendingInvitesCount: 5,
  setActiveMenu: jest.fn(),
};

describe("TpoHomePanel", () => {
  it("renders college name from tpoProfile in banner heading", () => {
    render(<TpoHomePanel {...BASE_PROPS} />);
    const h2 = screen.getByRole("heading", { name: /Test College/i });
    expect(h2).toBeInTheDocument();
  });

  it("falls back to 'Your College' when collegeName is empty", () => {
    render(<TpoHomePanel {...BASE_PROPS} tpoProfile={{ ...BASE_PROFILE, collegeName: "" }} />);
    const h2 = screen.getByRole("heading", { name: /Your College/i });
    expect(h2).toBeInTheDocument();
  });

  it("shows student count from directoryCount when rollup is null", () => {
    render(<TpoHomePanel {...BASE_PROPS} />);
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("prefers rollup studentCount over directoryCount", () => {
    render(
      <TpoHomePanel
        {...BASE_PROPS}
        dashboardRollup={{ studentCount: 300, applicationCount: 50, trainingAllCompletedCount: 20, pendingInviteCount: 8, lastRefreshed: "" }}
      />
    );
    expect(screen.getByText("300")).toBeInTheDocument();
  });

  it("shows loading placeholder '—' while rollup is loading", () => {
    render(<TpoHomePanel {...BASE_PROPS} isRollupLoading={true} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows 'Export for full list' note when studentCountCapped", () => {
    render(<TpoHomePanel {...BASE_PROPS} studentCountCapped={true} />);
    expect(screen.getByText(/Export for full list/i)).toBeInTheDocument();
  });

  it("shows 'In your college scope' note when not capped", () => {
    render(<TpoHomePanel {...BASE_PROPS} studentCountCapped={false} />);
    expect(screen.getByText(/In your college scope/i)).toBeInTheDocument();
  });

  it("renders all four quick-action cards", () => {
    render(<TpoHomePanel {...BASE_PROPS} />);
    expect(screen.getByText("Post a Drive")).toBeInTheDocument();
    expect(screen.getByText("Manage Students")).toBeInTheDocument();
    expect(screen.getByText("View Reports")).toBeInTheDocument();
    expect(screen.getByText("Pipeline View")).toBeInTheDocument();
  });

  it("shows applications from rollup", () => {
    render(
      <TpoHomePanel
        {...BASE_PROPS}
        dashboardRollup={{ studentCount: 100, applicationCount: 42, trainingAllCompletedCount: 10, pendingInviteCount: 2, lastRefreshed: "" }}
      />
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
