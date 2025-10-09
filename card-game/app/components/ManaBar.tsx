// ManaBar.tsx
import styles from "../assets/css/Game.Master.module.css";

type ManaBarProps = {
  maxMana: number;
  currentMana: number;
};

const ManaBar: React.FC<ManaBarProps> = ({ maxMana, currentMana }) => {
  return (
    <div className={styles["mana-bar"]}>
      {Array.from({ length: maxMana }).map((_, i) => (
        <span
          key={i}
          className={`${styles["mana-slot"]} ${i < currentMana ? styles.available : ""}`}
        />
      ))}
    </div>
  );
};

export default ManaBar;
