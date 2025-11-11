/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useCallback } from "react";
import type { Notification } from "../types";
import { apiService } from "../service/api.service";
import { useSSE } from "../hooks/useSSE";
import { useAuth } from "../hooks/useAuth";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  isSSEConnected: boolean;
}

export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // SSE Connection
  const { isConnected: isSSEConnected, disconnect: disconnectSSE } = useSSE({
    enabled: !!user,
    onNotification: (notification) => {
      console.log("🔔 New notification via SSE:", notification);

      // Add to list
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/notification-icon.png",
        });
      }
    },
    onConnected: () => {
      console.log("✅ SSE Connected");
    },
  });
  const normalizeNotifications = useCallback((items: any[]): Notification[] => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item) => {
        const fallbackId =
          item?.id ??
          item?._id ??
          item?.notificationId ??
          `${item?.userId ?? "notification"}-${
            item?.createdAt ?? globalThis.crypto?.randomUUID?.() ?? Date.now()
          }`;

        return {
          ...item,
          id: String(fallbackId),
          priority: item?.priority ?? "NORMAL",
          isRead: Boolean(item?.isRead),
          sentViaSSE: Boolean(item?.sentViaSSE),
        } as Notification;
      })
      .filter(Boolean);
  }, []);

  const extractNotifications = useCallback(
    (response: any): Notification[] => {
      if (!response) {
        return [];
      }

      if (Array.isArray(response)) {
        return normalizeNotifications(response);
      }

      if (Array.isArray(response.notifications)) {
        return normalizeNotifications(response.notifications);
      }

      if (response.data) {
        if (Array.isArray(response.data.notifications)) {
          return normalizeNotifications(response.data.notifications);
        }

        if (Array.isArray(response.data)) {
          return normalizeNotifications(response.data);
        }
      }

      return [];
    },
    [normalizeNotifications]
  );

  const extractCount = useCallback((response: any): number => {
    if (!response) {
      return 0;
    }

    if (typeof response === "number") {
      return response;
    }

    if (typeof response.count === "number") {
      return response.count;
    }

    if (response.data && typeof response.data.count === "number") {
      return response.data.count;
    }

    return 0;
  }, []);

  // 🔥 Fetch notifications when user logs in/registers
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("📥 Fetching notifications...");

      const [notifResponse, countResponse] = await Promise.all([
        apiService.getNotifications(1, 20),
        apiService.getUnreadCount(),
      ]);

      const mappedNotifications = extractNotifications(notifResponse);
      setNotifications(mappedNotifications);
      console.log(`✅ Fetched ${mappedNotifications.length} notifications`);

      const unread = extractCount(countResponse);
      setUnreadCount(unread);
      console.log(`✅ Unread count: ${unread}`);
    } catch (error) {
      console.error("❌ Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      await apiService.markAsRead(id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllAsRead();

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiService.deleteNotification(id);

      const notification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 🔥 Fetch notifications when user changes (login/register)
  useEffect(() => {
    if (user) {
      console.log("👤 User authenticated, fetching notifications...");
      fetchNotifications();
    } else {
      console.log("👤 User logged out, clearing notifications");
      setNotifications([]);
      setUnreadCount(0);
      disconnectSSE?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        isSSEConnected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// export { NotificationContext };
