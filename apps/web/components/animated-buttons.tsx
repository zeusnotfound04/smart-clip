'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'glow' | 'magnetic' | 'liquid';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function AnimatedButton({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = "",
  disabled = false 
}: AnimatedButtonProps) {
  const variants = {
    primary: {
      base: "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0",
      hover: "from-purple-700 to-pink-700",
      animation: {
        whileHover: { scale: 1.05, boxShadow: "0 20px 40px rgba(139, 92, 246, 0.4)" },
        whileTap: { scale: 0.95 },
      }
    },
    secondary: {
      base: "border-2 border-purple-500/30 text-purple-300 bg-transparent",
      hover: "bg-purple-500/10 border-purple-400/50",
      animation: {
        whileHover: { scale: 1.02, borderColor: "rgba(139, 92, 246, 0.8)" },
        whileTap: { scale: 0.98 },
      }
    },
    glow: {
      base: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0",
      hover: "from-cyan-400 to-blue-400",
      animation: {
        whileHover: { 
          scale: 1.05,
          boxShadow: [
            "0 0 20px rgba(6, 182, 212, 0.5)",
            "0 0 40px rgba(6, 182, 212, 0.8)",
            "0 0 20px rgba(6, 182, 212, 0.5)",
          ]
        },
        whileTap: { scale: 0.95 },
      }
    },
    magnetic: {
      base: "bg-gradient-to-r from-green-500 to-teal-500 text-white border-0",
      hover: "from-green-400 to-teal-400",
      animation: {
        whileHover: { 
          scale: 1.1,
          rotate: [0, -2, 2, 0],
          transition: { duration: 0.3 }
        },
        whileTap: { scale: 0.9, rotate: 0 },
      }
    },
    liquid: {
      base: "bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white border-0 overflow-hidden relative",
      hover: "from-purple-500 via-pink-500 to-blue-500",
      animation: {
        whileHover: { 
          scale: 1.05,
          backgroundPosition: ["0% 50%", "100% 50%"],
          transition: { backgroundPosition: { duration: 0.8, repeat: Infinity } }
        },
        whileTap: { scale: 0.95 },
      }
    }
  };

  const currentVariant = variants[variant];

  return (
    <motion.button
      className={`
        px-8 py-4 rounded-xl font-semibold text-lg
        backdrop-blur-sm transition-all duration-300
        ${currentVariant.base}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
      {...currentVariant.animation}
      style={variant === 'liquid' ? { backgroundSize: "200% 200%" } : {}}
    >
      <motion.span
        animate={variant === 'glow' ? {
          textShadow: [
            "0 0 0 transparent",
            "0 0 10px rgba(255, 255, 255, 0.8)",
            "0 0 0 transparent",
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {children}
      </motion.span>
      
      {/* Liquid effect overlay */}
      {variant === 'liquid' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 1,
          }}
        />
      )}
    </motion.button>
  );
}

interface PulseButtonProps {
  children: ReactNode;
  pulseColor?: string;
  onClick?: () => void;
  className?: string;
}

export function PulseButton({ 
  children, 
  pulseColor = "rgb(139, 92, 246)", 
  onClick, 
  className = "" 
}: PulseButtonProps) {
  return (
    <motion.button
      className={`relative px-8 py-4 rounded-full bg-white/10 backdrop-blur-sm text-white font-semibold ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
      
      {/* Pulse rings */}
      {[...Array(3)].map((_, index) => (
        <motion.div
          key={index}
          className="absolute inset-0 rounded-full border-2 opacity-70"
          style={{ borderColor: pulseColor }}
          animate={{
            scale: [1, 2, 3],
            opacity: [0.7, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 0.4,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.button>
  );
}

interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function FloatingActionButton({ 
  icon, 
  onClick, 
  className = "" 
}: FloatingActionButtonProps) {
  return (
    <motion.button
      className={`
        w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 
        text-white shadow-2xl shadow-purple-500/25 flex items-center justify-center
        ${className}
      `}
      onClick={onClick}
      animate={{
        y: [0, -10, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{
        scale: 1.1,
        boxShadow: "0 25px 50px rgba(139, 92, 246, 0.5)",
      }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={{
          rotate: [0, -180, -360],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {icon}
      </motion.div>
    </motion.button>
  );
}