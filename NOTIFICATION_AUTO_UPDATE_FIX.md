# 🔧 Fix: Notification Tidak Otomatis Update Setelah Login

## 🐛 Problem

State notification **TIDAK otomatis ter-update** setelah login:
- Harus reload page manual
- Atau harus restart dev server (`npm run dev`)
- Notification baru muncul setelah reload

## 🔍 Root Cause

### 1. **Incomplete Dependency Array**
```typescript
// ❌ SEBELUM - fetchNotifications tidak ada di dependency
useEffect(() => {
  if (user) {
    fetchNotifications(); // Stale closure!
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]); // ❌ Missing fetchNotifications
```

**Masalah:**
- `fetchNotifications` di-define dengan `useCallback([user])`
- Saat login, `user` berubah → `fetchNotifications` re-create
- Tapi `useEffect` tidak tahu karena `fetchNotifications` tidak di dependency array
- Akibatnya: useEffect tidak trigger!

### 2. **Stale Closure di SSE Callback**
```typescript
// ❌ SEBELUM - Callback punya stale closure
const { isConnected } = useSSE({
  onConnected: () => {
    fetchNotifications(); // ⚠️ Stale!
  },
});
```

**Masalah:**
- `useSSE` hanya depend pada `[enabled]`, tidak track callbacks
- `onConnected` callback punya closure ke `fetchNotifications` yang lama
- Fetch dipanggil dengan function reference yang outdated

## ✅ Solution

### 1. **Add Complete Dependencies**
```typescript
// ✅ SESUDAH - Lengkap dependency array
useEffect(() => {
  if (user) {
    console.log("👤 User authenticated, fetching notifications...");
    console.log("🔄 Triggering fetchNotifications()");
    fetchNotifications();
  } else {
    setNotifications([]);
    setUnreadCount(0);
    setLoading(false);
  }
}, [user, fetchNotifications]); // ✅ Include both dependencies
```

**Benefit:**
- Setiap kali `user` atau `fetchNotifications` berubah → useEffect trigger
- Fetch notifications dipanggil dengan function reference yang benar
- Auto-update setelah login tanpa reload ✅

### 2. **Remove Stale Closure from SSE**
```typescript
// ✅ SESUDAH - SSE hanya untuk listen, bukan fetch
const { isConnected: isSSEConnected } = useSSE({
  enabled: !!user,
  onNotification: (notification) => {
    // Add new notification via SSE
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  },
  onConnected: () => {
    console.log("✅ SSE Connected");
    console.log("ℹ️ Notifications will be fetched by useEffect trigger");
    // ❌ TIDAK panggil fetchNotifications() disini
  },
});
```

**Benefit:**
- Separation of concerns: SSE untuk real-time, useEffect untuk initial fetch
- Tidak ada duplikasi fetch
- Tidak ada stale closure

### 3. **Enhanced Logging**
```typescript
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
    }
    
    console.log("✅ fetchNotifications completed");
  } catch (error) {
    console.error("❌ Failed to fetch notifications:", error);
  } finally {
    setLoading(false);
  }
}, [user]);
```

**Benefit:**
- Easy debugging
- Track user info saat fetch
- Verify notifications ter-load dengan benar

## 🎯 Expected Flow After Fix

```
1. User klik Login
   └─> Auth context: setUser(userData)
       └─> user state berubah (null → User object)

2. Notification Context useEffect trigger
   └─> Dependency [user, fetchNotifications] berubah
       └─> fetchNotifications() dipanggil
           └─> API call: getNotifications() + getUnreadCount()
               └─> setNotifications(data)
                   └─> Dashboard re-render dengan data ✅

3. SSE Connection (parallel)
   └─> Connect to /sse/connect
       └─> Listen for real-time notifications
           └─> onNotification: tambah ke state
```

## 🧪 Testing Steps

### 1. Clear State
```bash
# Clear browser storage
DevTools → Application → Clear site data
```

### 2. Login
```bash
# Open browser console
# Enter email & password
# Click Login
```

### 3. Verify Console Logs
```bash
# Expected sequence:
🔐 Attempting login...
✅ Login successful: user@example.com
🍪 Auth cookies should now be set by backend
👤 User ID: 550e8400-e29b-41d4-a716-446655440000

👤 User authenticated, fetching notifications...
🔄 Triggering fetchNotifications()

📥 Fetching notifications for user: user@example.com
🆔 User ID: 550e8400-e29b-41d4-a716-446655440000

[SSE] ⏳ Waiting 100ms for auth cookies to be set...
[SSE] 🔌 Connecting to: http://localhost:5000/api/v1/sse/connect
[SSE] 🍪 withCredentials: true (cookies will be sent)

✅ Fetched 3 notifications
📋 Notification IDs: ['550e8400', 'a16b9f2c', 'f47ac10b']
✅ Unread count: 2
✅ fetchNotifications completed

[SSE] ✅ Connected successfully
```

### 4. Verify UI
- Dashboard shows notification count ✅
- Recent notifications list populated ✅
- Bell icon shows unread badge ✅
- **TIDAK perlu reload page** ✅

## 📊 Before vs After

| Scenario | Before ❌ | After ✅ |
|----------|-----------|----------|
| Login | Tidak ada data | Data langsung muncul |
| Register | Tidak ada data | Data langsung muncul |
| SSE Connect | Fetch duplikat/stale | Clean, reliable |
| Reload needed? | YA | TIDAK |
| Dev restart needed? | KADANG | TIDAK |

## 🔗 Related Files

- `/workspace/src/context/notification.context.tsx` - Main fix
- `/workspace/src/context/auth.context.tsx` - Enhanced logging
- `/workspace/src/hooks/useSSE.ts` - Enhanced logging

## ✅ Checklist

- [x] Fix dependency array di useEffect
- [x] Remove stale closure dari SSE callback
- [x] Enhanced logging untuk debugging
- [x] Test manual login flow
- [x] Verify no lint errors
- [x] Documentation

## 🎉 Result

State notification sekarang **otomatis update** setelah login tanpa perlu reload! 🚀
