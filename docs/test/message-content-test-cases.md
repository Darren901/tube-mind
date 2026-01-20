# MessageContent Component 測試案例 (components/AIChat/MessageContent.tsx)

## 正常顯示 (Happy Path)
```
[x] [正常情況] 使用者訊息 (User Role)
**測試資料**
role = "user"
content = "Hello **world**"
**預期結果**
渲染為純文字 div，不解析 Markdown (顯示 "Hello **world**")
class 包含 whitespace-pre-wrap
```
---
```
[x] [正常情況] AI 訊息 - 基本 Markdown
**測試資料**
role = "assistant"
content = "Hello **bold** and *italic*"
**預期結果**
渲染為 Markdown
"bold" 顯示為粗體 (strong)
"italic" 顯示為斜體 (em)
```
---
```
[ ] [正常情況] AI 訊息 - 列表 (Skipped in Unit Test)
**測試資料**
role = "assistant"
content = "* Item 1\n* Item 2"
**預期結果**
渲染為無序列表 (ul > li)
```

## 時間戳記解析 (Timestamp Parsing)
```
[x] [正常情況] 單一時間戳記
**測試資料**
role = "assistant"
content = "Check this [02:30]"
**預期結果**
"[02:30]" 轉換為自定義連結元件
連結 href 為 "timestamp:02:30"
顯示帶有時鐘圖示的樣式
```
---
```
[x] [正常情況] 時間範圍戳記
**測試資料**
role = "assistant"
content = "Segment [01:00-02:00] is good"
**預期結果**
"[01:00-02:00]" 轉換為自定義連結元件
連結 href 為 "timestamp:01:00-02:00"
```
---
```
[x] [正常情況] 多個時間戳記
**測試資料**
role = "assistant"
content = "Start [00:10] then End [05:00]"
**預期結果**
兩個時間戳記都正確轉換為連結元件
文字 "Start " 和 " then End " 正常顯示
```

## 邊界值與異常處理 (Edge Cases & Error Handling)
```
[x] [邊界值] 空內容
**測試資料**
role = "assistant"
content = ""
**預期結果**
渲染空內容，不報錯
```
---
```
[x] [特殊情況] 類似時間戳但格式錯誤
**測試資料**
role = "assistant"
content = "Not a time [999:99] or [abc]"
**預期結果**
不應被轉換為時間戳記連結
顯示為普通文字
```
---
```
[x] [特殊情況] 時間戳記在 Markdown 語法中 (Tested implicitly via text content check)
**測試資料**
role = "assistant"
content = "**Bold [01:00]**"
**預期結果**
時間戳記仍應被識別並轉換為連結
外層粗體樣式應保留 (strong > timestamp link)
```
---
```
[x] [特殊情況] 一般連結與時間戳記並存
**測試資料**
role = "assistant"
content = "[Google](https://google.com) and [01:00]"
**預期結果**
Google 顯示為普通外部連結 (target="_blank")
[01:00] 顯示為時間戳記樣式
```
