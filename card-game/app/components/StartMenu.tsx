// StartMenu.tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "../assets/css/Game.Master.module.css";

type Props = {
  authChecked: boolean;
  showEntryChoice: boolean;
  isLoggedIn: boolean;
  playerName?: string | null;
  onSelectGuest: () => void;
  onGoogleLogin: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onSelectMode: (mode: "cpu" | "pvp") => void;
  onDeck: () => void;
};

const StartMenu: React.FC<Props> = ({
  authChecked,
  showEntryChoice,
  isLoggedIn,
  playerName,
  onSelectGuest,
  onGoogleLogin,
  onLogout,
  onOpenProfile,
  onSelectMode,
  onDeck,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  if (!authChecked) {
    return (
      <div className={styles.titleScreen}>
        <p className={styles.titleScreen__loading}>認証状態を確認中...</p>
      </div>
    );
  }

  if (showEntryChoice) {
    return (
      <div className={styles.titleScreen}>
        <div className={styles.titleScreen__entry}>
          <Image
            className={styles.titleScreen__logo}
            src="/img/front/title_logo.png"
            alt="Usurper's Gambit"
            width={460}
            height={177}
            priority
          />

          <p className={styles.titleScreen__entryText}>
            はじめにプレイ方法を選んでください。
            <br />
            Googleログインでクラウド同期、ゲストでこの端末だけ保存できます。
          </p>

          <Link href="/privacy" className={styles.titleScreen__policyLink}>
            プライバシーポリシー
          </Link>

          <div className={styles.titleScreen__actions}>
            <button
              type="button"
              className={`${styles.titleScreen__btn} ${styles["titleScreen__btn--primary"]}`}
              onClick={onGoogleLogin}
            >
              Googleでログイン
            </button>
            <button type="button" className={styles.titleScreen__btn} onClick={onSelectGuest}>
              ゲストでプレイ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.titleScreen}>
      <button
        type="button"
        className={styles.titleScreen__menuBtn}
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="メニュー"
        title="メニュー"
      >
        ☰
      </button>

      {menuOpen ? (
        <div className={styles.titleScreen__dropdown}>
          {isLoggedIn ? (
            <>
              <button
                type="button"
                className={styles.titleScreen__dropdownBtn}
                onClick={() => {
                  setMenuOpen(false);
                  onOpenProfile();
                }}
              >
                プロフィール設定
              </button>
              <button
                type="button"
                className={`${styles.titleScreen__dropdownBtn} ${styles["titleScreen__dropdownBtn--danger"]}`}
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                サインアウト
              </button>
            </>
          ) : (
            <p className={styles.titleScreen__dropdownHint}>
              ログインするとメニューが有効になります。
            </p>
          )}
        </div>
      ) : null}

      {playerName ? (
        <p className={styles.titleScreen__playerName}>{playerName}</p>
      ) : null}

      <main className={styles.titleScreen__center}>
        <div className={styles.titleScreen__leftCol}>
          <Image
            className={styles.titleScreen__logo}
            src="/img/front/title_logo.png"
            alt="Usurper's Gambit"
            width={480}
            height={185}
            priority
          />

          <div className={styles.titleScreen__menuCol}>
            {isLoggedIn && !playerName ? (
              <p className={styles.titleScreen__alert}>
                プレイヤーネームが未設定です。☰メニュー → プロフィール設定から設定してください。
              </p>
            ) : null}

            <div className={`${styles.titleScreen__actions} ${styles["titleScreen__actions--menu"]}`}>
              <button
                type="button"
                className={`${styles.titleScreen__btn} ${styles["titleScreen__btn--primary"]}`}
                onClick={() => onSelectMode("cpu")}
              >
                CPU対戦
              </button>
              <button type="button" className={styles.titleScreen__btn} disabled title="準備中">
                ネット対戦
              </button>
              <button type="button" className={styles.titleScreen__btn} onClick={onDeck}>
                デッキ作成
              </button>
            </div>

            <p className={styles.titleScreen__notice}>
              ゲストでもデッキ保存は可能です（この端末のみ）。
              <br />
              ※編集したデッキは他の端末ではプレイできません。
            </p>

            {process.env.NODE_ENV === "development" && (
              <Link href="/dev/screens" className={styles.titleScreen__devLink}>
                Design Mode 用スクリーン一覧（開発用）
              </Link>
            )}
          </div>
        </div>

        <div className={styles.titleScreen__rightCol}>
          <section className={styles.titleScreen__rules} aria-label="ルール説明">
            <h2 className={styles.titleScreen__rulesTitle}>ルール説明</h2>
            <div className={styles.titleScreen__rulesBody}>
              <div className={styles.titleScreen__rulesSection}>
                <h3 className={styles.titleScreen__rulesHeading}>基本</h3>
                <p className={styles.titleScreen__rulesText}>
                  <span className={styles.titleScreen__tagKing}>先攻</span>
                  王様デッキ　
                  <span className={styles.titleScreen__tagUsurper}>後攻</span>
                  簒奪者デッキ
                </p>
                <p className={styles.titleScreen__rulesText}>
                  ターン制の1対1。マナを使ってフォロワーやスペルを場に出し、相手のヒーローHPを削ります。
                </p>
              </div>

              <div className={styles.titleScreen__rulesSection}>
                <h3 className={styles.titleScreen__rulesHeading}>勝利条件（共通）</h3>
                <p className={styles.titleScreen__rulesText}>
                  相手プレイヤーの<span className={styles.titleScreen__em}>体力を0</span>にする
                </p>
              </div>

              <div className={`${styles.titleScreen__rulesBlock} ${styles["titleScreen__rulesBlock--king"]}`}>
                <h3 className={styles.titleScreen__rulesBlockTitle}>王様の特殊勝利</h3>
                <ul className={styles.titleScreen__rulesList}>
                  <li>10ラウンド終了までに倒されなければ勝利</li>
                  <li>自分の場にフォロワー3体以上の状態を、試合を通じて合計5回達成</li>
                </ul>
                <p className={styles.titleScreen__rulesSubhead}>陣形ボーナス</p>
                <p className={styles.titleScreen__rulesText}>
                  場にカードが<span className={styles.titleScreen__em}>3枚</span>出ている状態で、王デッキのカードに特殊ボーナスが付与されます。
                </p>
              </div>

              <div className={`${styles.titleScreen__rulesBlock} ${styles["titleScreen__rulesBlock--usurper"]}`}>
                <h3 className={styles.titleScreen__rulesBlockTitle}>簒奪者の特殊勝利</h3>
                <ul className={styles.titleScreen__rulesList}>
                  <li>10ラウンド以内に相手を撃破</li>
                  <li>王様の手札を0枚にする</li>
                </ul>
                <p className={styles.titleScreen__rulesSubhead}>暗器シナジー</p>
                <p className={styles.titleScreen__rulesText}>
                  1ターンに使用する<span className={styles.titleScreen__em}>暗器の枚数</span>に応じて、簒奪者デッキのカードに特殊ボーナスが付与されます。
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default StartMenu;
