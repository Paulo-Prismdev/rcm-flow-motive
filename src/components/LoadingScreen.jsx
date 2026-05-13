import React from "react";
import { motion } from "framer-motion";
import { Car, AlertCircle } from "lucide-react";

export default function LoadingScreen() {
  const carVariants = {
    initial: { x: -100, opacity: 0 },
    animate: {
      x: [
        -100,
        320, // Drive across
        300, // Crash shake
        310,
        295,
        305,
        320, // Back to crash position
      ],
      opacity: 1,
      rotate: [0, 0, -15, 15, -10, 10, 0],
      transition: {
        duration: 3.5,
        ease: "linear",
        times: [0, 0.7, 0.7, 0.78, 0.85, 0.92, 1],
      },
    },
  };

  const smokeVariants = {
    initial: { opacity: 0, scale: 0 },
    explode: {
      opacity: [0, 1, 1, 0],
      scale: [0, 1.5, 1.8, 2],
      transition: { duration: 1, ease: "easeOut" },
    },
  };

  const debrisVariants = {
    initial: { opacity: 0, y: 0, x: 0 },
    scatter: (direction) => ({
      opacity: [1, 0],
      y: [0, direction.y],
      x: [0, direction.x],
      rotate: direction.rotate,
      transition: { duration: 1, ease: "easeOut" },
    }),
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
      {/* Road */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-full h-24 bg-gray-400 opacity-30 flex items-center gap-8 px-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-1 w-12 bg-yellow-300" />
          ))}
        </div>
      </div>

      {/* Animation Container */}
      <div className="relative w-full h-48 flex items-center justify-center">
        {/* Car */}
        <motion.div
          variants={carVariants}
          initial="initial"
          animate="animate"
          className="absolute"
        >
          <Car className="w-12 h-12 text-red-600" />
        </motion.div>

        {/* Wall/Obstacle */}
        <div className="absolute right-12 w-2 h-16 bg-gray-600 rounded-lg" />

        {/* Smoke Burst - triggers at crash time */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 1.8, 2] }}
          transition={{ duration: 1, delay: 2.45, ease: "easeOut" }}
          className="absolute right-8 w-16 h-16 bg-gray-400 rounded-full opacity-60"
        />

        {/* Debris */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 1, y: 0, x: 0 }}
            animate={{
              opacity: [1, 0],
              y: [0, Math.random() * -150 - 30],
              x: [0, (Math.random() - 0.5) * 200],
              rotate: Math.random() * 360,
            }}
            transition={{ duration: 1, delay: 2.45, ease: "easeOut" }}
            className="absolute right-12"
          >
            <div className="w-2 h-2 bg-orange-500 rounded" />
          </motion.div>
        ))}
      </div>

      {/* Loading Dots */}
      <motion.div className="mt-12 flex gap-1">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 bg-gray-600 dark:bg-gray-300 rounded-full"
        />
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 bg-gray-600 dark:bg-gray-300 rounded-full"
        />
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 bg-gray-600 dark:bg-gray-300 rounded-full"
        />
      </motion.div>
    </div>
  );
}