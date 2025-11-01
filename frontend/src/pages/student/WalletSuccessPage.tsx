import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/redux/store";
import { toast } from "react-toastify";
import { TopUpWallet } from "@/api/walletAPI";
import Navbar from "@/components/Navbar";

const WalletSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.user);

  const [status, setStatus] = useState<"processing" | "success" | "failed">("processing");
  const hasProcessedRef = useRef(false); // 🧠 stops double-call during React re-renders

  const studentId = searchParams.get("studentId");
  const amount = searchParams.get("amount");

  useEffect(() => {
    const processTopUp = async () => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;
  
      if (!studentId || !amount || !user?.token) {
        toast.error("Invalid payment details");
        setStatus("failed");
        return;
      }
  
      try {
        // First, call API to perform the top-up
        const res = await TopUpWallet(studentId, parseFloat(amount), user.token);
  
        // Extract unique refId from backend response
        const refId = res.data.refId || `${Date.now()}`; // fallback if missing
  
        // Build unique localStorage key that includes refId
        const uniqueKey = `wallet-topup-${studentId}-${amount}-${refId}`;
  
        // Prevent duplicates (in case user refreshes success page)
        if (localStorage.getItem(uniqueKey)) {
          console.log("⚠️ Top-up already processed. Skipping duplicate.");
          setStatus("success");
          return;
        }
  
        localStorage.setItem(uniqueKey, "done"); // remember success
        toast.success(`${amount} credits added to your wallet`);
        setStatus("success");
  
        // Redirect after delay
        setTimeout(() => navigate("/student/wallet?status=success"), 3000);
      } catch (err: any) {
        console.error("Top-up error:", err);
        toast.error("Failed to update wallet balance");
        setStatus("failed");
      }
    };
  
    processTopUp();
  }, [studentId, amount, user, navigate]);

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navbar />
      <div className="max-w-xl mx-auto p-6 mt-10 bg-white shadow-md rounded-xl text-center">
        {status === "processing" && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-blue-600">Processing Payment...</h1>
            <p>Please wait while we update your wallet balance.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-green-600">🎉 Payment Successful!</h1>
            <p className="text-gray-600">
              {amount} credits have been added to your wallet.
              <br />
              Redirecting you back to your wallet...
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-red-600">❌ Payment Failed</h1>
            <p className="text-gray-600">
              Something went wrong. Please check your payment or contact support.
            </p>
            <button
              onClick={() => navigate("/student/wallet")}
              className="mt-4 px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition">
              Back to Wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletSuccessPage;
