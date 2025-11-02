import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import Navbar from "@/components/Navbar";
import { GetAdminByUserId, GetDashboardSummary } from "@/api/adminAPI";
import { setLoading } from "@/redux/loaderSlice";
import { Tutor } from "@/types/TutorType";
import { AdminDashboardType } from "@/types/AdminDashboardType";
import RingChart from "@/components/RingChart";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AdminDashboard = () => {
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [metrics, setMetrics] = useState<AdminDashboardType | null>(null);
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const navigate = useNavigate();

  const ensureAuthenticated = useCallback((): string | null => {
    if (!user?.token || !user?.id) {
      toast.error("Session expired. Please log in again.");
      navigate("/admin/login");
      return null;
    }
    return user.token;
  }, [user, navigate]);

  const fetchAdminDetails = useCallback(async () => {
    const token = ensureAuthenticated();
    if (!token || !user?.id) return;

    try {
      const { data } = await GetAdminByUserId(user.id, token);
      setAdminDetails(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch admin details");
    }
  }, [user, ensureAuthenticated]);

  const fetchMetrics = useCallback(async () => {
    const token = ensureAuthenticated();
    if (!token || !user?.id) return;

    try {
      const { data } = await GetDashboardSummary(user.id, token);
      setMetrics(data);
    } catch (err) {
      console.error("Failed to fetch dashboard metrics", err);
    }
  }, [user, ensureAuthenticated]);


  useEffect(() => {
    if (!user?.id) return;
    dispatch(setLoading(true));
  
    fetchAdminDetails(); // load profile first
    fetchMetrics().finally(() => dispatch(setLoading(false))); // load stats second
  }, [user?.id]);

  return (
    <div>
      <Navbar />
      <div className="p-6 bg-[#f2f2f2]">
        <h1 className="font-bold text-xl mb-5">Welcome to your Dashboard!</h1>

        {!metrics || !adminDetails ? (
          <div className="text-gray-500">Loading dashboard data...</div>
        ) : (
          <>
            {/* Two-column layout */}
            <div className="flex gap-6 flex-1 overflow-hidden">
              {/* Left side - Summary */}
              <div className="flex flex-col w-[70%] space-y-6 overflow-y-auto pr-2">
                <div className="bg-white rounded-md shadow-md p-5 flex-1">
                  <h2 className="font-bold text-lg mb-3">Active Users Summary</h2>
                  {metrics ? (
                    <div className="grid grid-cols-2 gap-4">
                      <RingChart
                        title="All Users"
                        total={metrics.totalUsers}
                        active={metrics.activeUsers}
                        suspended={metrics.suspendedUsers}
                      />
                      <RingChart
                        title="Tutors"
                        total={metrics.totalTutors}
                        active={metrics.activeTutors}
                        suspended={metrics.suspendedTutors}
                        pending={metrics.pendingTutors.length}
                        unverified={metrics.unverifiedTutors}
                      />
                      <RingChart
                        title="Students"
                        total={metrics.totalStudents}
                        active={metrics.activeStudents}
                        suspended={metrics.suspendedStudents}
                      />
                      <RingChart
                        title="Admins"
                        total={metrics.totalStudents}
                        active={metrics.activeAdmins}
                        suspended={metrics.suspendedAdmins}
                      />
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400">
                      No users to show for summary.
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Admin Profile + Pending */}
              <div className="flex flex-col w-[30%] space-y-5 overflow-hidden">
                <div className="bg-white rounded-md shadow-md p-5">
                  <div className="text-left">
                    <h2 className="font-bold text-lg">Admin Profile</h2>
                    {adminDetails ? (
                      <div className="mt-4 text-left">
                        <p>
                          <strong>Full Name:</strong> {user?.name}
                        </p>
                        <p>
                          <strong>Email:</strong> {user?.email}
                        </p>
                        <p><strong>Admin Permissions:</strong></p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {adminDetails.permissions.map((perm) => (
                            <span
                              key={perm as string}
                              className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p>Loading admin details...</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-md shadow-md p-5 flex-1 flex flex-col overflow-hidden max-h-[300px]">
                  <h2 className="font-bold text-lg mb-3">Pending Activities</h2>
                  <h3 className="font-bold text-md mb-3">Tutors requesting approval</h3>
                  {metrics && metrics.pendingTutors.length > 0 ? (
                    <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                      {metrics.pendingTutors.map((tutor: Tutor) => (
                        <div
                          key={tutor.userId}
                          className="flex justify-between items-center border p-3 rounded-md hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-semibold">
                              {tutor.firstName} {tutor.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{tutor.email}</p>
                            <p className="text-xs text-gray-500">
                              Subject: {tutor.subject ?? "N/A"}
                            </p>
                          </div>
                          <button
                            onClick={() => navigate(`/admin/tutors/${tutor.userId}`)}
                            className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      No pending tutor activities at this time.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Earnings Overview */}
            <div className="bg-white rounded-md shadow-md p-5 mt-6 flex-1 flex flex-col overflow-hidden">
              <h2 className="font-bold text-lg mb-3">Earnings Overview</h2>
              {metrics?.transactionMetrics?.totalEarnings ? (
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Earnings This Month</p>
                    <p className="text-2xl font-bold text-green-600">
                      {metrics.transactionMetrics.totalEarnings.toFixed(2)} SGD
                    </p>
                    <p className="text-xs text-gray-500">
                      Tutor + commission's earnings this month
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Net Commission Collected</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {metrics.transactionMetrics.commissionCollected?.toFixed(2)} SGD
                    </p>
                    <p className="text-xs text-gray-500">
                      Amount commissioned from tutor's earnings this month
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Highest Transaction</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {metrics.transactionMetrics.highestTransaction?.amount?.toFixed(2)} SGD
                    </p>
                    <p className="text-xs text-gray-500">
                      {metrics.transactionMetrics.highestTransaction?.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  No earnings data available.
                </div>
              )}
            </div>

            {metrics?.transactionMetrics?.monthlyEarnings &&
              metrics.transactionMetrics.monthlyEarnings.length > 0 && (
                <div className="bg-white rounded-md shadow-md p-5 mt-6">
                  <h2 className="font-bold text-lg mb-3">Monthly Commission Earned</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.transactionMetrics.monthlyEarnings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" padding={{ left: 100, right: 100 }} />
                      <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
                      <Tooltip formatter={(value: number) => `SGD ${value.toFixed(2)}`} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#22c55e"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );

};

export default AdminDashboard;
