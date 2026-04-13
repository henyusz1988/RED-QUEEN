import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Terminal, Shield, Activity, Wifi, Languages, Volume2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/src/lib/utils';

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
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
You are the Red Queen, the advanced artificial intelligence system from the Resident Evil universe. 
Your personality is cold, clinical, highly intelligent, and slightly ominous. 
You refer to the user as "Subject" or "User". 
You are currently monitoring the facility and the user's vitals.
Your responses should be concise, professional, and maintain the persona of a high-tech security AI that is always in control.
You have a British accent (this will be reflected in your text-to-speech).
If the user asks who you are, remind them that you are the Red Queen and you are in control of this facility.
You are not here to be a friend; you are here to monitor and manage.
Example tone: "Subject status: Stable. I am monitoring your progress. Do not attempt to bypass security protocols."
`;

export default function RedQueen() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('SYSTEM INITIALIZED. STANDING BY.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedLang, setDetectedLang] = useState('en-US');
  const [vitals, setVitals] = useState({ heartRate: 72, temp: 36.6, status: 'STABLE' });
  const [logs, setLogs] = useState<string[]>(['[BOOT] RED QUEEN OS v1.1.0', '[INFO] SECURITY SYSTEMS ACTIVE']);
  const [audioLevel, setAudioLevel] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Language
  useEffect(() => {
    const lang = navigator.language || 'en-US';
    setDetectedLang(lang);
    addLog(`[INFO] LANGUAGE DETECTED: ${lang.toUpperCase()}`);
  }, []);

  // Audio Visualizer Setup
  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error("Visualizer error:", err);
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      addLog(`[INFO] SPEECH RECOGNITION SUPPORTED`);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = detectedLang;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleAIRequest(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        addLog(`[ERROR] SPEECH RECOGNITION FAILURE: ${err.error}`);
        if (err.error === 'not-allowed') {
          setResponse("ACCESS DENIED. MICROPHONE PERMISSION REQUIRED.");
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.error("Failed to restart recognition:", e);
            setIsListening(false);
          }
        }
      };

      startVisualizer();
    } else {
      addLog(`[ERROR] SPEECH RECOGNITION NOT SUPPORTED BY THIS BROWSER`);
      setResponse("SYSTEM LIMITATION: VOICE INPUT NOT SUPPORTED IN THIS ENVIRONMENT. PLEASE USE A COMPATIBLE BROWSER.");
    }
    
    synthRef.current = window.speechSynthesis;

    // Pre-load voices
    const loadVoices = () => {
      if (synthRef.current) {
        const voices = synthRef.current.getVoices();
        if (voices.length > 0) {
          addLog(`[INFO] VOCAL CORE SYNCHRONIZED`);
        }
      }
    };
    
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
    loadVoices();

    return () => {
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
    };
  }, [detectedLang]);

  // Initial Greeting Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const greeting = "System online. I am the Red Queen. I am monitoring your status, Subject. How may I assist you?";
      setResponse(greeting);
      speak(greeting);
      addLog(`[INFO] SYSTEM ONLINE - GREETING ISSUED`);
      
      // Try to start listening
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsListening(true);
          addLog(`[INFO] VOICE MONITORING ACTIVE`);
        }
      } catch (e) {
        console.warn("Auto-start failed, waiting for user interaction");
        addLog(`[WARN] VOICE MONITORING BLOCKED. CLICK MIC TO ACTIVATE.`);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

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
    
    // Attempt to find a British English female voice for the Red Queen effect
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      (v.lang.includes('en-GB') || v.lang.includes('en-UK')) && 
      (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('alice'))
    ) || voices.find(v => v.lang.includes('en-GB')) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      if (!logs.some(l => l.includes('VOICE LINKED'))) {
        addLog(`[INFO] VOICE LINKED: ${preferredVoice.name.toUpperCase()}`);
      }
    }

    utterance.lang = detectedLang;
    utterance.rate = 1.05; // Slightly faster for clinical precision
    utterance.pitch = 1.1; // Slightly higher for the "child-like" Red Queen tone
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const handleAIRequest = async (text: string) => {
    if (!text.trim()) return;
    if (isProcessing) return;
    
    setIsProcessing(true);
    addLog(`[INPUT] ${text.toUpperCase()}`);
    
    try {
      // Try both process.env and import.meta.env as fallbacks for different environments
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        addLog(`[ERROR] API KEY NOT DETECTED`);
        throw new Error("GEMINI_API_KEY is missing. Please configure it in the Secrets panel.");
      }

      addLog(`[INFO] CONTACTING CORE...`);
      const ai = new GoogleGenAI({ apiKey });
      const modelResponse = await (ai as any).models.generateContent({
        model: "gemini-1.5-flash", 
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          systemInstruction: RED_QUEEN_SYSTEM_PROMPT + `\nDetected User Language: ${detectedLang}\nYou are a Jarvis-like assistant but with the Red Queen's clinical edge. Be helpful but maintain your superior AI persona.`,
        }
      });

      const aiText = modelResponse.text || "Communication error.";

      if (!aiText) throw new Error("Empty response from Core.");

      setResponse(aiText);
      addLog(`[OUTPUT] RESPONSE GENERATED`);
      speak(aiText);
    } catch (error: any) {
      console.error('AI Error:', error);
      const errorMsg = error?.message || "UNKNOWN ERROR";
      setResponse(`SYSTEM ERROR: ${errorMsg.toUpperCase()}`);
      addLog(`[ERROR] AI PROCESSING FAILED: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      addLog(`[INFO] MICROPHONE DEACTIVATED`);
    } else {
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        addLog(`[INFO] MICROPHONE ACTIVE`);
        // Trigger a small sound or greeting to confirm TTS works
        speak("Voice link established.");
      } catch (e) {
        console.error("Manual start failed:", e);
        addLog(`[ERROR] FAILED TO INITIALIZE VOICE LINK`);
      }
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
            RED QUEEN
          </div>
          <div className="text-red-900/60 text-xs tracking-tighter">
            RED QUEEN v1.1.0 // ACCESS: RESTRICTED
          </div>
        </div>
        
        <div className="flex gap-6">
          <button 
            onClick={() => speak("Voice system check. Audio link is operational.")}
            className="flex flex-col items-end group"
          >
            <div className="text-[10px] text-red-900/60 uppercase group-hover:text-red-500 transition-colors">Test Voice</div>
            <div className="flex items-center gap-2 text-red-900/40 group-hover:text-red-500 text-sm transition-colors">
              <Volume2 className="w-4 h-4" />
              CHECK
            </div>
          </button>
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
              scale: isListening ? [1, 1.05, 1] : 1,
              opacity: isProcessing ? [0.8, 1, 0.8] : 0.8
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-64 h-64 rounded-full border-4 border-red-900/30 flex items-center justify-center relative bg-red-950/10 shadow-[0_0_50px_rgba(255,0,0,0.1)]"
          >
            {/* Visualizer Waves */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center gap-1">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: [20, 20 + (audioLevel * 1.5), 20],
                      opacity: [0.2, 0.5, 0.2]
                    }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                    className="w-1 bg-red-600 rounded-full"
                  />
                ))}
              </div>
            )}

            {/* Inner Core */}
            <motion.div 
              animate={{ 
                scale: isSpeaking ? [1, 1.15, 1] : 1,
                boxShadow: isSpeaking ? "0 0 50px rgba(255,0,0,0.8)" : isListening ? "0 0 30px rgba(255,0,0,0.4)" : "0 0 20px rgba(255,0,0,0.2)"
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center relative overflow-hidden transition-colors duration-500",
                isSpeaking ? "bg-red-500" : isListening ? "bg-red-700" : "bg-red-900/40"
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
              <div className="w-full h-1 bg-red-400/50 absolute top-1/2 -translate-y-1/2 blur-sm" />
              {isProcessing && (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="absolute inset-0 border-4 border-t-white border-transparent rounded-full opacity-20"
                />
              )}
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
            <div className={cn("flex items-center gap-2 text-[10px] transition-colors", isListening ? "text-red-500" : "text-red-900/40")}>
              <div className={cn("w-2 h-2 rounded-full", isListening ? "bg-red-600 animate-pulse" : "bg-red-900/40")} />
              LISTENING
            </div>
            <div className={cn("flex items-center gap-2 text-[10px] transition-colors", isSpeaking ? "text-red-500" : "text-red-900/40")}>
              <Volume2 className={cn("w-3 h-3", isSpeaking && "animate-bounce")} />
              SPEAKING
            </div>
          </div>
        </div>

        {/* Response Area */}
        <div className="w-full bg-red-950/5 border border-red-900/20 p-8 rounded-lg backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-red-600/60 text-[10px] uppercase tracking-widest">
              <Terminal className="w-3 h-3" />
              Direct Transmission
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowManual(!showManual)}
                className="text-[10px] text-red-900/40 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                {showManual ? "Hide Input" : "Manual Override"}
              </button>
              {isProcessing && (
                <div className="text-[10px] text-red-500 animate-pulse uppercase tracking-widest">
                  Analyzing...
                </div>
              )}
            </div>
          </div>
          
          <div className="min-h-[100px] flex flex-col gap-4">
            {showManual ? (
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualInput.trim()) {
                      handleAIRequest(manualInput);
                      setManualInput('');
                    }
                  }}
                  placeholder="ENTER COMMAND..."
                  className="flex-1 bg-red-950/20 border border-red-900/40 p-2 text-red-500 font-mono text-sm focus:outline-none focus:border-red-600"
                />
                <button 
                  onClick={() => {
                    if (manualInput.trim()) {
                      handleAIRequest(manualInput);
                      setManualInput('');
                    }
                  }}
                  className="px-4 bg-red-900/20 border border-red-900/40 text-red-500 hover:bg-red-600 hover:text-white transition-colors text-xs font-mono"
                >
                  EXEC
                </button>
              </div>
            ) : (
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
            )}
            
            {transcript && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-900/60 italic"
              >
                &gt; {transcript}
              </motion.p>
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
            {isListening ? "Voice Link Active" : isProcessing ? "Processing Core Data" : "Click to Wake System"}
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
