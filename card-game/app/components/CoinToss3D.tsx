"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface CoinToss3DProps {
  running: boolean;
  onComplete: () => void;
  width?: number;
  height?: number;
  result?: "player" | "enemy";
}

const createCoinFaceTexture = (kind: "king" | "thief") => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = kind === "king" ? "#f4d06f" : "#d9b86a";
  ctx.fillRect(0, 0, 512, 512);

  const ring = ctx.createRadialGradient(256, 256, 30, 256, 256, 245);
  ring.addColorStop(0, "rgba(255,255,255,0.25)");
  ring.addColorStop(1, "rgba(120,80,20,0.26)");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(256, 256, 225, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(90,50,10,0.58)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(256, 256, 195, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#53380f";
  if (kind === "king") {
    // crown
    ctx.beginPath();
    ctx.moveTo(148, 330);
    ctx.lineTo(364, 330);
    ctx.lineTo(350, 220);
    ctx.lineTo(306, 268);
    ctx.lineTo(256, 182);
    ctx.lineTo(205, 268);
    ctx.lineTo(162, 220);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(160, 330, 192, 32);
    ctx.fillStyle = "#fff2bf";
    ctx.beginPath();
    ctx.arc(256, 287, 17, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // simple dagger mark
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(-0.42);

    // blade
    ctx.fillStyle = "#f7f7f7";
    ctx.beginPath();
    ctx.moveTo(-20, -122);
    ctx.lineTo(24, -18);
    ctx.lineTo(6, 6);
    ctx.lineTo(-38, -98);
    ctx.closePath();
    ctx.fill();

    // blade edge shadow
    ctx.fillStyle = "rgba(40,40,40,0.28)";
    ctx.beginPath();
    ctx.moveTo(-10, -102);
    ctx.lineTo(10, -52);
    ctx.lineTo(3, -42);
    ctx.lineTo(-18, -92);
    ctx.closePath();
    ctx.fill();

    // guard
    ctx.fillStyle = "#5b3a14";
    ctx.fillRect(-52, -8, 104, 20);

    // handle
    ctx.fillStyle = "#3d240c";
    ctx.fillRect(-14, 10, 28, 112);

    // pommel
    ctx.fillStyle = "#c7a158";
    ctx.beginPath();
    ctx.arc(0, 134, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
};

export const CoinToss3D: React.FC<CoinToss3DProps> = ({ running, onComplete, width = 320, height = 210, result }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 4.9);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    // Keep canvas fully transparent so background tone matches parent overlay.
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.style.background = "transparent";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const directional = new THREE.DirectionalLight(0xffffff, 1.15);
    directional.position.set(2.5, 3, 3.5);
    scene.add(directional);

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc28c32,
      roughness: 0.37,
      metalness: 0.95,
    });
    const kingTexture = createCoinFaceTexture("king");
    const thiefTexture = createCoinFaceTexture("thief");

    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd66d,
      roughness: 0.28,
      metalness: 0.9,
      map: kingTexture,
    });
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0xe6b347,
      roughness: 0.35,
      metalness: 0.88,
      map: thiefTexture,
    });
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.12, 48),
      [edgeMaterial, headMaterial, tailMaterial],
    );
    coin.rotation.x = Math.PI / 2;
    coin.scale.set(0.88, 0.88, 0.88);
    scene.add(coin);

    let rafId = 0;
    let startAt = 0;
    const durationMs = 1550;
    const resultIsPlayer = result === "player";
    const fullTurnsX = 10;
    const fullTurnsY = 5;
    const targetX = fullTurnsX * Math.PI * 2 + (resultIsPlayer ? 0 : Math.PI);
    const targetY = fullTurnsY * Math.PI * 2 + (Math.random() * 0.35 - 0.17);

    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

    const animate = (time: number) => {
      if (!startAt) startAt = time;
      const elapsed = time - startAt;
      const p = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(p);

      coin.rotation.x = targetX * eased + Math.PI / 2;
      coin.rotation.y = targetY * eased;
      coin.position.y = Math.sin(p * Math.PI) * 0.78;
      coin.position.x = Math.sin(p * Math.PI * 2.2) * (1 - p) * 0.08;

      renderer.render(scene, camera);

      if (p < 1) {
        rafId = window.requestAnimationFrame(animate);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    };

    const idleRender = () => {
      renderer.render(scene, camera);
    };

    if (running) {
      completedRef.current = false;
      rafId = window.requestAnimationFrame(animate);
    } else {
      idleRender();
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      scene.remove(coin);
      coin.geometry.dispose();
      edgeMaterial.dispose();
      headMaterial.dispose();
      tailMaterial.dispose();
      kingTexture?.dispose();
      thiefTexture?.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [running, onComplete, width, height, result]);

  return <div ref={mountRef} style={{ width, height, margin: "0 auto" }} aria-label="coin toss 3d" role="img" />;
};
