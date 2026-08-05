import type { Metadata } from "next";
import Link from "next/link";
import styles from "../assets/css/Game.Master.module.css";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Usurper's Gambit",
  description:
    "Usurper's Gambit で取り扱う個人情報および Google アカウント情報の利用について。",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.privacy}>
      <header className={styles.privacy__header}>
        <h1 className={styles.privacy__title}>プライバシーポリシー</h1>
        <Link href="/" className={styles.privacy__back}>
          タイトルへ戻る
        </Link>
      </header>

      <div className={styles.privacy__body}>
        <section className={styles.privacy__section}>
          <p>
            BST 株式会社（以下「当社」といいます）は、当社が提供するオンラインカードゲーム
            「Usurper&apos;s Gambit」（以下「本サービス」といいます）における個人情報の取扱いについて、
            以下のとおり本プライバシーポリシー（以下「本ポリシー」といいます）を定めます。
          </p>
          <p>
            当社は、個人情報の保護に関する法律、個人情報保護に関するガイドライン等の指針、
            その他個人情報保護に関する関係法令を遵守します。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>1. 適用範囲</h2>
          <p>
            本ポリシーは、本サービスにおけるユーザーの個人情報の取扱いに適用されます。
            当社の他のサービスにおける個人情報の取扱いについては、
            <a
              href="https://bstinc.co.jp/contact/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.privacy__extLink}
            >
              当社コーポレートサイトのプライバシーポリシー
            </a>
            が適用されます。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>2. 取得する情報</h2>

          <h3>2-1. Google アカウントを用いたログイン時に取得する情報</h3>
          <p>
            本サービスでは、ユーザーの認証手段として Google LLC（以下「Google」といいます）の
            OAuth 2.0 サービスを利用しています。ユーザーが Google ログインを選択した場合、
            当社は Google からユーザーの同意に基づき以下の情報を取得します。
          </p>
          <ul>
            <li>Google アカウントの一意識別子（<code>sub</code> クレーム）</li>
            <li>Google アカウントに登録された表示名</li>
            <li>Google アカウントに登録されたメールアドレス</li>
            <li>Google アカウントに登録されたプロフィール画像 URL</li>
          </ul>
          <p>
            当社が Google から取得する情報の範囲は、Google が提供する
            OAuth 同意画面に明示された内容に限られます。
          </p>

          <h3>2-2. 本サービス利用時にユーザーが登録する情報</h3>
          <ul>
            <li>プレイヤーネーム（ユーザーが任意で設定した表示名）</li>
            <li>デッキ構成（ユーザーが編成したカードの組み合わせ）</li>
            <li>プレイヤーネーム最終更新日時、データ最終更新日時</li>
          </ul>

          <h3>2-3. Cookie およびローカルストレージ</h3>
          <ul>
            <li>
              <strong>NextAuth セッション Cookie</strong>：ログイン状態を維持するための必須 Cookie です。
              セッション有効期間中に限り、ブラウザに保存されます。
            </li>
            <li>
              <strong>ローカルストレージ（ゲストプレイ時）</strong>：Google ログインを行わずにゲストでプレイした場合、
              端末上の <code>localStorage</code> にデッキ構成等が保存されます。
              サーバーには送信されず、当社は取得しません。
            </li>
          </ul>
        </section>

        <section className={styles.privacy__section}>
          <h2>3. 利用目的</h2>
          <p>
            当社は、前項で取得した情報を、以下の目的の達成に必要な範囲でのみ利用します。
            法令に定める場合または本人の同意を得た場合を除き、これらの目的を超えて利用することはありません。
          </p>
          <ul>
            <li>本サービスにおけるユーザー識別および認証</li>
            <li>プレイヤーネームおよびデッキ構成のクラウド同期（複数端末間での引き継ぎ）</li>
            <li>本サービスの運営、維持、管理およびユーザーサポート対応</li>
            <li>不正利用の防止および本サービスの安全性確保</li>
            <li>本サービスの品質向上および改善のための統計的分析（個人を特定しない形式）</li>
          </ul>
          <p>
            当社が Google から取得した情報は、Google API Services User Data Policy
            （<a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.privacy__extLink}
            >
              Limited Use requirements を含む
            </a>）
            を遵守して取り扱います。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>4. 第三者への提供および委託</h2>
          <p>
            当社は、法令で定める場合を除き、本人の同意なく取得した個人情報を第三者に提供することはありません。
            ただし、本サービスの運営上、以下の事業者へ情報の取扱いを委託しています。
            委託にあたっては、委託先の適格性を審査し、安全管理措置に関する必要かつ適切な監督を行います。
          </p>
          <table className={styles.privacy__table}>
            <thead>
              <tr>
                <th>委託先</th>
                <th>委託内容</th>
                <th>該当情報</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Google LLC（米国）</td>
                <td>OAuth 2.0 認証プロバイダ</td>
                <td>Google アカウント情報</td>
              </tr>
              <tr>
                <td>Vercel Inc.（米国）</td>
                <td>本サービスのホスティング</td>
                <td>アクセスログ、ユーザー識別子</td>
              </tr>
              <tr>
                <td>Vercel Inc. / Upstash, Inc.（米国）</td>
                <td>ユーザーデータの保管（Vercel KV / Redis）</td>
                <td>ユーザー識別子、プレイヤーネーム、デッキ構成</td>
              </tr>
            </tbody>
          </table>
          <p>
            これらの委託先はいずれも米国に所在します。個人情報の越境移転にあたっては、
            各事業者が公表するプライバシーポリシーおよびデータ処理条項に基づき、適切な保護措置を確保します。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>5. 個人情報の安全管理</h2>
          <p>
            当社は、個人情報の漏えい、滅失またはき損の防止その他個人情報の安全管理のために、
            組織的、物理的、人的、技術的に必要かつ適切な措置を講じます。
            通信は原則として TLS で暗号化し、認証情報は業界標準の方式で保管します。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>6. 保存期間と削除</h2>
          <p>
            当社は、利用目的の達成に必要な期間に限り個人情報を保存します。
            ユーザーが以下のいずれかを行った場合、当該ユーザーに紐づくサーバー上のデータ
            （プレイヤーネーム、デッキ構成、Google 由来の識別子等）を消去します。
          </p>
          <ul>
            <li>本サービス内から Google 連携を解除した場合</li>
            <li>後述の窓口を通じて削除を申請した場合</li>
          </ul>
          <p>
            ゲストプレイ時にブラウザの <code>localStorage</code> に保存されたデータは、
            ブラウザの設定またはサイトデータの削除機能によりユーザーご自身で削除いただけます。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>7. 開示・訂正・削除等の請求</h2>
          <p>
            当社が保有する個人情報について、本人からの開示、訂正、追加、削除、
            利用停止、第三者提供の停止その他の請求があった場合、法令に従い速やかに対応します。
            請求は下記のお問い合わせ窓口までご連絡ください。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>8. Cookie の管理</h2>
          <p>
            ユーザーはブラウザの設定により Cookie の受け入れを拒否または削除できます。
            ただし、Cookie を無効にした場合、Google ログインを含む一部機能がご利用いただけません。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>9. 未成年者の利用</h2>
          <p>
            未成年者が本サービスを利用する場合、保護者の同意を得た上でご利用ください。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>10. 本ポリシーの改定</h2>
          <p>
            当社は、法令の変更または本サービスの変更に伴い、本ポリシーを改定することがあります。
            重要な変更を行う場合は、本サービス上で告知します。改定後の本ポリシーは、
            本ページに掲載した時点から効力を生じます。
          </p>
        </section>

        <section className={styles.privacy__section}>
          <h2>11. お問い合わせ窓口</h2>
          <p>
            個人情報の取扱いに関するお問い合わせは、以下の窓口までご連絡ください。
          </p>
          <p>
            BST 株式会社<br />
            〒112-0004 東京都文京区後楽 2-16-5 福永ビル<br />
            TEL: 03-6280-8094<br />
            個人情報相談窓口責任者
          </p>
        </section>

        <p className={styles.privacy__meta}>
          制定日：2026 年 8 月 5 日
        </p>
      </div>
    </div>
  );
}
