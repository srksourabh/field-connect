"use client";

import { useEffect, useState } from "react";

interface AnalogClockProps {
  size?: number;
}

export default function AnalogClock({ size = 110 }: AnalogClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // IST offset: UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = time.getTime() + time.getTimezoneOffset() * 60000;
  const ist = new Date(utc + istOffset);

  const hours = ist.getHours() % 12;
  const minutes = ist.getMinutes();
  const seconds = ist.getSeconds();

  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;

  const center = size / 2;
  const outerR = center - 1;
  const bezelWidth = size * 0.07;
  const faceRadius = center - bezelWidth - 3;
  const innerRingR = faceRadius + 1.5;

  // Hand lengths
  const hourLen = faceRadius * 0.48;
  const minuteLen = faceRadius * 0.66;
  const secondLen = faceRadius * 0.76;
  const secondTail = faceRadius * 0.18;

  const handCoords = (angle: number, length: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + length * Math.cos(rad),
      y: center + length * Math.sin(rad),
    };
  };

  const hourEnd = handCoords(hourAngle, hourLen);
  const minuteEnd = handCoords(minuteAngle, minuteLen);
  const secondEnd = handCoords(secondAngle, secondLen);
  const secondStart = handCoords(secondAngle + 180, secondTail);

  // Tick marks
  const markers = Array.from({ length: 60 }, (_, i) => {
    const angle = ((i * 6 - 90) * Math.PI) / 180;
    const isHour = i % 5 === 0;
    const oR = faceRadius - 1.5;
    const iR = isHour ? faceRadius - 9 : faceRadius - 4.5;
    return {
      x1: center + iR * Math.cos(angle),
      y1: center + iR * Math.sin(angle),
      x2: center + oR * Math.cos(angle),
      y2: center + oR * Math.sin(angle),
      isHour,
    };
  });

  // All 12 hour numerals
  const numerals = Array.from({ length: 12 }, (_, i) => {
    const num = i === 0 ? 12 : i;
    const angle = i * 30;
    const rad = ((angle - 90) * Math.PI) / 180;
    const r = faceRadius - 18;
    return { num: String(num), x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.18)) drop-shadow(0 2px 6px rgba(0,0,0,0.1))" }}
    >
      <defs>
        {/* Bezel — turquoise-tinted chrome */}
        <linearGradient id="ck_bezel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8e0e0" />
          <stop offset="20%" stopColor="#8ec5c5" />
          <stop offset="40%" stopColor="#c5e8e8" />
          <stop offset="60%" stopColor="#7ab8b8" />
          <stop offset="80%" stopColor="#a8d8d8" />
          <stop offset="100%" stopColor="#90c8c8" />
        </linearGradient>
        <linearGradient id="ck_bezelDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a3a3a" />
          <stop offset="20%" stopColor="#0f2828" />
          <stop offset="40%" stopColor="#1e4040" />
          <stop offset="60%" stopColor="#0c2222" />
          <stop offset="80%" stopColor="#153535" />
          <stop offset="100%" stopColor="#123030" />
        </linearGradient>

        {/* Bezel highlight — top-left shine for 3D roundness */}
        <radialGradient id="ck_bezelShine" cx="30%" cy="25%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Face — turquoise gradient with depth */}
        <radialGradient id="ck_face" cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#e8fafa" />
          <stop offset="40%" stopColor="#d4f0f0" />
          <stop offset="75%" stopColor="#b8e4e4" />
          <stop offset="100%" stopColor="#a0d8d8" />
        </radialGradient>
        <radialGradient id="ck_faceDark" cx="42%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#1a3838" />
          <stop offset="40%" stopColor="#142e2e" />
          <stop offset="75%" stopColor="#0f2424" />
          <stop offset="100%" stopColor="#0a1c1c" />
        </radialGradient>

        {/* Inner dial ring glow */}
        <radialGradient id="ck_innerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stopColor="transparent" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.12" />
        </radialGradient>

        {/* Glass dome reflection */}
        <radialGradient id="ck_glass" cx="36%" cy="28%" r="45%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="50%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Edge shadow inside bezel for inset depth */}
        <radialGradient id="ck_inset" cx="50%" cy="50%" r="50%">
          <stop offset="90%" stopColor="transparent" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.15" />
        </radialGradient>

        {/* Hand shadow filter */}
        <filter id="ck_hShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0.6" dy="0.8" stdDeviation="0.8" floodColor="#0a3030" floodOpacity="0.3" />
        </filter>

        {/* Center cap 3D gradient */}
        <radialGradient id="ck_cap" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d6e63" />
        </radialGradient>
      </defs>

      {/* ── Outer bezel ring ── */}
      <circle
        cx={center} cy={center} r={outerR}
        fill="url(#ck_bezel)"
        stroke="#6aadad"
        strokeWidth={0.8}
        className="dark:fill-[url(#ck_bezelDark)] dark:stroke-teal-800"
      />

      {/* Bezel 3D highlight */}
      <circle cx={center} cy={center} r={outerR} fill="url(#ck_bezelShine)" />

      {/* Inner bezel edge — creates depth between bezel and face */}
      <circle
        cx={center} cy={center} r={innerRingR}
        fill="none"
        stroke="#4d9e9e"
        strokeWidth={1}
        opacity={0.5}
        className="dark:stroke-teal-700"
      />

      {/* ── Clock face ── */}
      <circle
        cx={center} cy={center} r={faceRadius}
        fill="url(#ck_face)"
        className="dark:fill-[url(#ck_faceDark)]"
      />

      {/* Inset shadow on face edge */}
      <circle cx={center} cy={center} r={faceRadius} fill="url(#ck_inset)" />

      {/* Subtle inner glow ring */}
      <circle cx={center} cy={center} r={faceRadius} fill="url(#ck_innerGlow)" />

      {/* ── Tick marks ── */}
      {markers.map((m, i) => (
        <line
          key={i}
          x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2}
          stroke={m.isHour ? "#0f766e" : "#94d2d2"}
          strokeWidth={m.isHour ? 1.8 : 0.5}
          strokeLinecap="round"
          className={m.isHour ? "dark:stroke-teal-300" : "dark:stroke-teal-700"}
        />
      ))}

      {/* ── Hour numerals ── */}
      {numerals.map(({ num, x, y }) => (
        <text
          key={num}
          x={x} y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#115e59"
          fontSize={size * 0.082}
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="700"
          letterSpacing="-0.5"
          className="dark:fill-teal-200"
        >
          {num}
        </text>
      ))}

      {/* ── Hour hand ── */}
      <line
        x1={center} y1={center} x2={hourEnd.x} y2={hourEnd.y}
        stroke="#134e4a"
        strokeWidth={3.2}
        strokeLinecap="round"
        filter="url(#ck_hShadow)"
        className="dark:stroke-teal-100"
      />

      {/* ── Minute hand ── */}
      <line
        x1={center} y1={center} x2={minuteEnd.x} y2={minuteEnd.y}
        stroke="#1a5c57"
        strokeWidth={2.2}
        strokeLinecap="round"
        filter="url(#ck_hShadow)"
        className="dark:stroke-teal-200"
      />

      {/* ── Second hand with counterweight ── */}
      <line
        x1={secondStart.x} y1={secondStart.y}
        x2={secondEnd.x} y2={secondEnd.y}
        stroke="#f43f5e"
        strokeWidth={0.8}
        strokeLinecap="round"
        filter="url(#ck_hShadow)"
      />
      <circle cx={secondStart.x} cy={secondStart.y} r={2.2} fill="#f43f5e" />

      {/* ── Center cap (3D layered) ── */}
      <circle cx={center} cy={center} r={5} fill="url(#ck_cap)" />
      <circle cx={center} cy={center} r={3} fill="#0d9488" />
      <circle cx={center} cy={center} r={1.2} fill="white" opacity={0.6} />

      {/* ── Glass dome overlay ── */}
      <circle
        cx={center} cy={center} r={faceRadius}
        fill="url(#ck_glass)"
        pointerEvents="none"
      />
    </svg>
  );
}
