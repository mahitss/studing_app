import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  duration: number;
  delay: number;
}

const COLORS = ["#3e63dd", "#8e4ec6", "#30a46c", "#f59e0b", "#e5484d", "#ffffff"];

export default function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // random start horizontal %
      y: -10 - Math.random() * 20, // start above the screen
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
      duration: Math.random() * 2 + 2,
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "0%",
            transform: `rotate(${p.rotation}deg)`,
          }}
          animate={{
            y: ["0px", `${window.innerHeight + 100}px`],
            x: [`0px`, `${(Math.random() - 0.5) * 200}px`],
            rotate: [p.rotation, p.rotation + 360 + Math.random() * 360],
          }}
          transition={{
            duration: p.duration,
            ease: "easeOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
