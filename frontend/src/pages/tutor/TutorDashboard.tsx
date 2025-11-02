import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/redux/store";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Navbar from "@/components/Navbar";
import { GetTutorFileViewUrl, GetTutorProfile } from "@/api/tutorAPI";
import ProfilePicModal from "@/components/ProfilePicModal";
import defaultProfile from "../../assets/default-profile-pic.jpg";
import { Tutor } from "@/types/TutorType";
import AvailabilityCalendar, {
  TimeSlot,
} from "@/components/AvailabilityCalendar";
import { useMemo } from "react";
import {
  AcceptBooking,
  ApproveReschedule,
  CancelBooking,
  GetBookingsForTutorRange,
  GetPastBookingsForTutor,
  GetRecentBookingsForTutor,
  RejectReschedule,
} from "@/api/bookingAPI";
import BookingModalAccept from "@/components/BookingModalAccept";
import BookingModalView from "@/components/BookingModalView";

const TutorDashboard = () => {
  const [tutorDetails, setTutorDetails] = useState<Tutor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    slot: TimeSlot;
  } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [pastBookedSlotsCount, setPastBookedSlotsCount] = useState<number>(0);
  const [pastBookedSlots, setPastBookedSlots] = useState<
    {
      date: string;
      status: string;
      id: string;
      tutorId: string;
      tutorName: string;
      studentId: string;
      studentName: string;
      lessonType: string;
      start: string;
      end: string;
    }[]
  >([]);
  const [recentBookedSlotsCount, setRecentBookedSlotsCount] =
    useState<number>(0);
  const [recentBookedSlots, setRecentBookedSlots] = useState<
    {
      date: string;
      status: string;
      id: string;
      tutorId: string;
      tutorName: string;
      studentId: string;
      studentName: string;
      lessonType: string;
      start: string;
      end: string;
    }[]
  >([]);
  const [bookedSlots, setBookedSlots] = useState<
    {
      date: string;
      status: string;
      id: string;
      tutorId: string;
      tutorName: string;
      studentId: string;
      studentName: string;
      lessonType: string;
      start: string;
      end: string;
    }[]
  >([]);
  const [monthStart, setMonthStart] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const statusColor = {
    confirmed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
    on_hold: "bg-orange-100 text-orange-800",
    reschedule_requested: "bg-purple-100 text-purple-800",
  } as const;

  const { user } = useAppSelector((state) => state.user);
  const navigate = useNavigate();

  const hasConfirmedBookings = useMemo(() => {
    const now = new Date();

    const hascurrentBookings = bookedSlots.some((b) => {
      if (b.status !== "confirmed" && b.status !== "pending") return false;

      const bookingDate = new Date(b.date);
      // Keep only bookings that are today or in the future
      return bookingDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    });

    const hasPastConfirmedBookings = pastBookedSlots.some((b) => {
      return false;
    });
    const hasRecentConfirmedBookings = recentBookedSlots.some((b) => {
      if (b.status !== "confirmed") return false;

      const bookingDate = new Date(b.date);
      // Keep only bookings that are today or in the future
      return bookingDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    });

    return hascurrentBookings || hasPastConfirmedBookings || hasRecentConfirmedBookings;
  }, [bookedSlots, pastBookedSlots, recentBookedSlots]);

  const fetchTutorDetails = async (id: string): Promise<Tutor | null> => {
    try {
      if (!user?.token) {
        toast.error("No token found. Please login again.");
        navigate("/");
        return null;
      }

      const response = await GetTutorProfile(user.token, id);
      if (response.data) {
        console.log("Tutor Profile Data:", response.data);
        if (
          response.data.status === "PENDING_APPROVAL" &&
          response.data.stagedProfile
        ) {
          const stagedProfile = {
            ...response.data.stagedProfile,
            status: "PENDING_APPROVAL",
            id: response.data.id,
          };
          setTutorDetails(stagedProfile);
          return stagedProfile;
        }
        setTutorDetails(response.data);
        return response.data;
      } else {
        return null;
      }
    } catch (error: any) {
      toast.error("Failed to fetch tutor details");
      console.error(error);
      return null;
    }
  };

  const fetchRecentBookings = async (id: string) => {
    if (!id || !user?.token) return;
    try {
      const res = await GetRecentBookingsForTutor(user.id, user.token!);
      setRecentBookedSlots(
        res.data.recentSessions.map((b: any) => ({
          date: b.date,
          status: b.status,
          lessonType: b.lessonType,
          id: b.id,
          studentId: b.studentId,
          studentName: b.studentName,
          tutorId: b.tutorId,
          tutorName: b.tutorName,
          start: b.start,
          end: b.end,
        }))
      );
      setRecentBookedSlotsCount(res.data.totalCount);
      console.log("upcoming booking: ", res.data);
    } catch (err) {
      console.error("Failed to fetch past bookings:", err);
    }
  };

  const fetchRecentPastBookings = async (id: string) => {
    if (!id || !user?.token) return;
    try {
      const res = await GetPastBookingsForTutor(user.id, user.token!);
      setPastBookedSlots(
        res.data.recentSessions.map((b: any) => ({
          date: b.date,
          status: b.status,
          lessonType: b.lessonType,
          id: b.id,
          studentId: b.studentId,
          studentName: b.studentName,
          tutorId: b.tutorId,
          tutorName: b.tutorName,
          start: b.start,
          end: b.end,
        }))
      );
      setPastBookedSlotsCount(res.data.totalCount);
      console.log("past booking: ", res.data);
    } catch (err) {
      console.error("Failed to fetch past bookings:", err);
    }
  };

  const fetchBookingsForMonth = async (id: string) => {
    if (!id || !user?.token) return;

    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    // first and last day as YYYY-MM-DD strings
    const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      new Date(year, month + 1, 0).getDate()
    ).padStart(2, "0")}`;

    try {
      const res = await GetBookingsForTutorRange(
        user.id,
        firstDay,
        lastDay,
        user.token!
      );
      setBookedSlots(
        res.data.map((b: any) => ({
          date: b.date,
          status: b.status,
          lessonType: b.lessonType,
          id: b.id,
          studentId: b.studentId,
          studentName: b.studentName,
          tutorId: b.tutorId,
          tutorName: b.tutorName,
          start: b.start,
          end: b.end,
        }))
      );
      console.log("dates", res.data);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
  };

  const handleViewFile = async (fileKey: string) => {
    try {
      if (!user?.token) {
        toast.error("Missing token, please login again.");
        return;
      }
  
      const res = await GetTutorFileViewUrl(user.token, fileKey);
      const presignedUrl = res.data;
  
      if (presignedUrl) {
        window.open(presignedUrl, "_blank");
      } else {
        toast.error("Failed to retrieve file URL");
      }
    } catch (err) {
      console.error("Error viewing file:", err);
      toast.error("Unable to load file. Please try again later.");
    }
  };

  const handleEdit = () => {
    confirm(
      "Updating your profile will require a re-verification. Students will temporarily not be able to view your profile, proceed?"
    ) && navigate("/tutor/profile");
  };
  const handleSlotClick = (date: Date, slot: TimeSlot) => {
    setSelectedSlot({ date, slot });
    setShowModal(true);
  };

  const modal = (data: { date: Date; slot: TimeSlot }) => {
    const booking =
      bookedSlots.find(
        (item) =>
          item.date === data.date.toLocaleDateString("en-CA") &&
          item.status !== "cancelled"
      ) ||
      recentBookedSlots.find(
        (item) =>
          item.date === data.date.toLocaleDateString("en-CA") &&
          item.status !== "cancelled"
      ) ||
      pastBookedSlots.find(
        (item) =>
          item.date === data.date.toLocaleDateString("en-CA") &&
          item.status !== "cancelled"
      );

    console.log("Selected booking for modal:", booking);

    if (!booking) return null;

    if (booking.status === "pending") {
      return (
        <BookingModalAccept
          booking={{
            studentName: booking.studentName,
            date: data.date,
            slot: data.slot,
            lessonType: booking.lessonType,
          }}
          onClose={() => setShowModal(false)}
          onAccept={() => confirmBooking(booking.id)}
          onReject={() => cancelBooking(booking.id)}
        />
      );
    } else if (booking.status === "on_hold") {
      return (
        <BookingModalAccept
          booking={{
            studentName: booking.studentName,
            date: data.date,
            slot: data.slot,
            lessonType: booking.lessonType,
          }}
          onClose={() => setShowModal(false)}
          onAccept={() => approveRescheduleBooking(booking.id)}
          onReject={() => cancelBooking(booking.id)}
        />
      );
    } else {
      return (
        <BookingModalView
          booking={{
            studentName: booking.studentName,
            tutorName: booking.tutorName,
            date: data.date,
            slot: data.slot,
            lessonType: booking.lessonType,
          }}
          onClose={() => setShowModal(false)}
        />
      );
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!user?.token || !user?.id || !selectedSlot) {
      alert("You must be logged in to book a lesson.");
      return;
    }

    const dateStr = selectedSlot.date.toLocaleDateString("en-CA"); // YYYY-MM-DD

    try {
      // ✅ Find booking to determine its type
      const booking =
        bookedSlots.find((b) => b.id === bookingId) ||
        recentBookedSlots.find((b) => b.id === bookingId) ||
        pastBookedSlots.find((b) => b.id === bookingId);

      if (!booking) {
        alert("Booking not found.");
        return;
      }

      // ✅ Decide which API to call
      if (booking.status === "on_hold") {
        // Reschedule rejection
        await RejectReschedule(bookingId, user.token);
        alert(`❌ Reschedule request rejected. Original booking restored.`);
      } else {
        // Normal cancellation
        await CancelBooking(bookingId, user.id, user.token);
        alert(
          `✅ Booking rejected on ${dateStr} | ${selectedSlot.slot.start} - ${selectedSlot.slot.end}`
        );
      }

      // ✅ Update UI (simpler: refetch to avoid partial states)
      await Promise.all([
        fetchBookingsForMonth(user.id),
        fetchRecentBookings(user.id),
        fetchRecentPastBookings(user.id),
      ]);

    } catch (err) {
      console.error("Booking failed:", err);
      alert("❌ Failed to reject booking. Please try again.");
    } finally {
      setShowModal(false);
      setSelectedSlot(null);
    }
  };


  const confirmBooking = async (bookingId: string) => {
    if (!user?.token || !user?.id || !selectedSlot) {
      alert("You must be logged in to book a lesson.");
      return;
    }

    const dateStr = selectedSlot.date.toLocaleDateString("en-CA"); // YYYY-MM-DD

    try {
      await AcceptBooking(bookingId, user.token);
      setBookedSlots((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "confirmed" } : b
        )
      );
      setRecentBookedSlots((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "confirmed" } : b
        )
      );
      alert(
        `✅ Booking accepted on ${dateStr} | ${selectedSlot.slot.start} - ${selectedSlot.slot.end}`
      );
    } catch (err) {
      console.error("Booking failed:", err);
      alert("❌ Failed to create booking. Please try again.");
    } finally {
      setShowModal(false);
      setSelectedSlot(null);
    }
  };

  const approveRescheduleBooking = async (bookingId: string) => {
    if (!user?.token || !selectedSlot) return;

    try {
      await ApproveReschedule(bookingId, user.token);
      alert(
        `✅ Reschedule approved on ${selectedSlot.date.toLocaleDateString(
          "en-CA"
        )} | ${selectedSlot.slot.start} - ${selectedSlot.slot.end}`
      );

      // Refresh booked slots for the month to immediately update AvailabilityCalendar
      fetchBookingsForMonth(user.id);
      fetchRecentBookings(user.id);

      // Optional: update selectedSlot locally to reflect change
      setSelectedSlot(null);
      setShowModal(false);
    } catch (err) {
      console.error("Approval failed:", err);
      alert("❌ Failed to approve reschedule. Please try again.");
    }
  };

  useEffect(() => {
    console.log(user);
    if (!user) {
      navigate("/");
      return;
    }
    if (!user.id) {
      toast.error("User ID missing. Please login again.");
      navigate("/");
      return;
    }
    fetchTutorDetails(user.id).then((data) => {
      if (data) {
        fetchRecentPastBookings(data.id);
        fetchBookingsForMonth(data.id);
        fetchRecentBookings(data.id);
      } else {
        toast.error("Failed to load tutor data.");
      }
    });
    console.log(`Recent booked slot count: ${recentBookedSlotsCount}`);
  }, [user, monthStart, navigate]);

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-[#f2f2f2] p-6">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-xl">Welcome to your Dashboard!</h1>
          </div>

          <button
            onClick={() => navigate("/tutor/wallet")}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Go to Wallet
          </button>
        </div>
        {tutorDetails?.status === "PENDING_APPROVAL" && (
          <div className="mb-5 bg-orange-600 text-white px-6 py-2 rounded-lg shadow-md text-center">
            <p className="text-sm font-medium leading-snug">
              Your profile is under review. You cannot update it at this time.
            </p>
          </div>
        )}

        {tutorDetails?.rejectedReason && (
          <div className="mb-5 bg-red-600 text-white px-6 py-2 rounded-lg shadow-md text-center">
            <p className="text-sm font-medium leading-snug">
              Your profile is has been rejected for the following reason:{" "}
              {tutorDetails.rejectedReason}
            </p>
          </div>
        )}
        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left side (Upcoming + Past Sessions) */}
          <div className="flex flex-col w-[70%] space-y-6">
            {/* UPCOMING SESSIONS */}
            <div className="bg-white rounded-md shadow-md p-5">
              <h2 className="font-bold text-lg mb-3">Upcoming Sessions</h2>

              {/* List of upcoming sessions */}
              <div className="mb-4 shadow-md p-5">
                {recentBookedSlots.filter((b) => b.status !== "cancelled")
                  .length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {recentBookedSlots
                      .filter(
                        (b) =>
                          b.status === "confirmed" ||
                          b.status === "pending" ||
                          b.status === "on_hold"
                      )
                      .sort(
                        (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime()
                      )
                      .map((b) => (
                        <li
                          key={b.id}
                          className="py-3 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(b.date).toLocaleDateString("en-GB", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              – {b.lessonType}
                            </p>
                            <p className="text-sm text-gray-500">
                              {b.start} | Status:{" "}
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor[b.status as keyof typeof statusColor] || "bg-gray-100 text-gray-400"
                                  }`}
                              >
                                {b.status.charAt(0).toUpperCase() + b.status.slice(1).replace("_", " ")}
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleSlotClick(new Date(b.date), {
                                enabled: false,
                                start: b.start,
                                end: b.end,
                              })
                            }
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                          >
                            View
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-center">
                    No upcoming sessions yet.
                  </p>
                )}
              </div>

              {/* Availability Calendar */}
              {tutorDetails && (
                <>
                  <AvailabilityCalendar
                    role="tutor"
                    availability={tutorDetails.availability}
                    bookedSlots={bookedSlots}
                    initialMonth={monthStart}
                    onSlotClick={handleSlotClick}
                    onMonthChange={(newMonth) => setMonthStart(newMonth)}
                  />
                  {showModal && selectedSlot && modal(selectedSlot)}
                </>
              )}
            </div>

            {/* PAST SESSIONS */}
            <div className="bg-white rounded-md shadow-md p-5">
              <h2 className="font-bold text-lg mb-1 flex justify-between items-center">
                Past Sessions
                <span className="text-sm text-gray-500">
                  Total Completed: {pastBookedSlotsCount}
                </span>
              </h2>

              {pastBookedSlots.filter((b) => new Date(b.date) < new Date())
                .length > 0 ? (
                <ul className="space-y-3 mt-3">
                  {pastBookedSlots
                    .filter(
                      (b) =>
                        b.status === "confirmed" &&
                        new Date(b.date) < new Date()
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((b) => (
                      <li
                        key={b.id}
                        className="p-3 bg-gray-50 rounded-md shadow-sm flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {new Date(b.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            | {b.start} - {b.end}
                          </p>
                          <p className="text-gray-600 text-sm">
                            {b.lessonType}
                          </p>
                          <p className="text-gray-500 text-sm">
                            Student: {b.studentName}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-center mt-3">
                  No past sessions yet.
                </p>
              )}
            </div>
          </div>

          {/* Right side (Tutor Profile Card) */}
          <div className="w-[30%] space-y-4">
            <div className="bg-white rounded-md shadow-md p-5">
              <div className="text-center">
                <h1 className="font-bold text-xl">Tutor Profile</h1>
                {tutorDetails ? (
                  <div className="mt-4 text-left">
                    {/* Profile Picture */}
                    <div className="flex justify-center mb-3">
                      <img
                        src={tutorDetails.profileImageUrl || defaultProfile}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border"
                      />
                    </div>
                    {/* Status Indicator */}
                    <div className="flex justify-center mb-3">
                      {tutorDetails?.status === "ACTIVE" ? (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold text-sm">
                          Live
                        </span>
                      ) : tutorDetails?.status === "PENDING_APPROVAL" ? (
                        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 font-semibold text-sm">
                          Pending Verification
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-semibold text-sm">
                          Unverified
                        </span>
                      )}
                    </div>

                    <p>
                      <strong>Full Name:</strong> {user?.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {user?.email}
                    </p>
                    <p>
                      <strong>Specialization:</strong> {tutorDetails.subject}
                    </p>

                    {/* Edit Button */}
                    <div className="mt-4 flex justify-center gap-x-4 relative group">
                      <button
                        onClick={() => handleEdit()} // define handleEdit function
                        disabled={
                          tutorDetails?.status === "PENDING_APPROVAL" ||
                          hasConfirmedBookings
                        }
                        className={`px-4 py-2 rounded-md text-white transition
                        ${tutorDetails?.status === "PENDING_APPROVAL" ||
                            hasConfirmedBookings
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                          }`}
                      >
                        Update Profile
                      </button>
                      {tutorDetails?.status === "PENDING_APPROVAL" && (
                        <div
                          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap
      bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0
      group-hover:opacity-100 transition-opacity duration-200 z-10"
                        >
                          Your profile is under review. You cannot update it at
                          this time.
                        </div>
                      )}
                      {hasConfirmedBookings && (
                        <div
                          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap
      bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0
      group-hover:opacity-100 transition-opacity duration-200 z-10"
                        >
                          You have confirmed bookings. You cannot update it at
                          this time.
                        </div>
                      )}
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                      >
                        Change Profile Pic
                      </button>
                    </div>
                    {/* Modal */}
                    <ProfilePicModal
                      isOpen={isModalOpen}
                      onClose={() => setIsModalOpen(false)}
                      refreshProfile={() => fetchTutorDetails(user!.id)}
                      userType="tutor"
                    />
                  </div>
                ) : (
                  <p>Loading tutor details...</p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-md shadow-md p-5">
              <h2 className="font-bold text-lg mb-3">Lesson Types </h2>
              <ul className="list-disc list-inside text-gray-700">
                {tutorDetails && tutorDetails.lessonType?.length > 0 ? (
                  tutorDetails.lessonType.map((type, index) => (
                    <li key={index}>{type}</li>
                  ))
                ) : (
                  <p>No lesson types specified.</p>
                )}
              </ul>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6 max-h-[265px] overflow-y-auto">
                <h2 className="text-xl font-semibold mb-3">Qualifications</h2>
                {tutorDetails?.qualifications &&
                  tutorDetails.qualifications.length > 0 ? (
                  <ul className="space-y-3">
                    {tutorDetails.qualifications.map((q: any, idx: number) => (
                      <li
                        key={idx}
                        className="border rounded-lg p-3 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold">{q.name}</p>
                          <p className="text-gray-500 text-sm">{q.type}</p>
                          {q.uploadedAt && (
                            <p className="text-xs text-gray-400">
                              Uploaded:{" "}
                              {new Date(q.uploadedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <a
                          onClick={() => handleViewFile(q.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No qualifications uploaded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorDashboard;
