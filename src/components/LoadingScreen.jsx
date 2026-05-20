import React from "react";
import { motion } from "framer-motion";
import { Car, RefreshCw } from "lucide-react";

export default function LoadingScreen() {
  const carVariants = {
    initial: { x: "-55vw", opacity: 1 },
    animate: {
      x: "55vw",
      opacity: 1,
      transition: {
        duration: 3,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.5,
      },
    },
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Logo */}
      <div className="absolute top-12 flex flex-col items-center" style={{ zIndex: 20 }}>
        <img
          src="https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg"
          alt="RCM Automotive"
          className="h-20 w-auto object-contain"
        />
      </div>

      {/* Road */}
      <div className="absolute left-0 right-0" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <div className="h-24 bg-gray-500 opacity-40 relative" style={{ width: '100vw' }}>
          {/* Dashed centre line using CSS repeating-linear-gradient */}
          <div className="absolute inset-0 flex items-center" style={{
            backgroundImage: 'repeating-linear-gradient(to right, #fde047 0px, #fde047 48px, transparent 48px, transparent 96px)',
            backgroundSize: '96px 4px',
            backgroundPosition: '0 50%',
            backgroundRepeat: 'repeat-x',
          }} />
        </div>
      </div>

      {/* Animation Container */}
      <div className="relative w-full h-48 flex items-center justify-center" style={{ zIndex: 10 }}>
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

      {/* Refresh Button */}
      <button
        onClick={() => window.location.reload()}
        className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </button>
    </div>
  );
}