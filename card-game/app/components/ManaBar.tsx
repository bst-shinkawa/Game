"use client";

import React from 'react';
import { ManaCrystal } from './ManaCrystal';
import { clsx } from 'clsx'; // クラス名を結合するために clsx をインポートします

interface ManaBarProps {
    maxMana: number;
    currentMana: number;
    // --- 【追加】エネミーとプレイヤーを区別するプロパティ ---
    type: "player" | "enemy"; 
}

const ManaBar: React.FC<ManaBarProps> = ({ maxMana, currentMana, type }) => {
    // 0からmaxMana-1までの配列を作成（最大10を想定）
    const slots = Array.from({ length: maxMana }, (_, i) => i);

    // --- 【変更点1】数値表示の位置クラスを定義 ---
    const numberPositionClasses = {
        // プレイヤー: マナクリスタル群の上（中央）に重ねる
        player: "left-1/2 top-[60px] transform -translate-x-1/2 -translate-y-1/2",
        enemy: "left-1/2 top-[-10px] transform -translate-x-1/2 -translate-y-1/2", 
    };

    // マナクリスタルの色も type に合わせて変更
    const numberColorClass = type === 'player' ? 'text-cyan-300' : 'text-rose-300';

    return (
        // 背景色なども type に合わせて調整すると統一感が出ます
        <div className={clsx(
            "flex items-center gap-1 relative p-2 rounded-xl w-fit backdrop-blur-sm",
            type === 'player'
        )}> 
            
            {/* --- 1. マナクリスタルの並び --- */}
            <div className="flex items-center gap-1">
                {slots.map((index) => {
                    const isActive = index < currentMana;
                    
                    return (
                        <ManaCrystal 
                            key={index} 
                            isActive={isActive} 
                            // --- 【変更点2】type プロパティを ManaCrystal に渡す ---
                            type={type} 
                        />
                    );
                })}
            </div>

            {/* --- 2. 数値表示 (1/10 形式) の追加 --- */}
            <div className={clsx(
                "absolute", 
                numberPositionClasses[type], // type に基づいて位置クラスを適用
                "flex items-end justify-center pointer-events-none text-white/90 font-mono drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]"
            )}>
                
                <span className={clsx("text-3xl font-extrabold", numberColorClass)}>
                    {currentMana}
                </span>
                <span className="text-sm opacity-80 pb-0.5 ml-0.5">
                    / {maxMana}
                </span>
            </div>
        </div>
    );
};

export default ManaBar;