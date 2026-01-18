export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>

      <div className="prose prose-gray max-w-none">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">第1条（適用）</h2>
          <p className="text-gray-600 mb-4">
            本規約は、Bookmarker（以下「本サービス」といいます）の利用条件を定めるものです。
            ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">第2条（利用登録）</h2>
          <p className="text-gray-600 mb-4">
            本サービスの利用を希望する方は、本規約に同意の上、所定の方法によって利用登録を申請し、
            当方がこれを承認することによって、利用登録が完了するものとします。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">第3条（禁止事項）</h2>
          <p className="text-gray-600 mb-4">
            ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>他のユーザーに迷惑をかける行為</li>
            <li>不正アクセスを試みる行為</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">第4条（免責事項）</h2>
          <p className="text-gray-600 mb-4">
            当方は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。
            当方は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">第5条（規約の変更）</h2>
          <p className="text-gray-600 mb-4">
            当方は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
          </p>
        </section>

        <p className="text-sm text-gray-500 mt-8">
          最終更新日: 2026年1月1日
        </p>
      </div>
    </div>
  );
}
