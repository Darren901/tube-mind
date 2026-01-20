# gen-test-workflow 更新說明

**更新日期**: 2026-01-20  
**檔案位置**: `~/.config/opencode/template/gen-test-workflow.md`

## 更新目的

避免在 token 爆掉後，新的 session 重複測試已完成的 API。透過 `TEST-OVERVIEW.md` 集中管理所有測試進度。

---

## 主要修改

### 1. 階段 1: 新增測試總覽檢查

**原本**: 只建立測試目錄和讀取模板

**現在**: 增加 TEST-OVERVIEW.md 的檢查與生成

```markdown
2. **檢查測試總覽檔案** `docs/test/TEST-OVERVIEW.md`:
   - **若檔案不存在**: 
     - 掃描專案所有 API 路徑 (app/api/**/route.ts)
     - 掃描現有測試檔案 (test/**/*.test.ts)
     - 生成 TEST-OVERVIEW.md
   - **若檔案已存在**: 
     - 讀取並分析當前測試進度
     - 確認要測試的 API 尚未完成
     - 若已完成則警告使用者
```

**好處**:
- 每次開始測試前先檢查進度
- 避免重複測試已完成的 API
- 新 session 可立即了解整體進度

---

### 2. 階段 4: 新增測試總覽更新

**原本**: 只更新測試案例文檔的勾選狀態

**現在**: 同時更新 TEST-OVERVIEW.md

```markdown
3. **更新測試總覽** `docs/test/TEST-OVERVIEW.md`:
   - 在進度表中標記該 API 為完成 ✅
   - 更新測試數量統計
   - 更新完成進度百分比
   - 在「已完成的測試」區塊新增該 API 的說明
```

**好處**:
- 測試完成後立即同步進度
- 保持文檔一致性
- 方便追蹤整體測試覆蓋率

---

### 3. 完成條件: 強制檢查總覽更新

**原本**: 只檢查測試案例是否完成

**現在**: 增加 TEST-OVERVIEW.md 更新檢查

```markdown
- **TEST-OVERVIEW.md 已更新**:
  - 進度表標記為完成 ✅
  - 測試數量已更新
  - 已完成測試區塊新增該 API 說明
```

**好處**:
- 確保每次測試完成都有更新總覽
- 防止遺漏更新

---

### 4. 重要原則: 新增兩條規則

**新增原則 7**:
```markdown
7. **必須更新 TEST-OVERVIEW.md**: 每次完成測試後，必須同步更新測試總覽檔案，
   避免 token 爆掉後新 session 做重複工作
```

**新增原則 8**:
```markdown
8. **檢查重複工作**: 開始測試前，先檢查 TEST-OVERVIEW.md 確認該 API 是否已測試完成
```

**好處**:
- 明確規範 AI 的行為
- 減少人工干預

---

## 工作流程變化

### 舊流程
```
1. 準備環境 → 2. 生成測試案例 → 3. 撰寫測試 → 4. 執行測試 → 5. 修復失敗
                                                         ↓
                                              只更新 test-cases.md
```

### 新流程
```
1. 準備環境 + 檢查 TEST-OVERVIEW.md
   ↓ (若已完成則警告)
2. 生成測試案例 → 3. 撰寫測試 → 4. 執行測試 + 更新 TEST-OVERVIEW.md → 5. 修復失敗
                                       ↓
                        同時更新 test-cases.md 和 TEST-OVERVIEW.md
```

---

## 使用範例

### 第一次使用 (TEST-OVERVIEW.md 不存在)

```bash
# 執行測試 workflow
gen-test-workflow /api/youtube/subscriptions
```

**AI 會自動**:
1. 掃描所有 API 路徑
2. 掃描現有測試檔案
3. 生成 `docs/test/TEST-OVERVIEW.md`
4. 顯示當前進度 (10/18 APIs 已完成)
5. 繼續測試流程

---

### 後續使用 (TEST-OVERVIEW.md 已存在)

```bash
# 執行測試 workflow
gen-test-workflow /api/youtube/subscriptions
```

**AI 會自動**:
1. 讀取 `docs/test/TEST-OVERVIEW.md`
2. 檢查 `/api/youtube/subscriptions` 是否已完成
   - 若已完成 → ⚠️ 警告使用者
   - 若未完成 → ✅ 繼續流程
3. 測試完成後更新 TEST-OVERVIEW.md:
   - 進度表標記為完成 ✅
   - 更新統計數據 (11/18 APIs)
   - 新增該 API 的說明

---

### Token 爆掉後的新 Session

**情境**: 完成 3 個 API 測試後 token 用完，開啟新 session

```bash
# 新 session 中執行
gen-test-workflow /api/summaries/batch
```

**AI 會自動**:
1. 讀取 `docs/test/TEST-OVERVIEW.md`
2. 看到進度: 13/18 APIs 已完成
3. 確認 `/api/summaries/batch` 未完成
4. 繼續測試（不會重複測試已完成的 API）

**不需要**:
- ❌ 重新掃描所有測試
- ❌ 手動告訴 AI 哪些已完成
- ❌ 查看 git log 確認進度

---

## TEST-OVERVIEW.md 格式要求

### 必須包含的區塊

1. **測試進度總表**
```markdown
| # | API 路徑 | 測試檔案 | 文檔 | 狀態 | 測試數 |
|---|---------|---------|------|------|--------|
| 1 | GET /api/channels | ✅ | ✅ | 完成 | 8 |
| 2 | POST /api/channels | ✅ | ✅ | 完成 | (含在上方) |
```

2. **完成進度統計**
```markdown
**完成進度**: 10/18 APIs (55.6%)  
**測試覆蓋**: 84 個測試
```

3. **已完成的測試**
```markdown
### 1. Channels API (`/api/channels`)
- **測試檔案**: `test/app/api/channels/route.test.ts`
- **文檔**: `docs/test/channels-api-test-cases.md`
- **測試數量**: 8 個
- **覆蓋功能**: ...
```

4. **待測試的 API**
```markdown
### 9. `/api/youtube/subscriptions` (GET)
- **功能**: 獲取使用者的 YouTube 訂閱頻道列表
- **預估測試數**: 8-10 個
- **關鍵測試點**: ...
```

---

## AI 更新 TEST-OVERVIEW.md 的步驟

### 測試完成後 (階段 4)

1. **讀取** `docs/test/TEST-OVERVIEW.md`
2. **更新進度表**:
   ```diff
   - | 9 | GET /api/youtube/subscriptions | ❌ | ❌ | **待測試** | 0 |
   + | 9 | GET /api/youtube/subscriptions | ✅ | ✅ | 完成 | 10 |
   ```
3. **更新統計數據**:
   ```diff
   - **完成進度**: 10/18 APIs (55.6%)  
   - **測試覆蓋**: 84 個測試
   + **完成進度**: 11/18 APIs (61.1%)  
   + **測試覆蓋**: 94 個測試
   ```
4. **新增已完成區塊**:
   ```markdown
   ### 9. YouTube Subscriptions API (`/api/youtube/subscriptions`)
   - **測試檔案**: `test/app/api/youtube/subscriptions/route.test.ts`
   - **文檔**: `docs/test/youtube-subscriptions-test-cases.md`
   - **測試數量**: 10 個
   - **覆蓋功能**: 權限驗證、YouTube API 整合、標記已新增頻道...
   ```

---

## 常見問題

### Q1: 如果我手動測試了某個 API，怎麼更新 TEST-OVERVIEW.md？

**A**: 手動編輯 `docs/test/TEST-OVERVIEW.md`，按照格式更新即可。AI 下次會讀取最新狀態。

### Q2: 如果我想重新測試某個 API？

**A**: 
1. 在 TEST-OVERVIEW.md 中將該 API 改為 ❌ 待測試
2. 執行 `gen-test-workflow [API路徑]`

### Q3: TEST-OVERVIEW.md 損壞或格式錯誤怎麼辦？

**A**: 刪除該檔案，重新執行 workflow，AI 會自動重建。

### Q4: 能不能跳過某些 API 不測試？

**A**: 可以，在 TEST-OVERVIEW.md 進度表中標記為「跳過」或移除該行即可。

---

## 總結

### 主要優點

✅ **避免重複工作**: 新 session 自動知道哪些已完成  
✅ **集中管理進度**: 單一檔案掌握全局  
✅ **自動同步更新**: 測試完成後自動更新總覽  
✅ **減少人工干預**: AI 自動檢查並警告  

### 使用建議

1. **第一次使用**: 讓 AI 自動生成 TEST-OVERVIEW.md
2. **每次測試**: 確認 AI 有更新 TEST-OVERVIEW.md
3. **新 session**: 先看 TEST-OVERVIEW.md 了解進度
4. **定期檢查**: 確保統計數據正確

---

**更新者**: AI Agent  
**審核者**: Human Review
