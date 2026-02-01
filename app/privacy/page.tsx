export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">隱私權政策 (Privacy Policy)</h1>
      
      <div className="space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">1. 簡介</h2>
          <p>
            TubeMind（以下簡稱「本服務」）是由開發者個人維護的 Side Project 作品。
            我們非常重視您的隱私，本政策旨在說明我們如何收集、使用與保護您的個人資訊。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">2. 資料收集</h2>
          <p className="mb-2">當您使用 Google 帳號登入本服務時，我們會收集以下資訊：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>電子郵件地址 (Email)</li>
            <li>公開的個人資料（姓名、頭像）</li>
            <li>YouTube 頻道訂閱列表（僅在您授權後讀取）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">3. 資料使用</h2>
          <p>我們收集的資料僅用於：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>識別您的身份並建立使用者帳號。</li>
            <li>為您提供 YouTube 影片摘要服務。</li>
            <li>本服務不會將您的資料出售或分享給任何第三方。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">4. 資料刪除</h2>
          <p>
            您可以隨時聯絡開發者或在 Google 帳戶設定中撤銷對本服務的授權。
            如果您希望徹底刪除在本服務的所有資料，請聯絡開發者。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">5. 聯絡方式</h2>
          <p>
            如有任何疑問，請聯繫：q0926727580@gmail.com
          </p>
        </section>
      </div>
    </div>
  )
}
