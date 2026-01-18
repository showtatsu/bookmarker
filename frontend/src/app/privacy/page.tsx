export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>

      <div className="prose prose-gray max-w-none">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. 収集する情報</h2>
          <p className="text-gray-600 mb-4">
            本サービスでは、以下の情報を収集します。
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>ユーザー名</li>
            <li>メールアドレス</li>
            <li>パスワード（ハッシュ化して保存）</li>
            <li>ブックマーク情報（URL、ファイルパス、タイトル、タグ等）</li>
            <li>アクセスログ（IPアドレス、ユーザーエージェント等）</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. 情報の利用目的</h2>
          <p className="text-gray-600 mb-4">
            収集した情報は、以下の目的で利用します。
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>本サービスの提供・運営</li>
            <li>ユーザー認証</li>
            <li>サービスの改善・開発</li>
            <li>不正利用の防止</li>
            <li>お問い合わせへの対応</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. 情報の保護</h2>
          <p className="text-gray-600 mb-4">
            当方は、ユーザーの個人情報を適切に管理し、不正アクセス、紛失、破壊、改ざん、
            漏洩などを防止するために必要なセキュリティ対策を講じます。
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>パスワードはbcryptでハッシュ化して保存</li>
            <li>通信はHTTPSで暗号化</li>
            <li>認証トークンはHTTPOnly Cookieで管理</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. 第三者への提供</h2>
          <p className="text-gray-600 mb-4">
            当方は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Cookieの使用</h2>
          <p className="text-gray-600 mb-4">
            本サービスでは、認証状態を維持するためにCookieを使用します。
            ブラウザの設定でCookieを無効にした場合、本サービスの一部機能がご利用いただけなくなります。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. データの削除</h2>
          <p className="text-gray-600 mb-4">
            ユーザーはいつでもアカウントを削除することができます。
            アカウント削除時には、関連するすべてのデータ（ブックマーク、タグ等）が削除されます。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. ポリシーの変更</h2>
          <p className="text-gray-600 mb-4">
            当方は、必要に応じて本プライバシーポリシーを変更することがあります。
            重要な変更がある場合は、本サービス上でお知らせします。
          </p>
        </section>

        <p className="text-sm text-gray-500 mt-8">
          最終更新日: 2026年1月1日
        </p>
      </div>
    </div>
  );
}
