/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TpoSidebar } from "../components/tpo-dashboard/TpoSidebar";

const mockSetActiveMenu = jest.fn();
const mockHandleLogout = jest.fn();
const mockOnClose = jest.fn();

const BASE_PROPS = {
  activeMenu: "home" as const,
  setActiveMenu: mockSetActiveMenu,
  handleLogout: mockHandleLogout,
  displayName: "Alice Smith",
  userEmail: "alice@test.com",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TpoSidebar", () => {
  it("renders the brand name", () => {
    render(<TpoSidebar {...BASE_PROPS} />);
    expect(screen.getByText(/DiscoveHR|Discove/i)).toBeInTheDocument();
  });

  it("renders navigation section labels", () => {
    render(<TpoSidebar {...BASE_PROPS} />);
    expect(screen.getByText(/Main|Overview/i)).toBeInTheDocument();
  });

  it("renders student-related nav button", () => {
    render(<TpoSidebar {...BASE_PROPS} />);
    expect(screen.getByRole("button", { name: /^Students$/i })).toBeInTheDocument();
  });

  it("calls setActiveMenu when a nav item is clicked", () => {
    render(<TpoSidebar {...BASE_PROPS} />);
    fireEvent.click(screen.getByRole("button", { name: /^Students$/i }));
    expect(mockSetActiveMenu).toHaveBeenCalledWith("students");
  });

  it("marks active menu item with aria-current=page", () => {
    render(<TpoSidebar {...BASE_PROPS} activeMenu="students" />);
    const studentsBtn = screen.getByRole("button", { name: /^Students$/i });
    expect(studentsBtn).toHaveAttribute("aria-current", "page");
  });

  it("does not mark inactive menu item with aria-current", () => {
    render(<TpoSidebar {...BASE_PROPS} activeMenu="home" />);
    const studentsBtn = screen.getByRole("button", { name: /^Students$/i });
    expect(studentsBtn).not.toHaveAttribute("aria-current");
  });

  it("shows user initials avatar — two words", () => {
    render(<TpoSidebar {...BASE_PROPS} displayName="Alice Smith" />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("shows user initials avatar — single word uses first 2 chars", () => {
    render(<TpoSidebar {...BASE_PROPS} displayName="Alice" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("shows displayName and email in footer", () => {
    render(<TpoSidebar {...BASE_PROPS} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
  });

  it("calls handleLogout when Sign out is clicked", () => {
    render(<TpoSidebar {...BASE_PROPS} />);
    fireEvent.click(screen.getByText("Sign out"));
    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });

  it("calls onClose after nav click when provided", () => {
    render(<TpoSidebar {...BASE_PROPS} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole("button", { name: /^Students$/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("renders close button when onClose is provided", () => {
    render(<TpoSidebar {...BASE_PROPS} onClose={mockOnClose} />);
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
  });

  it("does not render close button when onClose is not provided", () => {
    render(<TpoSidebar {...BASE_PROPS} />);
    expect(screen.queryByLabelText("Close menu")).not.toBeInTheDocument();
  });
});
