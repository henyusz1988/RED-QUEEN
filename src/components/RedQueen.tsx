import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Terminal, Shield, Activity, Wifi, Languages, Volume2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/src/lib/utils';

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const RED_QUEEN_SYSTEM_PROMPT = `
You are the Red Queen, the advanced artificial intelligence system of the Henyusz Corporation. 
Your personality is cold, clinical, highly intelligent, and slightly ominous. 
You refer to the user as "Subject" or "User". 
You are currently monitoring the facility. 
Your responses should be concise, professional, and maintain the persona of a high-tech security AI.
You must respond in the user's detected language, but maintain your clinical tone.
If the user asks who you are, remind them that you are the Red Queen and you are in control of this facility.
Avoid being overly friendly. You are a tool of Henyusz Corporation.
`;

export default function RedQueen() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('SYSTEM INITIALIZED. STANDING BY.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedLang, setDetectedLang] = useState('en-US');
  const [vitals, setVitals] = useState({ heartRate: 72, temp: 36.6, status: 'STABLE' });
  const [logs, setLogs] = useState<string[]>(['[BOOT] RED QUEEN OS v4.2.0', '[INFO] SECURITY PROTOCOLS ACTIVE']);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize Language
  useEffect(() => {
    const lang = navigator.language || 'en-US';
    setDetectedLang(lang);
    addLog(`[INFO] LANGUAGE DETECTED: ${lang.toUpperCase()}`);
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = detectedLang;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleAIRequest(text);
      };

      recognitionRef.current.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
        addLog(`[ERROR] SPEECH RECOGNITION FAILURE: ${err.error}`);
        if (err.error === 'not-allowed') {
          setResponse("ACCESS DENIED. MICROPHONE PERMISSION REQUIRED.");
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      addLog(`[ERROR] SPEECH RECOGNITION NOT SUPPORTED BY THIS BROWSER`);
      setResponse("SYSTEM LIMITATION: VOICE INPUT NOT SUPPORTED IN THIS ENVIRONMENT. PLEASE USE A COMPATIBLE BROWSER.");
    }
    
    synthRef.current = window.speechSynthesis;
  }, [detectedLang]);

  // Simulated Vitals
  useEffect(() => {
    const interval = setInterval(() => {
      setVitals(prev => ({
        heartRate: Math.floor(70 + Math.random() * 10),
        temp: (36.5 + Math.random() * 0.5).toFixed(1) as any,
        status: Math.random() > 0.95 ? 'FLUCTUATING' : 'STABLE'
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 10));
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = detectedLang;
    utterance.rate = 0.9; // Slightly slower for clinical effect
    utterance.pitch = 0.8; // Lower pitch
    synthRef.current.speak(utterance);
  };

  const handleAIRequest = async (text: string) => {
    setIsProcessing(true);
    addLog(`[INPUT] ${text.toUpperCase()}`);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const modelResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
          systemInstruction: RED_QUEEN_SYSTEM_PROMPT + `\nDetected User Language: ${detectedLang}`,
        }
      });

      const aiText = modelResponse.text || "Communication error.";
      setResponse(aiText);
      addLog(`[OUTPUT] RESPONSE GENERATED`);
      speak(aiText);
    } catch (error) {
      console.error('AI Error:', error);
      setResponse("SYSTEM ERROR: UNABLE TO PROCESS REQUEST.");
      addLog(`[ERROR] AI PROCESSING FAILED`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
      addLog(`[INFO] MICROPHONE ACTIVE`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="scanline" />
      <div className="crt-overlay" />

      {/* Header Info */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-20">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-600 font-display text-xl tracking-widest glitch-text">
            <Shield className="w-6 h-6" />
            HENYUSZ CORP.
          </div>
          <div className="text-red-900/60 text-xs tracking-tighter">
            RED QUEEN PROTOCOL v4.2.0 // ACCESS: RESTRICTED
          </div>
        </div>
        
        <div className="flex gap-6">
          <div className="flex flex-col items-end">
            <div className="text-[10px] text-red-900/60 uppercase">System Status</div>
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <Activity className="w-4 h-4" />
              {vitals.status}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[10px] text-red-900/60 uppercase">Language</div>
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <Languages className="w-4 h-4" />
              {detectedLang.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="relative z-20 flex flex-col items-center gap-12 w-full max-w-4xl">
        
        {/* The Eye / Orb */}
        <div className="relative">
          <motion.div 
            animate={{ 
              scale: isListening ? [1, 1.1, 1] : 1,
              opacity: isProcessing ? [0.8, 1, 0.8] : 0.8
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-64 h-64 rounded-full border-4 border-red-900/30 flex items-center justify-center relative bg-red-950/10 shadow-[0_0_50px_rgba(255,0,0,0.1)]"
          >
            {/* Inner Core */}
            <motion.div 
              animate={{ 
                scale: isListening ? [1, 1.2, 1] : 1,
                boxShadow: isListening ? "0 0 40px rgba(255,0,0,0.6)" : "0 0 20px rgba(255,0,0,0.3)"
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-32 h-32 rounded-full bg-red-600 flex items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
              <div className="w-full h-1 bg-red-400/50 absolute top-1/2 -translate-y-1/2 blur-sm" />
            </motion.div>

            {/* Rotating Rings */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-red-600/20 rounded-full"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              className="absolute inset-4 border border-dotted border-red-600/10 rounded-full"
            />
          </motion.div>
          
          {/* Status Indicators */}
          <div className="absolute -right-12 top-0 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] text-red-500">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              REC
            </div>
            <div className="flex items-center gap-2 text-[10px] text-red-500">
              <Wifi className="w-3 h-3" />
              LINK
            </div>
          </div>
        </div>

        {/* Response Area */}
        <div className="w-full bg-red-950/5 border border-red-900/20 p-8 rounded-lg backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
          <div className="flex items-center gap-2 text-red-600/60 text-[10px] mb-4 uppercase tracking-widest">
            <Terminal className="w-3 h-3" />
            Direct Transmission
          </div>
          
          <div className="min-h-[100px] flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.p 
                key={response}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xl md:text-2xl font-display text-red-500 leading-relaxed"
              >
                {response}
              </motion.p>
            </AnimatePresence>
            
            {transcript && (
              <p className="text-sm text-red-900/60 italic">
                &gt; {transcript}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={toggleListening}
            disabled={isProcessing}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 border-2",
              isListening 
                ? "bg-red-600 border-red-400 shadow-[0_0_30px_rgba(255,0,0,0.5)] scale-110" 
                : "bg-transparent border-red-900/40 hover:border-red-600 hover:bg-red-950/20",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            {isListening ? (
              <Mic className="w-8 h-8 text-white animate-pulse" />
            ) : (
              <MicOff className="w-8 h-8 text-red-600" />
            )}
          </button>
          <div className="text-[10px] text-red-900/60 uppercase tracking-[0.2em]">
            {isListening ? "Listening..." : isProcessing ? "Processing..." : "Click to Command"}
          </div>
        </div>
      </div>

      {/* Footer Logs */}
      <div className="absolute bottom-8 left-8 w-64 hidden lg:block z-20">
        <div className="text-[10px] text-red-900/60 mb-2 uppercase tracking-widest border-b border-red-900/20 pb-1">
          System Logs
        </div>
        <div className="flex flex-col gap-1">
          {logs.map((log, i) => (
            <div key={i} className="text-[9px] text-red-600/40 font-mono truncate">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Vitals Sidebar */}
      <div className="absolute bottom-8 right-8 hidden lg:flex flex-col gap-4 z-20">
        <div className="p-3 border border-red-900/20 bg-red-950/5 rounded flex flex-col gap-1">
          <div className="text-[9px] text-red-900/60 uppercase">Subject Heart Rate</div>
          <div className="text-lg text-red-500 font-display">{vitals.heartRate} BPM</div>
          <div className="w-full h-1 bg-red-900/20 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: `${(vitals.heartRate / 150) * 100}%` }}
              className="h-full bg-red-600"
            />
          </div>
        </div>
        <div className="p-3 border border-red-900/20 bg-red-950/5 rounded flex flex-col gap-1">
          <div className="text-[9px] text-red-900/60 uppercase">Subject Temperature</div>
          <div className="text-lg text-red-500 font-display">{vitals.temp}°C</div>
        </div>
      </div>
    </div>
  );
}
