/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import WalletSuccessPage from "@/pages/student/WalletSuccessPage";
import { Provider } from "react-redux";
import store from "@/redux/store";
import { MemoryRouter } from "react-router-dom";
import * as storeModule from "@/redux/store";
import { TopUpWallet } from "@/api/walletAPI";

// 🧩 Mock Navbar
jest.mock("@/components/Navbar", () => () => <div data-testid="navbar">Mock Navbar</div>);

// 🧩 Mock API
jest.mock("@/api/walletAPI", () => ({
  TopUpWallet: jest.fn(),
}));

// 🧩 Mock toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("react-toastify", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

// 🧩 Mock navigation
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useSearchParams: () => [
    new URLSearchParams("studentId=s1&amount=50"), // default query
  ],
  useNavigate: () => mockNavigate,
}));

// 🧩 Mock Redux user
jest
  .spyOn(storeModule, "useAppSelector")
  .mockImplementation((selector: any) =>
    selector({ user: { user: { id: "s1", token: "mock-token", name: "Alice" } } })
  );

// 🧩 Helper render
const renderComponent = () =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <WalletSuccessPage />
      </MemoryRouter>
    </Provider>
  );

describe("WalletSuccessPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers(); // control setTimeout
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("shows processing message initially", async () => {
    (TopUpWallet as jest.Mock).mockResolvedValueOnce({
      data: { refId: "mock-ref-123" },
    });

    renderComponent();

    expect(screen.getByText(/Processing Payment/i)).toBeInTheDocument();
  });

  test("handles successful top-up flow", async () => {
    (TopUpWallet as jest.Mock).mockResolvedValueOnce({
      data: { refId: "mock-ref-123" },
    });

    renderComponent();

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("50 credits added to your wallet");
      expect(screen.getByText(/Payment Successful/i)).toBeInTheDocument();
    });

    // verify localStorage set
    expect(localStorage.getItem("wallet-topup-s1-50-mock-ref-123")).toBe("done");

    // simulate redirect timer
    act(() => {
      jest.runAllTimers();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/student/wallet?status=success");
  });

  test("skips duplicate top-up if already processed", async () => {
    // This is the key your component will check after API response
    const uniqueKey = "wallet-topup-s1-50-mock-ref-123";
    localStorage.setItem(uniqueKey, "done");
  
    // Mock API returning same refId
    (TopUpWallet as jest.Mock).mockResolvedValueOnce({
      data: { refId: "mock-ref-123" },
    });
  
    renderComponent();
  
    // Wait for success message
    const successText = await screen.findByText(/Payment Successful/i);
    expect(successText).toBeInTheDocument();
  
    // API still called once (it must call to get refId)
    expect(TopUpWallet).toHaveBeenCalledTimes(1);
  
    // But since key existed, it doesn't create duplicate
    expect(localStorage.getItem(uniqueKey)).toBe("done");
  });

  test("handles API failure gracefully", async () => {
    (TopUpWallet as jest.Mock).mockRejectedValueOnce(new Error("Server error"));

    renderComponent();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to update wallet balance");
      expect(screen.getByText(/Payment Failed/i)).toBeInTheDocument();
    });
  });

  test("clicking Back to Wallet navigates correctly", async () => {
    (TopUpWallet as jest.Mock).mockRejectedValueOnce(new Error("Server error"));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Back to Wallet/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Back to Wallet/i));
    expect(mockNavigate).toHaveBeenCalledWith("/student/wallet");
  });
});
