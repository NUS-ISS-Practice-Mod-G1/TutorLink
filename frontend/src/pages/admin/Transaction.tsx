import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/store";
import Navbar from "@/components/Navbar";
import { toast } from "react-toastify";
import { GetWalletByUserId, GetWalletTransactions } from "@/api/walletAPI"; // 👈 you’ll need to create backend endpoint for tutorId (same as student)

const Transaction = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.user);

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --------------------------
  // Fetch wallet details
  // --------------------------
  const fetchWallet = async () => {
    if (!user?.id || !user?.token) {
      toast.error("User not logged in");
      navigate("/login");
      return;
    }

    try {
      const [walletRes, txnRes] = await Promise.all([
        GetWalletByUserId("COMPANY_WALLET", user.token),
        GetWalletTransactions("COMPANY_WALLET", user.token),
      ]);

      setBalance(walletRes.data.balance ?? 0);
      setTransactions(txnRes.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch wallet details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Earnings</h1>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition">
            ← Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20 text-lg">Loading wallet...</div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-600">Current Balance</h2>
                <p className="text-3xl font-bold text-blue-600 mt-1">{balance} SGD</p>
              </div>
              <div className="text-right text-gray-500 text-sm">
                <p>Funds reflect session payouts and platform adjustments.</p>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
              {transactions.length === 0 ? (
                <div className="text-gray-400 text-center py-10">No transactions recorded yet.</div>
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
    </div>
  );
};

export default Transaction;
