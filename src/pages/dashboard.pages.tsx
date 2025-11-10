import React, { useState } from "react";
import { Header } from "../components/header";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotification";
import { apiService } from "../service/api.service";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, isSSEConnected } = useNotifications();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTestNotification = async () => {
    try {
      setIsSendingTest(true);
      const data = await apiService.sendTestNotification();
      console.log("send notification", data);
    } catch (error) {
      console.error("Failed to send test notification:", error);
    } finally {
      setIsSendingTest(false);
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.email}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your notifications today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Notifications */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Total Notifications
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {notifications.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          {/* Unread */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Unread</p>
                <p className="text-3xl font-bold text-orange-600">
                  {unreadCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Read */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Read</p>
                <p className="text-3xl font-bold text-green-600">
                  {notifications.filter((n) => n.isRead).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* SSE Status */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Connection</p>
                <p
                  className={`text-lg font-semibold ${
                    isSSEConnected ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isSSEConnected ? "Connected" : "Disconnected"}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSSEConnected ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {isSSEConnected ? (
                  <Wifi className="w-6 h-6 text-green-600" />
                ) : (
                  <WifiOff className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Notifications */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Recent Notifications
                </h2>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  View all
                </button>
              </div>

              {recentNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    We'll notify you when something happens
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        notification.isRead
                          ? "bg-gray-50 border-gray-300"
                          : "bg-blue-50 border-primary-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-200 rounded">
                              {notification.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Test Notification Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>

              <button
                onClick={handleSendTestNotification}
                disabled={isSendingTest}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSendingTest ? "Sending..." : "Send Test Notification"}
              </button>

              <p className="text-xs text-gray-500 mt-2 text-center">
                Test the real-time notification system
              </p>
            </div>

            {/* Activity Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activity
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Account created</p>
                    <p className="text-xs text-gray-500">
                      {user?.createdAt &&
                        formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                        })}
                    </p>
                  </div>
                </div>

                {isSSEConnected && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">SSE Connected</p>
                      <p className="text-xs text-gray-500">
                        Real-time updates active
                      </p>
                    </div>
                  </div>
                )}

                {notifications.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        Latest notification
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(
                          new Date(notifications[0].createdAt),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Statistics
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Read Rate</span>
                    <span className="font-semibold text-gray-900">
                      {notifications.length > 0
                        ? Math.round(
                            (notifications.filter((n) => n.isRead).length /
                              notifications.length) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          notifications.length > 0
                            ? (notifications.filter((n) => n.isRead).length /
                                notifications.length) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-center flex-1">
                    <p className="text-2xl font-bold text-primary-600">
                      {notifications.filter((n) => n.sentViaSSE).length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Via SSE</p>
                  </div>
                  <div className="w-px h-12 bg-gray-200" />
                  <div className="text-center flex-1">
                    <p className="text-2xl font-bold text-gray-900">
                      {notifications.filter((n) => !n.sentViaSSE).length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Stored</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
