import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Navbar from "@/components/Navbar";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { setUser } from "@/redux/userSlice";
import { GetAdminByUserId } from "@/api/adminAPI";
import { fetchNotifications, markNotificationAsRead, subscribeToNotifications } from "@/api/notificationAPI";
import { navConfig } from "@/components/NavLinks";
import type { MockedFunction } from "jest-mock";
import type { NotificationType } from "@/types/NotificationType";
import type { AxiosResponse } from "axios";

// --------------------
// 🧩 Mock Dependencies
// --------------------
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

jest.mock("@/redux/store", () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock("@/redux/userSlice", () => ({
  setUser: jest.fn(),
}));

jest.mock("@/api/adminAPI", () => ({
  GetAdminByUserId: jest.fn(),
}));

jest.mock("@/api/notificationAPI", () => ({
  fetchNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  subscribeToNotifications: jest.fn((_id, onMessage) => {
    onMessage({
      id: "n1",
      message: "Test notification",
      read: false,
      type: "BOOKING",
    });
    return { close: jest.fn() };
  }),
}));

jest.mock("@/components/NavLinks", () => ({
  navConfig: {
    ADMIN: [{ path: "/admin/dashboard", name: "Dashboard" }],
  },
}));

jest.mock("@/components/NotificationsModal", () => {
  return ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="notif-modal">
        Notifications Modal <button onClick={onClose}>Close</button>
      </div>
    ) : null;
});

// --------------------
// ⚙️ Common Setup
// --------------------
const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockLocation = { pathname: "/admin/dashboard" };

// Suppress noisy console errors (caught API rejections, act warnings, etc.)
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

// Mock EventSource (for SSE)
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  close = jest.fn();
  constructor(public url: string) {}
}
(global as any).EventSource = MockEventSource;

// Typed mocks
const mockFetchNotifications = fetchNotifications as MockedFunction<typeof fetchNotifications>;
const mockMarkNotificationAsRead = markNotificationAsRead as MockedFunction<
  typeof markNotificationAsRead
>;
const mockGetAdminByUserId = GetAdminByUserId as MockedFunction<typeof GetAdminByUserId>;

// AxiosResponse helper (type-safe mock)
const mockAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config: { headers: {} } as any,
});

// Factory to create mock NotificationType
const makeNotification = (overrides: Partial<NotificationType> = {}): NotificationType => ({
  id: "n1",
  userId: "u1",
  type: "BOOKING",
  bookingId: "b1",
  message: "Default message",
  read: false,
  createdAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

// Global beforeEach default mocks
beforeEach(() => {
  jest.clearAllMocks();

  (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
  (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  (useLocation as jest.Mock).mockReturnValue(mockLocation);

  // ✅ Prevent undefined .data errors in Navbar
  mockGetAdminByUserId.mockResolvedValue(mockAxiosResponse({ permissions: [] }));
  mockFetchNotifications.mockResolvedValue(mockAxiosResponse([]));
});

// --------------------
// 🧪 Tests
// --------------------
describe("Navbar Component", () => {
  test("renders TutorLink logo and nav links", async () => {
    (useAppSelector as jest.Mock).mockReturnValue({
      user: { id: "1", token: "abc", role: "ADMIN", permissions: [] },
    });

    render(<Navbar />);
    await waitFor(() => {
      expect(screen.getByText(/TutorLink/i)).toBeInTheDocument();
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
  });

  test("shows unread notification count when notifications exist", async () => {
    (useAppSelector as jest.Mock).mockReturnValue({
      user: { id: "1", token: "abc", role: "ADMIN" },
    });

    mockFetchNotifications.mockResolvedValue(
      mockAxiosResponse([
        makeNotification({ read: false }),
        makeNotification({ id: "n2", read: true }),
      ])
    );

    render(<Navbar />);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  test("opens and closes notifications modal", async () => {
    (useAppSelector as jest.Mock).mockReturnValue({
      user: { id: "1", token: "abc", role: "ADMIN" },
    });

    render(<Navbar />);
    const notifButton = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(notifButton);
    expect(screen.getByTestId("notif-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close"));
    await waitFor(() => expect(screen.queryByTestId("notif-modal")).not.toBeInTheDocument());
  });

  test("logs out and navigates to admin login", () => {
    (useAppSelector as jest.Mock).mockReturnValue({
      user: { id: "1", token: "abc", role: "ADMIN" },
    });

    render(<Navbar />);
    const logoutButton = screen.getByRole("button", { name: /Logout/i });
    fireEvent.click(logoutButton);

    expect(mockDispatch).toHaveBeenCalledWith(setUser(null));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/login");
  });

  test("fetches admin permissions if user has none", async () => {
    (useAppSelector as jest.Mock).mockReturnValue({
      user: { id: "1", token: "abc", role: "ADMIN", permissions: [] },
    });

    mockGetAdminByUserId.mockResolvedValue(mockAxiosResponse({ permissions: ["VIEW_DASHBOARD"] }));

    render(<Navbar />);
    await waitFor(() => expect(mockGetAdminByUserId).toHaveBeenCalledWith("1", "abc"));
    expect(mockDispatch).toHaveBeenCalled();
  });
});
