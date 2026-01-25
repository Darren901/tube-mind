[ ] [正常情況] JWT Callback - 初次登入
**測試資料**
- account: 包含 access_token, refresh_token, expires_at
- token: 初始 token

**預期結果**
- 回傳包含 accessToken, refreshToken, accessTokenExpires 的 token

---

[ ] [正常情況] JWT Callback - Token 未過期
**測試資料**
- token: 包含有效的 accessTokenExpires (未來時間)

**預期結果**
- 直接回傳原 token

---

[ ] [正常情況] JWT Callback - Token 已過期 (自動刷新)
**測試資料**
- token: accessTokenExpires 為過去時間
- mock refreshAccessToken: 回傳新 token

**預期結果**
- refreshAccessToken 被呼叫
- 回傳刷新後的 token

---

[ ] [正常情況] Session Callback
**測試資料**
- session: 包含 user 物件
- token: 包含 accessToken, sub (user id)

**預期結果**
- session.accessToken 被設定
- session.user.id 被設定為 token.sub

---

[ ] [異常處理] Refresh Token 失敗
**測試資料**
- refreshAccessToken 拋出錯誤

**預期結果**
- token 包含 error: "RefreshAccessTokenError"
