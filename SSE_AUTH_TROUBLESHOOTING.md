# 🔧 SSE Authentication Troubleshooting

## 🔍 Masalah
Backend log menunjukkan: `[SSE] Client connected: undefined`

Artinya SSE endpoint **tidak mendapatkan userId** dari request.

## 📊 Analisis

### Frontend (✅ SUDAH BENAR)
- `EventSource` menggunakan `withCredentials: true` ✅
- Axios menggunakan `withCredentials: true` ✅  
- Login/Register berhasil set user state ✅
- Delay 100ms ditambahkan sebelum SSE connect ✅

### Backend (⚠️ PERLU DICEK)

**EventSource API Limitation:**
- EventSource **TIDAK BISA** mengirim custom headers (seperti `Authorization: Bearer token`)
- EventSource **HANYA BISA** mengirim **cookies**
- Jadi backend SSE endpoint **HARUS** membaca auth dari cookies, bukan dari headers

## 🔧 Solusi Backend

### 1. **Pastikan Login/Register Set Cookies**

```typescript
// ✅ BENAR - Set httpOnly cookie saat login
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
});

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

### 2. **SSE Endpoint Harus Baca Cookies**

```typescript
// ❌ SALAH - EventSource tidak bisa kirim headers
const token = req.headers.authorization; // undefined!

// ✅ BENAR - Baca dari cookies
const token = req.cookies.accessToken; // atau req.cookies['accessToken']

// ✅ BENAR - Parse userId dari token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const userId = decoded.userId;

console.log('[SSE] Client connected:', userId); // ✅ Akan ada isinya
```

### 3. **CORS Configuration**

Pastikan backend CORS mengizinkan credentials:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // ⚠️ PENTING!
}));
```

### 4. **Cookie Parser Middleware**

Pastikan menggunakan cookie-parser:

```typescript
import cookieParser from 'cookie-parser';

app.use(cookieParser());
```

## 🎯 Checklist Backend

- [ ] Login endpoint set `accessToken` & `refreshToken` di cookies
- [ ] Cookies setting: `httpOnly: true`, `sameSite: 'lax'`
- [ ] SSE endpoint baca token dari `req.cookies.accessToken`
- [ ] SSE endpoint verify JWT dan extract userId
- [ ] CORS: `credentials: true`
- [ ] Middleware: `app.use(cookieParser())`

## 🧪 Testing

### 1. Cek Cookies Di Browser

Setelah login, buka DevTools → Application → Cookies:
- Pastikan ada `accessToken` cookie
- Pastikan ada `refreshToken` cookie

### 2. Cek Network Request

DevTools → Network → `sse/connect`:
- Tab "Headers" → Request Headers
- Pastikan ada `Cookie: accessToken=...`

### 3. Cek Backend Log

Setelah SSE connect, backend log harus menunjukkan:
```
[SSE] Client connected: <user-id-disini>  ✅
```

Bukan:
```
[SSE] Client connected: undefined  ❌
```

## 🔗 Flow Diagram

```
┌─────────┐     Login POST      ┌─────────┐
│ Frontend│ ──────────────────> │ Backend │
└─────────┘                     └─────────┘
                                      │
                                Set Cookies
                                (accessToken)
                                      │
                                      v
┌─────────┐     SSE Connect     ┌─────────┐
│ Frontend│ ──────────────────> │ Backend │
└─────────┘   + Cookies         └─────────┘
              (withCredentials)       │
                                Read Cookies
                                Extract userId
                                      │
                                      v
                          [SSE] Client connected: <userId>
```

## 📝 Alternative Solution

Jika backend tidak bisa menggunakan cookies, gunakan **query parameter** (less secure):

### Frontend:
```typescript
const url = `${apiUrl}/sse/connect?token=${accessToken}`;
```

### Backend:
```typescript
const token = req.query.token;
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

⚠️ **Tidak direkomendasikan** karena token akan muncul di URL dan bisa ter-log.

## ✅ Expected Result

Setelah fix, backend log harus menunjukkan:

```
POST /api/v1/users/login
GET /api/v1/sse/connect
[SSE] Client connected: 550e8400-e29b-41d4-a716-446655440000  ✅
```
