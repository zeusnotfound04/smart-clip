'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const morphingShapes = [
  "M50,10 L90,90 L10,90 Z", // Triangle
  "M50,10 A40,40 0 1,1 50,90 A40,40 0 1,1 50,10", // Circle
  "M10,10 L90,10 L90,90 L10,90 Z", // Square
  "M50,10 L75,25 L90,50 L75,75 L50,90 L25,75 L10,50 L25,25 Z", // Octagon
  "M50,10 L70,30 L90,30 L75,50 L85,75 L50,65 L15,75 L25,50 L10,30 L30,30 Z" // Star
];

const colors = [
  "rgba(139, 92, 246, 0.3)", // Purple
  "rgba(236, 72, 153, 0.3)", // Pink
  "rgba(6, 182, 212, 0.3)",  // Cyan
  "rgba(16, 185, 129, 0.3)", // Green
  "rgba(245, 158, 11, 0.3)"  // Amber
];

interface FloatingShapeProps {
  index: number;
  delay: number;
}

function FloatingShape({ index, delay }: FloatingShapeProps) {
  const [currentShape, setCurrentShape] = useState(0);
  const [currentColor, setCurrentColor] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentShape(prev => (prev + 1) % morphingShapes.length);
      setCurrentColor(prev => (prev + 1) % colors.length);
    }, 4000 + index * 500);

    return () => clearInterval(interval);
  }, [index]);

  return (
    <motion.div
      className="absolute"
      initial={{
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
      }}
      animate={{
        x: [
          Math.random() * window.innerWidth,
          Math.random() * window.innerWidth,
          Math.random() * window.innerWidth,
        ],
        y: [
          Math.random() * window.innerHeight,
          Math.random() * window.innerHeight,
          Math.random() * window.innerHeight,
        ],
        rotate: [0, 180, 360],
        scale: [0.5, 1.5, 0.5],
      }}
      transition={{
        duration: 15 + index * 2,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
      }}
    >
      <motion.svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        className="drop-shadow-2xl"
      >
        <motion.path
          d={morphingShapes[currentShape]}
          fill={colors[currentColor]}
          stroke={colors[currentColor].replace('0.3', '0.8')}
          strokeWidth="2"
          animate={{
            d: morphingShapes[currentShape],
            fill: colors[currentColor],
            stroke: colors[currentColor].replace('0.3', '0.8'),
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
          }}
        />
        
        {/* Pulsing glow effect */}
        <motion.path
          d={morphingShapes[currentShape]}
          fill="none"
          stroke={colors[currentColor].replace('0.3', '0.6')}
          strokeWidth="4"
          animate={{
            d: morphingShapes[currentShape],
            stroke: colors[currentColor].replace('0.3', '0.6'),
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.svg>
    </motion.div>
  );
}

export default function MorphingShapes() {
  const shapeCount = 8;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {[...Array(shapeCount)].map((_, index) => (
        <FloatingShape
          key={index}
          index={index}
          delay={index * 0.5}
        />
      ))}
    </div>
  );
}