import React from 'react';
import styles from './css/Game.module.css';

const Game: React.FC = () => {
  return (
    
    <div className={styles.field}>

      <div className={styles.field_enemy}>

          <div className={styles.field_enemy_hero}>
              <div className={styles.field_enemy_hero_wrap}>
                  {/* <img src="" alt=""> */}
                  <div className={styles.field_enemy_hero_hp}>
                      <p>20</p>
                  </div>
              </div>
          </div>

          <div className={styles.field_enemy_battle}>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
          </div>

          <div className={styles.field_enemy_hand}>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
          </div>

          <div className={styles.field_enemy_mana}>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
          </div>

          <div className={styles.field_enemy_timer}>
              <p>60</p>
          </div>

          <div className={styles.field_enemy_status}>
              <div className={styles.field_enemy_status_hand}>
                  <p>10</p>
              </div>
              <div className={styles.field_enemy_status_deck}>
                  <p>30</p>
              </div>
              <div className={styles.field_enemy_status_deth}>
                  <p>0</p>
              </div>
          </div>

      </div>

      <div className={styles.field_player}>
          <div className={styles.field_player_hero}>
              <div className={styles.field_player_hero_wrap}>
                  {/* <img src="" alt=""> */}
                  <div className={styles.field_player_hero_hp}>
                      <p>20</p>
                  </div>
              </div>
          </div>

          <div className={styles.field_player_battle}>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
          </div>

          <div className={styles.field_player_hand}>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
              <div className={styles.card} data-type="follower">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>2</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>3</p>
                  </div>
              </div>
              <div className={styles.card} data-type="spell">
                  {/* <img src="" alt=""> */}
                  <div className={styles.card_hp}>
                      <p>1</p>
                  </div>
                  <div className={styles.card_attack}>
                      <p>1</p>
                  </div>
              </div>
          </div>

          <div className={styles.field_player_timer}>
              <p>60</p>
          </div>

          <div className={styles.field_player_status}>
              <div className={styles.field_player_status_hand}>
                  <p>10</p>
              </div>
              <div className={styles.field_player_status_deck}>
                  <p>30</p>
              </div>
              <div className={styles.field_player_status_deth}>
                  <p>0</p>
              </div>
          </div>

          <div className={styles.field_player_mana}>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
              <span className={`${styles["mana-slot"]} ${styles.available}`}></span>
          </div>

      </div>

      <div className={styles.field_turn}>
          <button>TurnEnd</button>
      </div>

  </div>


    
  );
};

export default Game;