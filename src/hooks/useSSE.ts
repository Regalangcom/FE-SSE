import { useEffect, useRef, useState, useCallback } from "react";
import type { SSEEvent, Notification } from "../types";

interface UseSSEOptions {
  onNotification?: (notification: Notification) => void;
  onConnected?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export const useSSE = (options: UseSSEOptions = {}) => {
  const { onNotification, onConnected, onError, enabled = true } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null); // 🔥 Browser setTimeout returns number
  const isConnectingRef = useRef(false); // 🔥 Prevent multiple connection attempts

  // 🔥 Store callbacks in refs to avoid reconnection on callback changes
  const onNotificationRef = useRef(onNotification);
  const onConnectedRef = useRef(onConnected);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onNotificationRef.current = onNotification;
    onConnectedRef.current = onConnected;
    onErrorRef.current = onError;
  }, [onNotification, onConnected, onError]);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log("[SSE] 🔌 Manual disconnect");
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    isConnectingRef.current = false;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    // 🔥 Guard: Don't connect if disabled or already connecting
    if (!enabled || isConnectingRef.current) {
      return;
    }

    const connect = async () => {
      // 🔥 Prevent multiple simultaneous connections
      if (eventSourceRef.current || isConnectingRef.current) {
        console.log("[SSE] Already connected or connecting, skipping...");
        return;
      }

      isConnectingRef.current = true;
      await new Promise((resolve) => setTimeout(resolve, 100));

      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
      const url = `${apiUrl}/sse/connect`;

      console.log("[SSE] 🔌 Connecting to:", url);

      try {
        const eventSource = new EventSource(url, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          console.log("[SSE] ✅ Connected");
          setIsConnected(true);
          setError(null);
          isConnectingRef.current = false;
          onConnectedRef.current?.();
        };

        eventSource.onmessage = (event) => {
          try {
            const data: SSEEvent = JSON.parse(event.data);
            console.log("[SSE] 📨 Message:", data.type);

            if (data.type === "notification" && data.data) {
              onNotificationRef.current?.(data.data);
            }
          } catch (err) {
            console.error("[SSE] Parse error:", err);
          }
        };

        eventSource.onerror = (event) => {
          console.error("[SSE] ❌ Error");

          setIsConnected(false);
          setError("Connection failed");
          isConnectingRef.current = false;

          onErrorRef.current?.(event);

          // Close current connection
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }

          // 🔥 Exponential backoff reconnection (max 30s)
          const retryDelay = Math.min(30000, 5000);

          console.log(`[SSE] Reconnecting in ${retryDelay / 1000}s...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabled) {
              connect();
            }
          }, retryDelay);
        };

        eventSourceRef.current = eventSource;
      } catch (err) {
        console.error("[SSE] Connection setup failed:", err);
        isConnectingRef.current = false;
      }
    };

    // Initial connection
    connect();

    // Cleanup function
    return () => {
      console.log("[SSE] 🧹 Cleaning up...");

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      isConnectingRef.current = false;
      setIsConnected(false);
    };
  }, [enabled]); // 🔥 Only depend on 'enabled', not callbacks

  return {
    isConnected,
    error,
    disconnect,
  };
};
