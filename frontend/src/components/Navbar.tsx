import { useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { setUser } from "@/redux/userSlice";
import { navConfig } from "@/components/NavLinks";
import { useEffect, useState } from "react";
import { GetAdminByUserId } from "@/api/adminAPI";
import NotificationsModal from "./NotificationsModal";
import { fetchNotifications, markNotificationAsRead, subscribeToNotifications } from "@/api/notificationAPI";
import { NotificationType } from "@/types/NotificationType";
import { BellIcon } from "@heroicons/react/24/outline";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAppSelector((state) => state.user);
  const role = user?.role || "ADMIN";

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  // -------------------------
  // Initial fetch + SSE
  // -------------------------
  useEffect(() => {
    if (!user?.id || !user?.token) return;

    // 1 Fetch existing notifications
    fetchNotifications(user.id, user.token)
    .then((res) => setNotifications(res.data))
    .catch(console.error);

    // 2 SSE subscription
    const eventSource = subscribeToNotifications(user.id, (notif) =>
      setNotifications((prev) => [notif, ...prev])
    );

    return () => eventSource.close();
    
  }, [user?.id, user?.token]);

  // -------------------------
  // Mark notification as read
  // -------------------------
  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.token) return;
    try {
      await markNotificationAsRead(notificationId, user.token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  // -------------------------
  // Admin permissions
  // -------------------------
  useEffect(() => {
    if (role !== "ADMIN" || !user?.id || !user?.token) return;
    if (user.permissions && user.permissions.length > 0) return;

    const fetchPermissions = async () => {
      try {
        const response = await GetAdminByUserId(user.id, user.token);
        const perms = response.data.permissions || [];
        const updatedUser = { ...user, permissions: perms };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        dispatch(setUser(updatedUser));
      } catch (err) {
        console.error("Failed to fetch admin permissions", err);
      }
    };

    fetchPermissions();
  }, [role, user, dispatch]);

  const navLinks = (navConfig[role] || []).filter(
    (link) =>
      !link.requiredPermissions ||
      link.requiredPermissions.length === 0 ||
      link.requiredPermissions.some((perm: string) => user?.permissions?.includes(perm))
  );

  const handleLogout = () => {
    let route = "/";
    if (role === "ADMIN") 
      route = "/admin/login";
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch(setUser(null));
    navigate(route);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="w-full bg-white h-16 flex items-stretch justify-between px-6 border-b border-gray-300 sticky top-0 z-50">
      <div className="flex items-stretch space-x-6">
        <div className="text-2xl font-bold text-primary flex items-center">TutorLink</div>

        {navLinks.map((link) => {
          const isActive =
            location.pathname === link.path || location.pathname.startsWith(link.path);

          return (
            <a
              key={link.path}
              href={link.path}
              className={`flex items-center px-4 text-medium transition ${
                isActive
                  ? "text-white font-bold bg-primary my-4 rounded-lg"
                  : "text-gray-600 hover:bg-gray-200 hover:text-primary"
              }`}>
              {link.name}
            </a>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Button */}
        <button
          onClick={() => setIsNotifOpen(true)}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary hover:bg-gray-200  transition"
          aria-label="Notifications">
          <BellIcon className="w-6 h-6 text-white hover:text-primary" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-primary text-white px-4 py-2 transition duration-300 hover:bg-gray-200 hover:text-primary">
          Logout
        </button>
      </div>

      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications.map((n) => ({
          ...n,
          onClick: () => handleMarkAsRead(n.id),
        }))}
      />
    </div>
  );
};

export default Navbar;
