import React from "react";
import { motion } from "framer-motion";
import { Car, AlertCircle } from "lucide-react";

export default function LoadingScreen() {
  const carVariants = {
    initial: { x: -100, opacity: 0 },
    drive: {
      x: 320,
      opacity: 1,
      transition: { duration: 2.5, ease: "linear" },
    },
    crash: {
      x: 320,
      rotate: [0, -15, 15, -10, 10, 0],
      transition: { duration: 0.6, ease: "easeInOut" },
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
          animate={["drive", "crash"]}
          className="absolute"
        >
          <Car className="w-12 h-12 text-red-600" />
        </motion.div>

        {/* Wall/Obstacle */}
        <div className="absolute right-12 w-2 h-16 bg-gray-600 rounded-lg" />

        {/* Smoke Burst */}
        <motion.div
          variants={smokeVariants}
          initial="initial"
          animate="explode"
          className="absolute right-8 w-16 h-16 bg-gray-400 rounded-full opacity-60"
        />

        {/* Debris */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            variants={debrisVariants}
            initial="initial"
            animate="scatter"
            custom={{
              y: Math.random() * -150 - 30,
              x: (Math.random() - 0.5) * 200,
              rotate: Math.random() * 360,
            }}
            className="absolute right-12"
          >
            <div className="w-2 h-2 bg-orange-500 rounded" />
          </motion.div>
        ))}

        {/* Alert Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.7, duration: 0.4 }}
          className="absolute right-8"
        >
          <AlertCircle className="w-8 h-8 text-yellow-500" />
        </motion.div>
      </div>

      {/* Loading Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          Loading...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Buckle up! 🚗💥
        </p>
      </motion.div>
    </div>
  );
}