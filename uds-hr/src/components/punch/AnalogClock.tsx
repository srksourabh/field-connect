"use client";

import { useEffect, useState } from "react";

interface AnalogClockProps {
  size?: number;
}

export default function AnalogClock({ size = 80 }: AnalogClockProps) {
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
  const radius = size / 2 - 2;

  // Hand lengths relative to radius
  const hourLen = radius * 0.5;
  const minuteLen = radius * 0.7;
  const secondLen = radius * 0.8;

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

  // Hour markers
  const markers = Array.from({ length: 12 }, (_, i) => {
    const angle = ((i * 30 - 90) * Math.PI) / 180;
    const outerR = radius - 1;
    const innerR = i % 3 === 0 ? radius - 6 : radius - 4;
    return {
      x1: center + innerR * Math.cos(angle),
      y1: center + innerR * Math.sin(angle),
      x2: center + outerR * Math.cos(angle),
      y2: center + outerR * Math.sin(angle),
      bold: i % 3 === 0,
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="drop-shadow-sm"
    >
      {/* Face */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="white"
        stroke="#e2e8f0"
        strokeWidth={1.5}
        className="dark:fill-[#1c2a36] dark:stroke-slate-600"
      />

      {/* Hour markers */}
      {markers.map((m, i) => (
        <line
          key={i}
          x1={m.x1}
          y1={m.y1}
          x2={m.x2}
          y2={m.y2}
          stroke={m.bold ? "#64748b" : "#cbd5e1"}
          strokeWidth={m.bold ? 1.5 : 0.8}
          className={m.bold ? "dark:stroke-slate-400" : "dark:stroke-slate-600"}
        />
      ))}

      {/* Hour hand */}
      <line
        x1={center}
        y1={center}
        x2={hourEnd.x}
        y2={hourEnd.y}
        stroke="#334155"
        strokeWidth={2.5}
        strokeLinecap="round"
        className="dark:stroke-slate-200"
      />

      {/* Minute hand */}
      <line
        x1={center}
        y1={center}
        x2={minuteEnd.x}
        y2={minuteEnd.y}
        stroke="#475569"
        strokeWidth={1.8}
        strokeLinecap="round"
        className="dark:stroke-slate-300"
      />

      {/* Second hand */}
      <line
        x1={center}
        y1={center}
        x2={secondEnd.x}
        y2={secondEnd.y}
        stroke="#137fec"
        strokeWidth={0.8}
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={center} cy={center} r={2.5} fill="#137fec" />
    </svg>
  );
}
