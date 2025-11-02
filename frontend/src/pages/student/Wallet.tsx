import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import Navbar from "@/components/Navbar";
import { toast } from "react-toastify";
import {
  GetWalletByUserId,
  GetWalletTransactions,
  CreateCheckoutSession,
  SetWalletPin,
  WithdrawAllFunds,
} from "@/api/walletAPI";

const WalletPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.user);

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Top-up modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  // Wallet PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [isPinSet, setIsPinSet] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // --------------------------
  // Fetch wallet details
  // --------------------------
  const fetchWallet = async () => {
    if (!user?.id || !user?.token) {
      toast.error("User not logged in");
      navigate("/");
      return;
    }

    try {
      const [walletRes, txnRes] = await Promise.all([
        GetWalletByUserId(user.id, user.token),
        GetWalletTransactions(user.id, user.token),
      ]);

      setBalance(walletRes.data.balance ?? 0);
      setTransactions(txnRes.data ?? []);
      setIsPinSet(walletRes.data.pinSet ?? false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch wallet details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // Handle top-up confirm
  // --------------------------
  const confirmTopUp = async () => {
    if (!pendingAmount) return;
    if (!user?.id || !user?.token) {
      toast.error("User not logged in");
      navigate("/");
      return;
    }

    try {
      const res = await CreateCheckoutSession(user.id, pendingAmount, user.token);
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Failed to create Stripe session");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Stripe top-up failed");
      console.error(err);
    } finally {
      setShowConfirmModal(false);
      setPendingAmount(null);
    }
  };

  // --------------------------
  // Handle withdraw click
  // --------------------------
  const handleWithdrawClick = () => {
    if (!user?.id || !user?.token) {
      toast.error("User not logged in");
      navigate("/");
      return;
    }
    setShowPinModal(true);
  };

  // --------------------------
  // Submit PIN for set / withdraw
  // --------------------------
  const handlePinSubmit = async () => {
    if (!pinInput || pinInput.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }

    if (!user?.id || !user?.token) {
      toast.error("User not logged in");
      navigate("/");
      return;
    }

    setIsProcessing(true);
    try {
      if (!isPinSet) {
        // First-time setup
        await SetWalletPin(user.id, pinInput, user.token);
        toast.success("Wallet PIN set successfully");
        setIsPinSet(true);
      } else {
        // Withdraw funds
        const res = await WithdrawAllFunds(user.id, pinInput, user.token);
        toast.success(res.data.message || "Withdrawal successful");
        await fetchWallet();
      }
      setShowPinModal(false);
      setPinInput("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to process request");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------
  // URL status handler
  // --------------------------
  useEffect(() => {
    const status = searchParams.get("status");

    if (status === "success") {
      toast.success("Credits added successfully!");
    } else if (status === "cancelled") {
      toast.info("Payment was cancelled — no credits added.");
    }

    if (status) {
      searchParams.delete("status");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // --------------------------
  // Load wallet on mount
  // --------------------------
  useEffect(() => {
    fetchWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------
  // Show confirmation modal
  // --------------------------
  const openTopUpModal = (amount: number) => {
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid top-up amount");
      return;
    }
    setPendingAmount(amount);
    setShowConfirmModal(true);
  };

  // --------------------------
  // RENDER
  // --------------------------
  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/student/dashboard")}
              className="mr-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">
              ← Back
            </button>
            <h1 className="font-bold text-xl">My Wallet</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20 text-lg">Loading wallet...</div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-600">Current Balance</h2>
                <p className="text-3xl font-bold text-green-600 mt-1">{balance.toFixed(2)} SGD</p>
              </div>

              <div className="flex flex-col items-end gap-4">
                {/* --- Row: Preset + Custom Input --- */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => openTopUpModal(10)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                    Top-up 10
                  </button>
                  <button
                    onClick={() => openTopUpModal(50)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition">
                    Top-up 50
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    id="customTopUp"
                    className="w-50 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("customTopUp") as HTMLInputElement;
                      const amount = parseFloat(input.value);
                      openTopUpModal(amount);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
                    Top-up
                  </button>
                </div>

                {/* --- Withdraw All Funds --- */}
                <button
                  onClick={handleWithdrawClick}
                  className="mt-2 px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">
                  Withdraw All Funds
                </button>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
              {transactions.length === 0 ? (
                <div className="text-gray-400 text-center py-10">No transactions yet.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left text-gray-600">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="border-b last:border-none">
                        <td className="py-2">
                          {new Date(txn.createdAt || txn.date).toLocaleString()}
                        </td>
                        <td className="py-2">{txn.type}</td>
                        <td className="py-2">{txn.description}</td>
                        <td
                          className={`py-2 text-right font-semibold ${
                            txn.amount > 0 ? "text-green-600" : "text-red-500"
                          }`}>
                          {txn.amount > 0 ? "+" : ""}
                          {txn.amount} SGD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/*  Top-up Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 text-center">
            <h2 className="text-lg font-semibold mb-4">Confirm Top-up</h2>
            <p className="text-gray-700 mb-2">
              You are about to top-up{" "}
              <span className="font-bold text-green-600">{pendingAmount} SGD</span>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              After this top-up, your balance will be{" "}
              <span className="font-semibold text-green-700">
                {(balance + (pendingAmount ?? 0)).toFixed(2)} SGD
              </span>
              .
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmTopUp}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
                Yes, Top-up
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingAmount(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 text-center">
            <h2 className="text-lg font-semibold mb-4">
              {isPinSet ? "Enter Wallet PIN" : "Set Wallet PIN"}
            </h2>

            <input
              type="password"
              maxLength={6}
              placeholder="Enter 4-6 digit PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 mb-4 text-center"
            />

            <div className="flex justify-center gap-3">
              <button
                disabled={isProcessing}
                onClick={handlePinSubmit}
                className={`px-4 py-2 ${
                  isPinSet ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-md transition`}>
                {isProcessing ? "Processing..." : isPinSet ? "Confirm Withdraw" : "Set PIN"}
              </button>

              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput("");
                }}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
