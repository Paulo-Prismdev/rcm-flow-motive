import React from "react";
import { motion } from "framer-motion";
import { Car, AlertCircle } from "lucide-react";

export default function LoadingScreen() {
  const carVariants = {
    initial: { x: "-60vw", opacity: 0 },
    animate: {
      x: "60vw",
      opacity: 1,
      transition: {
        duration: 3,
        ease: "easeInOut",
      },
    },
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
          <Car className="w-12 h-12" style={{ color: '#75fb4c' }} />
        </motion.div>
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