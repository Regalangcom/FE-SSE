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

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch notifications when user logs in/registers
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      console.log("⚠️ fetchNotifications called but no user found");
      return;
    }

    try {
      setLoading(true);
      console.log("📥 Fetching notifications for user:", user.email);
      console.log("🆔 User ID:", user.id);

      const [notifResponse, countResponse] = await Promise.all([
        apiService.getNotifications(1, 20),
        apiService.getUnreadCount(),
      ]);

      if (notifResponse.success && notifResponse.data) {
        const notifications = notifResponse.data.notifications;
        setNotifications(notifications);
        console.log(`✅ Fetched ${notifications.length} notifications`);
        console.log("📋 Notification IDs:", notifications.map(n => n.id.slice(0, 8)));
      } else {
        console.warn("⚠️ No notifications in response");
      }

      if (countResponse.success && countResponse.data) {
        setUnreadCount(countResponse.data.count);
        console.log(`✅ Unread count: ${countResponse.data.count}`);
      } else {
        console.warn("⚠️ No unread count in response");
      }
    } catch (error) {
      console.error("❌ Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      console.log("✅ fetchNotifications completed");
    }
  }, [user]);

  // SSE Connection - Listen for new notifications
  const { isConnected: isSSEConnected } = useSSE({
    enabled: !!user,
    onNotification: (notification) => {
      console.log("🔔 New notification via SSE:", notification);

      // Add to list (optimistic update)
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
      console.log("ℹ️ Notifications will be fetched by useEffect trigger");
    },
  });

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
      console.log("🔄 Triggering fetchNotifications()");
      fetchNotifications();
    } else {
      console.log("👤 User logged out, clearing notifications");
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user, fetchNotifications]);

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

export { NotificationContext };
export default NotificationContext;
