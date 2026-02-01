export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">服務條款 (Terms of Service)</h1>
      
      <div className="space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">1. 接受條款</h2>
          <p>
            歡迎使用 TubeMind。本服務為個人開發之 Side Project，僅供展示與測試用途。
            當您使用本服務時，即表示您同意遵守本服務條款。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">2. 服務變更與終止</h2>
          <p>
            由於本服務依賴多個第三方 API (Google, OpenAI, YouTube)，我們保留隨時修改、暫停或終止服務的權利，恕不另行通知。
            開發者不保證服務的永久可用性。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">3. 使用限制</h2>
          <p>您同意不會利用本服務進行以下行為：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>惡意攻擊伺服器或濫用 API 資源。</li>
            <li>嘗試繞過額度限制系統。</li>
            <li>利用本服務處理違法或侵權內容。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">4. 免責聲明</h2>
          <p>
            本服務按「現狀」提供，不附帶任何形式的保證。
            AI 生成的摘要內容可能存在錯誤或幻覺，請以原影片內容為準。
          </p>
        </section>
      </div>
    </div>
  )
}
