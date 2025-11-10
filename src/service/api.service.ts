import axios from "axios";
import type {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import type {
  ApiResponse,
  AuthResponse,
  Notification,
  NotificationListResponse,
  User,
} from "../types/index";

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private refreshAttempts = 0; // 🔥 Track refresh attempts
  private readonly MAX_REFRESH_ATTEMPTS = 3;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000, // 🔥 10s timeout
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add retry flag to track retries
        if (!config.headers) {
          config.headers = {} as any;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // 🔥 Handle network errors (backend not running)
        if (!error.response) {
          console.error("🔴 Network error - Is backend running?");
          console.error("ℹ️ Not redirecting to login (might be temporary network issue)");
          return Promise.reject(error);
        }

        const status = error.response.status;

        // 🔥 Only handle 401 Unauthorized
        if (status !== 401 || !originalRequest || originalRequest._retry) {
          return Promise.reject(error);
        }

        // 🔥 Don't retry refresh endpoint itself
        if (originalRequest.url?.includes("/refresh")) {
          console.log("❌ Refresh token invalid or expired");
          this.isRefreshing = false;
          this.refreshAttempts = 0;
          // Don't redirect here - let auth context handle it
          return Promise.reject(error);
        }

        // 🔥 Limit refresh attempts
        if (this.refreshAttempts >= this.MAX_REFRESH_ATTEMPTS) {
          console.error("❌ Max refresh attempts reached");
          this.isRefreshing = false;
          this.refreshAttempts = 0;
          // Don't redirect here - let auth context handle it
          return Promise.reject(error);
        }

        // 🔥 Prevent concurrent refresh requests
        if (this.isRefreshing) {
          console.log("⏳ Already refreshing, waiting...");
          // Wait for current refresh to complete
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Retry original request
          return this.api.request(originalRequest);
        }

        try {
          this.isRefreshing = true;
          this.refreshAttempts++;
          originalRequest._retry = true;

          console.log(
            `🔄 Token expired, attempting refresh (${this.refreshAttempts}/${this.MAX_REFRESH_ATTEMPTS})...`
          );

          await this.refreshToken();

          console.log("✅ Token refreshed successfully");

          // Reset attempts on success
          this.refreshAttempts = 0;
          this.isRefreshing = false;

          // Retry original request
          return this.api.request(originalRequest);
        } catch (refreshError) {
          console.error("❌ Refresh failed:", refreshError);
          this.isRefreshing = false;
          this.refreshAttempts = 0;

          // Don't redirect here - let auth context and ProtectedRoute handle it
          // This prevents aggressive redirects on temporary network issues
          return Promise.reject(refreshError);
        }
      }
    );
  }

  // Auth
  async register(data: { name: string; email: string; password: string }) {
    const response = await this.api.post<AuthResponse>("/users/register", data);
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.api.post<AuthResponse>("/users/login", data);
    this.refreshAttempts = 0; // Reset on new login
    return response.data;
  }

  async logout() {
    try {
      const response = await this.api.post<ApiResponse>("/users/logout");
      return response.data;
    } finally {
      this.refreshAttempts = 0; // Reset on logout
    }
  }

  async refreshToken() {
    const response = await this.api.post<ApiResponse<{ accessToken: string }>>(
      "/users/refresh"
    );
    return response.data;
  }

  async getProfile() {
    const response = await this.api.get<ApiResponse<{ user: User }>>(
      "/users/profile"
    );
    return response.data;
  }

  // Notifications
  async getNotifications(page: number = 1, limit: number = 20) {
    console.log("🔌 Calling:", `/v1/notification?page=${page}&limit=${limit}`);
    const response = await this.api.get<ApiResponse<NotificationListResponse>>(
      `/notification?page=${page}&limit=${limit}`
    );
    console.log("📦 Response:", response.data);
    return response.data;
  }

  async getUnreadNotifications() {
    const response = await this.api.get<
      ApiResponse<{ notifications: Notification[]; count: number }>
    >("/notification/unread");
    return response.data;
  }

  // async getUnreadCount() {
  //   const response = await this.api.get<ApiResponse<{ count: number }>>(
  //     "/notification/unread/count"
  //   );
  //   return response.data;
  // }
  async getUnreadCount() {
    console.log("🔌 Calling:", "/v1/notification/unread/count");
    const response = await this.api.get<ApiResponse<{ count: number }>>(
      "/notification/unread/count"
    );
    console.log("📦 Response:", response.data);
    return response.data;
  }

  async markAsRead(notificationId: string) {
    const response = await this.api.patch<ApiResponse>(
      `/notification/${notificationId}/read`
    );
    return response.data;
  }

  async markAllAsRead() {
    const response = await this.api.patch<ApiResponse>(
      "/notification/read-all"
    );
    return response.data;
  }

  async deleteNotification(notificationId: string) {
    const response = await this.api.delete<ApiResponse>(
      `/notification/${notificationId}`
    );
    return response.data;
  }

  // SSE Stats
  async getSSEStats() {
    const response = await this.api.get<ApiResponse>("/sse/stats");
    return response.data;
  }

  async sendTestNotification() {
    const response = await this.api.post<ApiResponse>("/sse/test");
    return response.data;
  }
}

export const apiService = new ApiService();
