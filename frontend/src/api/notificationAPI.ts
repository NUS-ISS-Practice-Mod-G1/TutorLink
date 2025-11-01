import axios, { AxiosResponse } from "axios";
import { NotificationType } from "@/types/NotificationType"; // define this type

const BASE_URL = `${import.meta.env.VITE_APP_API}/notifications`; // adjust as needed

/**
 * Fetch all notifications for a user
 * @param userId
 * @param token
 */
export const fetchNotifications = async (
  userId: string,
  token: string
): Promise<AxiosResponse<NotificationType[]>> => {
  return axios.get(`${BASE_URL}?userId=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * Mark a notification as read
 * @param notificationId
 * @param token
 */
export const markNotificationAsRead = async (
  notificationId: string,
  token: string
): Promise<AxiosResponse<void>> => {
  return axios.put(
    `${BASE_URL}/${notificationId}/read`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

/**
 * Create a new notification (optional, mostly used by backend)
 */
export const createNotification = async (
  payload: {
    userId: string;
    type: string;
    bookingId: string;
    message: string;
  },
  token: string
): Promise<AxiosResponse<NotificationType>> => {
  return axios.post(BASE_URL, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
};


export const subscribeToNotifications = (
  userId: string,
  onMessage: (notif: NotificationType) => void,
  onError?: (err: any) => void
) => {

  const eventSource = new EventSource(`${BASE_URL}/sse/notifications/stream/${userId}`);

  eventSource.onmessage = (event) => onMessage(JSON.parse(event.data));
  eventSource.onerror = (err) => {
    console.error("SSE error:", err);
    if (onError) onError(err);
    eventSource.close();
  };

  return eventSource; // so caller can close it on cleanup
};
