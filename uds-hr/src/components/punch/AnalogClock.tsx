"use client";

import { useEffect, useState } from "react";

interface AnalogClockProps {
  size?: number;
}

export default function AnalogClock({ size = 100 }: AnalogClockProps) {
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
  const bezelWidth = size * 0.06;
  const faceRadius = center - bezelWidth - 2;

  // Hand lengths
  const hourLen = faceRadius * 0.5;
  const minuteLen = faceRadius * 0.68;
  const secondLen = faceRadius * 0.78;
  const secondTail = faceRadius * 0.2;

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

  // Hour markers
  const markers = Array.from({ length: 60 }, (_, i) => {
    const angle = ((i * 6 - 90) * Math.PI) / 180;
    const isHour = i % 5 === 0;
    const outerR = faceRadius - 1;
    const innerR = isHour ? faceRadius - 8 : faceRadius - 4;
    return {
      x1: center + innerR * Math.cos(angle),
      y1: center + innerR * Math.sin(angle),
      x2: center + outerR * Math.cos(angle),
      y2: center + outerR * Math.sin(angle),
      isHour,
    };
  });

  // Hour numerals (12, 3, 6, 9)
  const numerals = [
    { num: "12", angle: 0 },
    { num: "3", angle: 90 },
    { num: "6", angle: 180 },
    { num: "9", angle: 270 },
  ].map(({ num, angle }) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const r = faceRadius - 16;
    return { num, x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}
    >
      <defs>
        {/* Bezel gradient — brushed steel look */}
        <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8ecf1" />
          <stop offset="25%" stopColor="#c8cdd5" />
          <stop offset="50%" stopColor="#dfe3e8" />
          <stop offset="75%" stopColor="#b8bec8" />
          <stop offset="100%" stopColor="#d0d5dc" />
        </linearGradient>
        <linearGradient id="bezelGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3a4555" />
          <stop offset="25%" stopColor="#2a3340" />
          <stop offset="50%" stopColor="#354050" />
          <stop offset="75%" stopColor="#252e3a" />
          <stop offset="100%" stopColor="#303a48" />
        </linearGradient>

        {/* Face gradient — subtle convex effect */}
        <radialGradient id="faceGrad" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f8f9fb" />
          <stop offset="100%" stopColor="#eef0f4" />
        </radialGradient>
        <radialGradient id="faceGradDark" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#243040" />
          <stop offset="70%" stopColor="#1c2a36" />
          <stop offset="100%" stopColor="#151f2b" />
        </radialGradient>

        {/* Glass reflection */}
        <radialGradient id="glassShine" cx="38%" cy="30%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.25" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Hand shadow */}
        <filter id="handShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.6" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Outer bezel — brushed metal ring */}
      <circle
        cx={center}
        cy={center}
        r={center - 1}
        fill="url(#bezelGrad)"
        stroke="#b0b8c4"
        strokeWidth={0.5}
        className="dark:fill-[url(#bezelGradDark)] dark:stroke-slate-600"
      />

      {/* Inner bezel shadow ring */}
      <circle
        cx={center}
        cy={center}
        r={center - bezelWidth}
        fill="none"
        stroke="#9ca3af"
        strokeWidth={0.5}
        opacity={0.4}
        className="dark:stroke-slate-500"
      />

      {/* Clock face */}
      <circle
        cx={center}
        cy={center}
        r={faceRadius}
        fill="url(#faceGrad)"
        className="dark:fill-[url(#faceGradDark)]"
      />

      {/* Minute markers */}
      {markers.map((m, i) => (
        <line
          key={i}
          x1={m.x1}
          y1={m.y1}
          x2={m.x2}
          y2={m.y2}
          stroke={m.isHour ? "#4b5563" : "#d1d5db"}
          strokeWidth={m.isHour ? 1.5 : 0.5}
          strokeLinecap="round"
          className={m.isHour ? "dark:stroke-slate-300" : "dark:stroke-slate-600"}
        />
      ))}

      {/* Hour numerals */}
      {numerals.map(({ num, x, y }) => (
        <text
          key={num}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#374151"
          fontSize={size * 0.09}
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="600"
          className="dark:fill-slate-300"
        >
          {num}
        </text>
      ))}

      {/* Hour hand — tapered with shadow */}
      <line
        x1={center}
        y1={center}
        x2={hourEnd.x}
        y2={hourEnd.y}
        stroke="#1e293b"
        strokeWidth={3}
        strokeLinecap="round"
        filter="url(#handShadow)"
        className="dark:stroke-slate-100"
      />

      {/* Minute hand — tapered with shadow */}
      <line
        x1={center}
        y1={center}
        x2={minuteEnd.x}
        y2={minuteEnd.y}
        stroke="#334155"
        strokeWidth={2}
        strokeLinecap="round"
        filter="url(#handShadow)"
        className="dark:stroke-slate-200"
      />

      {/* Second hand — thin with counterweight tail */}
      <line
        x1={secondStart.x}
        y1={secondStart.y}
        x2={secondEnd.x}
        y2={secondEnd.y}
        stroke="#137fec"
        strokeWidth={0.8}
        strokeLinecap="round"
        filter="url(#handShadow)"
      />

      {/* Second hand counterweight circle */}
      <circle
        cx={secondStart.x}
        cy={secondStart.y}
        r={2}
        fill="#137fec"
      />

      {/* Center cap — layered for 3D look */}
      <circle cx={center} cy={center} r={4} fill="#1e293b" className="dark:fill-slate-200" />
      <circle cx={center} cy={center} r={2.5} fill="#137fec" />
      <circle cx={center} cy={center} r={1} fill="white" opacity={0.5} />

      {/* Glass reflection overlay */}
      <circle
        cx={center}
        cy={center}
        r={faceRadius}
        fill="url(#glassShine)"
        pointerEvents="none"
      />
    </svg>
  );
}
