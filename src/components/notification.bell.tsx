import React, { useState, useRef, useEffect } from "react";
import { Bell, X, Check, Trash2, CheckCheck } from "lucide-react";

import { useNotifications } from "../hooks/useNotification";
import type { Notification } from "../types";
import { formatDistanceToNow } from "date-fns";

export const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isSSEConnected,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGHT":
        return "border-red-500 bg-red-50";
      case "LOW":
        return "border-gray-300 bg-gray-50";
      default:
        return "border-blue-500 bg-blue-50";
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-bounce-soft">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* SSE Connection Indicator */}
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            isSSEConnected ? "bg-green-500" : "bg-gray-400"
          }`}
          title={isSSEConnected ? "Connected" : "Disconnected"}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 animate-slide-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <span className="text-xs text-gray-500">
                ({unreadCount} unread)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Notification Item Component
interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  getPriorityColor: (priority: string) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
  getPriorityColor,
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors relative ${
        !notification.isRead ? "bg-blue-50/50" : ""
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Priority Indicator */}
        <div
          className={`w-1 h-full absolute left-0 top-0 ${getPriorityColor(
            notification.priority
          )}`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0 ml-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {!notification.isRead && (
              <span className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </span>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-2">
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead();
                    }}
                    className="text-primary-600 hover:text-primary-700 p-1"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-red-600 hover:text-red-700 p-1"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
