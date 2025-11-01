import { useEffect, useState } from "react";
import { NotificationType } from "@/types/NotificationType";
import { fetchNotifications } from "@/api/notificationAPI";

export const useSseNotifications = (userId: string, token: string) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  useEffect(() => {
    if (!userId) return;
    const BASE_URL = `${import.meta.env.VITE_APP_API}`;

    // 1️⃣ Fetch existing notifications initially
    fetchNotifications(userId, token).then((res) => setNotifications(res.data));

    // 2️⃣ SSE for real-time updates
    const eventSource = new EventSource(
      `${BASE_URL}/api/v1/notifications/stream/${userId}`
    );
    eventSource.onmessage = (event) => {
      const newNotification: NotificationType = JSON.parse(event.data);
      setNotifications((prev) => [newNotification, ...prev]);
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [userId, token]);

  return { notifications, setNotifications };
};
