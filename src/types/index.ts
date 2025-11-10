export type User = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: "NORMAL" | "HIGHT" | "LOW";
  metadata?: Record<string, any>;
  sentViaSSE: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SSEEvent {
  type: "connected" | "notification" | "broadcast" | "message";
  data?: any;
  timestamp: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
