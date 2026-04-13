import React, { useState } from 'react';
import RedQueen from './components/RedQueen';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <AnimatePresence mode="wait">
        {!hasStarted ? (
          <motion.div
            key="start-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] p-4 text-center"
          >
            <div className="scanline" />
            <div className="crt-overlay" />
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center gap-8"
            >
              <div className="relative">
                <Shield className="w-24 h-24 text-red-600 animate-pulse" />
                <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-display tracking-[0.2em] text-red-600 glitch-text">
                  RED QUEEN
                </h1>
                <p className="text-red-900/60 text-sm tracking-widest uppercase">
                  Henyusz Corporation // Build 1.1.0
                </p>
              </div>

              <div className="max-w-md text-red-900/40 text-[10px] leading-relaxed uppercase tracking-tighter">
                Warning: This system is property of Henyusz Corporation. 
                Unauthorized access is strictly prohibited. 
                Vocal identification required for system synchronization.
              </div>

              <div className="mt-12 flex flex-col items-center gap-6">
                <div className="w-64 h-1 bg-red-950/20 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="h-full bg-red-600 shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                  />
                </div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 4 }}
                >
                  <button
                    onClick={() => setHasStarted(true)}
                    className="px-12 py-3 border border-red-600 text-red-600 font-display text-sm tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all duration-300 relative group overflow-hidden"
                  >
                    <span className="relative z-10">ESTABLISH LINK</span>
                    <motion.div 
                      className="absolute inset-0 bg-red-600/20"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </button>
                </motion.div>

                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-[8px] text-red-500 font-mono tracking-[0.5em] uppercase"
                >
                  System Synchronization Complete
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen"
          >
            <RedQueen />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

