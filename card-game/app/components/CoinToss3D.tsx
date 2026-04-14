"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface CoinToss3DProps {
  running: boolean;
  onComplete: () => void;
  width?: number;
  height?: number;
  result?: "player" | "enemy";
  presentation?: "toss" | "result";
}

const createCoinFaceTexture = (kind: "king" | "thief") => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = kind === "king" ? "#ffd95f" : "#f1be54";
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

  ctx.fillStyle = "#2f1a05";
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
    ctx.fillStyle = "#f4d88b";
    ctx.beginPath();
    ctx.arc(256, 287, 17, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // fantasy thief dagger mark (curved blade + leather grip)
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(-0.24);

    // blade base shape (slightly curved)
    ctx.fillStyle = "#c8a96a";
    ctx.beginPath();
    ctx.moveTo(-8, -136);
    ctx.quadraticCurveTo(20, -124, 38, -82);
    ctx.quadraticCurveTo(26, -34, 10, -8);
    ctx.lineTo(-18, -12);
    ctx.quadraticCurveTo(-28, -60, -20, -108);
    ctx.closePath();
    ctx.fill();

    // blade highlight
    ctx.fillStyle = "rgba(236,220,170,0.45)";
    ctx.beginPath();
    ctx.moveTo(-2, -118);
    ctx.quadraticCurveTo(10, -100, 18, -68);
    ctx.quadraticCurveTo(12, -36, 2, -16);
    ctx.lineTo(-6, -18);
    ctx.quadraticCurveTo(2, -54, -2, -96);
    ctx.closePath();
    ctx.fill();

    // blade edge shadow for depth
    ctx.fillStyle = "rgba(12,7,3,0.58)";
    ctx.beginPath();
    ctx.moveTo(20, -98);
    ctx.quadraticCurveTo(30, -66, 20, -28);
    ctx.lineTo(11, -12);
    ctx.quadraticCurveTo(22, -52, 16, -88);
    ctx.closePath();
    ctx.fill();

    // guard (compact, thief-like)
    ctx.fillStyle = "#251607";
    ctx.beginPath();
    ctx.moveTo(-42, -8);
    ctx.quadraticCurveTo(-8, -22, 28, -6);
    ctx.quadraticCurveTo(10, 12, -30, 10);
    ctx.closePath();
    ctx.fill();

    // handle core
    ctx.fillStyle = "#1a0f05";
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(5, 8);
    ctx.lineTo(-4, 122);
    ctx.lineTo(-24, 116);
    ctx.closePath();
    ctx.fill();

    // leather wraps
    ctx.strokeStyle = "#5f3a12";
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i += 1) {
      const y = 24 + i * 18;
      ctx.beginPath();
      ctx.moveTo(-19, y);
      ctx.lineTo(1, y + 4);
      ctx.stroke();
    }

    // pommel ring
    ctx.fillStyle = "#7a511a";
    ctx.beginPath();
    ctx.arc(-13, 132, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1907";
    ctx.beginPath();
    ctx.arc(-13, 132, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
};

export const CoinToss3D: React.FC<CoinToss3DProps> = ({
  running,
  onComplete,
  width = 320,
  height = 210,
  result,
  presentation = "toss",
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);
  const completeTimeoutRef = useRef<number | null>(null);

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

    scene.add(new THREE.AmbientLight(0xffe6b8, 0.72));
    const hemi = new THREE.HemisphereLight(0xffd78a, 0x3a2a18, 0.5);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffcc72, 1.28);
    keyLight.position.set(2.8, 3.2, 3.8);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xfff0c2, 0.46);
    rimLight.position.set(-2.6, 1.4, -2.4);
    scene.add(rimLight);

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe3a93a,
      roughness: 0.24,
      metalness: 0.96,
      emissive: 0x5a3a0b,
      emissiveIntensity: 0.12,
    });
    const kingTexture = createCoinFaceTexture("king");
    const thiefTexture = createCoinFaceTexture("thief");

    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe06a,
      roughness: 0.16,
      metalness: 0.92,
      emissive: 0x7a520f,
      emissiveIntensity: 0.14,
      map: kingTexture,
    });
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc14f,
      roughness: 0.18,
      metalness: 0.9,
      emissive: 0x73490e,
      emissiveIntensity: 0.14,
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
    const fullTurnsY = 4 + Math.floor(Math.random() * 5);
    const targetX = fullTurnsX * Math.PI * 2 + (resultIsPlayer ? 0 : Math.PI);
    const targetY = fullTurnsY * Math.PI * 2 + (Math.random() * (Math.PI * 2) - Math.PI);

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
        completeTimeoutRef.current = window.setTimeout(() => {
          onComplete();
        }, 1000);
      }
    };

    const idleRender = () => {
      // Result presentation: lock to the decided face.
      if (presentation === "result") {
        coin.rotation.x = (resultIsPlayer ? 0 : Math.PI) + Math.PI / 2;
        coin.rotation.y = Math.PI * 0.12;
        coin.position.y = 0;
        coin.position.x = 0;
      }
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
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
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
  }, [running, onComplete, width, height, result, presentation]);

  return <div ref={mountRef} style={{ width, height, margin: "0 auto" }} aria-label="coin toss 3d" role="img" />;
};
