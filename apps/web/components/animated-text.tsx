'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TypingTextProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
}

export function TypingText({ 
  text, 
  className = "", 
  speed = 100, 
  delay = 0,
  cursor = true 
}: TypingTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentIndex < text.length) {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }
    }, delay + currentIndex * speed);

    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed, delay]);

  useEffect(() => {
    if (cursor) {
      const cursorInterval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      return () => clearInterval(cursorInterval);
    }
  }, [cursor]);

  return (
    <span className={className}>
      {displayText}
      {cursor && (
        <motion.span
          animate={{ opacity: showCursor ? 1 : 0 }}
          transition={{ duration: 0 }}
          className="inline-block w-0.5 h-1em bg-current ml-1"
        />
      )}
    </span>
  );
}

interface GlitchTextProps {
  text: string;
  className?: string;
  intensity?: number;
}

export function GlitchText({ text, className = "", intensity = 5 }: GlitchTextProps) {
  const [glitchText, setGlitchText] = useState(text);

  useEffect(() => {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const glitchInterval = setInterval(() => {
      let result = text;
      
      for (let i = 0; i < intensity; i++) {
        const randomIndex = Math.floor(Math.random() * text.length);
        const randomChar = chars[Math.floor(Math.random() * chars.length)];
        result = result.substring(0, randomIndex) + randomChar + result.substring(randomIndex + 1);
      }
      
      setGlitchText(result);
      
      setTimeout(() => {
        setGlitchText(text);
      }, 100);
    }, 2000);

    return () => clearInterval(glitchInterval);
  }, [text, intensity]);

  return (
    <motion.span 
      className={className}
      animate={{
        textShadow: [
          '0 0 0 transparent',
          '2px 2px 0 #ff0000, -2px -2px 0 #00ffff',
          '0 0 0 transparent',
        ]
      }}
      transition={{
        duration: 0.1,
        repeat: Infinity,
        repeatDelay: 2,
      }}
    >
      {glitchText}
    </motion.span>
  );
}

interface FloatingWordsProps {
  words: string[];
  className?: string;
}

export function FloatingWords({ words, className = "" }: FloatingWordsProps) {
  return (
    <div className={`relative ${className}`}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="absolute text-purple-300/20 text-6xl font-bold pointer-events-none select-none"
          initial={{
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
            opacity: 0,
            rotate: Math.random() * 360,
            scale: 0,
          }}
          animate={{
            x: [
              Math.random() * 400 - 200,
              Math.random() * 400 - 200,
              Math.random() * 400 - 200,
            ],
            y: [
              Math.random() * 400 - 200,
              Math.random() * 400 - 200,
              Math.random() * 400 - 200,
            ],
            opacity: [0, 0.3, 0],
            rotate: [0, 360, 720],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 8 + index,
            repeat: Infinity,
            delay: index * 0.5,
            ease: "easeInOut",
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}

interface CounterAnimationProps {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CounterAnimation({ 
  target, 
  duration = 2, 
  prefix = "", 
  suffix = "",
  className = ""
}: CounterAnimationProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const increment = target / (duration * 60); // 60fps
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <motion.span
      className={className}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </motion.span>
  );
}

interface WaveTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function WaveText({ text, className = "", delay = 0 }: WaveTextProps) {
  return (
    <div className={className}>
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          className="inline-block"
          animate={{
            y: [0, -20, 0],
            color: [
              '#ffffff',
              '#8B5CF6',
              '#EC4899',
              '#06B6D4',
              '#ffffff'
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: delay + index * 0.1,
            ease: "easeInOut",
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </div>
  );
}