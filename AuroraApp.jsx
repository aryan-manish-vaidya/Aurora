import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Settings, Sparkles, Volume2, User, Bot, X, Send, Keyboard } from 'lucide-react';

// --- System Configuration ---
const SYSTEM_PROMPT = `
You are Aurora, a high-end, polite, and sophisticated intelligent concierge. 
Keep your answers concise (under 3 sentences) but helpful. 
Just provide the direct answer or assistance naturally.
`;

// !!! SECURITY WARNING !!!
// If you paste your API key here, do NOT share this code publicly (GitHub, etc).
// Anyone with this code can use your API quota.
const PRE_FILLED_API_KEY = "AIzaSyAC7pEEOtItCWqGgHt60mqXkbbEg5vh8Io"; // <--- PASTE YOUR KEY INSIDE THE QUOTES

export default function AuroraApp() {
  // --- State ---
  // We initialize the state with the pre-filled key if it exists
  const [apiKey, setApiKey] = useState(PRE_FILLED_API_KEY);
  const [showSettings, setShowSettings] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState(''); // Text input fallback
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Greetings. I am Aurora. Please configure my API key in settings to begin." }
  ]);
  const [error, setError] = useState('');

  // --- Refs ---
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const messagesEndRef = useRef(null);

  // --- Initialization ---
  useEffect(() => {
    // Scroll to bottom of chat
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // If the user provided a hardcoded key, we can update the initial message
    if (PRE_FILLED_API_KEY) {
      setMessages([{ role: 'assistant', text: "Greetings. I am Aurora. I am ready to assist you." }]);
    }
  }, []);

  useEffect(() => {
    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      setError("Text-to-Speech is not supported in this browser.");
    }

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleUserQuery(text);
      };

      recognition.onerror = (event) => {
        console.error("Speech Error:", event.error);
        setIsListening(false);
        if (event.error === 'network') {
          setError("Network error with Voice API. Please check connection or use text input.");
        } else if (event.error === 'not-allowed') {
          setError("Microphone access denied. Please use text input.");
        } else {
          setError(`Microphone error: ${event.error}`);
        }
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    } else {
      setError("Speech Recognition is not supported in this browser. Try Chrome.");
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [apiKey]);

  // --- Core Logic ---

  const handleUserQuery = async (userText) => {
    if (!userText.trim()) return;

    // 1. Add User Message to UI
    // We create a new history array here so we can pass it to the API immediately
    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);

    if (!apiKey) {
      const errorMsg = "Please enter a valid Gemini API Key in settings.";
      setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
      speakText(errorMsg);
      return;
    }
    
    // UI feedback that we are thinking
    setMessages(prev => [...prev, { role: 'assistant', text: "Processing...", isLoading: true }]);

    try {
      // 2. Fetch Answer from Gemini (The Brain)
      // PASS THE FULL HISTORY (newMessages), not just userText
      const aiResponseText = await fetchGeminiResponse(newMessages);
      
      // 3. Update UI with the actual answer
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, { role: 'assistant', text: aiResponseText }];
      });

      // 4. Speak just the answer
      speakText(aiResponseText);

    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, { role: 'assistant', text: "I apologize, I am unable to connect to my knowledge base right now." }];
      });
      speakText("I apologize, I encountered an error processing your request.");
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleUserQuery(inputText);
      setInputText('');
    }
  };

  const fetchGeminiResponse = async (history) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    // Transform UI messages to Gemini API format
    // 1. Map role 'assistant' -> 'model'
    // 2. Filter out any loading messages
    // 3. Ensure the FIRST message is from 'user' (API requirement)
    let apiContents = history
      .filter(msg => !msg.isLoading)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

    // If the first message is the default greeting (model), remove it
    if (apiContents.length > 0 && apiContents[0].role === 'model') {
      apiContents = apiContents.slice(1);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: apiContents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
      })
    });

    if (!response.ok) throw new Error('API Error');
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  const speakText = (text) => {
    if (!synthRef.current) return;
    
    // Cancel any current speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to find a female/elegant voice
    const voices = synthRef.current.getVoices();
    
    // Priority list for smoother voices:
    // 1. "Google US English" (Chrome - usually high quality/smooth)
    // 2. "Natural" (Edge/Windows often has "Microsoft Aria Online (Natural)")
    // 3. "Samantha" (Mac - standard high quality)
    // 4. Fallback to default
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) 
                        || voices.find(v => v.name.includes('Natural')) 
                        || voices.find(v => v.name.includes('Samantha'))
                        || voices[0];
                        
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.pitch = 1.0; 
    utterance.rate = 0.9; // 0.9 is often perceived as smoother and more "concierge-like" than 1.0
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setError(''); // Clear previous errors
      } catch (err) {
        console.error("Mic start error", err);
        setError("Could not start microphone. Try refreshing.");
      }
    }
  };

  // --- Render Helpers ---
  const renderVisualizer = () => {
    if (isSpeaking) {
      return (
        <div className="flex items-center justify-center gap-1 h-12">
           {[...Array(5)].map((_, i) => (
             <div key={i} className="w-2 bg-teal-400 rounded-full animate-pulse" 
                  style={{ height: `${Math.random() * 100}%`, animationDuration: '0.5s' }} />
           ))}
        </div>
      );
    } else if (isListening) {
      return (
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute w-full h-full bg-teal-500/20 rounded-full animate-ping"></div>
          <div className="relative w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.5)]">
            <Mic className="text-white w-8 h-8" />
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-20 h-20 rounded-full border-2 border-teal-500/30 flex items-center justify-center">
           <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col items-center relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.1),transparent_70%)] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-2xl p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <Sparkles className="text-teal-400 w-6 h-6" />
          <h1 className="text-2xl font-light tracking-widest text-white">AURORA</h1>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Interface */}
      <main className="flex-1 w-full max-w-2xl flex flex-col p-4 z-10 relative">
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto mb-8 space-y-4 pr-2 scrollbar-hide mask-image-b">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-teal-900/50 border border-teal-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-teal-400" />
                </div>
              )}
              
              <div className={`p-4 rounded-2xl max-w-[80%] backdrop-blur-sm ${
                msg.role === 'user' 
                  ? 'bg-white/10 text-white rounded-tr-none' 
                  : 'bg-slate-800/50 border border-slate-700 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>

              {msg.role === 'user' && (
                 <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                   <User className="w-4 h-4 text-slate-300" />
                 </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Interaction Area */}
        <div className="flex flex-col items-center justify-center gap-6 pb-12 w-full">
          
          {/* Status Display */}
          <div className="h-24 flex items-center justify-center w-full">
            {renderVisualizer()}
          </div>

          <div className="text-center h-6">
            <p className="text-teal-400/80 text-sm tracking-wide uppercase font-medium">
              {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready"}
            </p>
          </div>

          <div className="flex items-center gap-4 w-full max-w-sm px-4">
             {/* Text Input Fallback */}
             <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Keyboard className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a request..."
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-full py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
                {inputText.trim() && (
                  <button type="submit" className="p-3 bg-teal-600 rounded-full hover:bg-teal-500 text-white transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                )}
             </form>
             
             {/* Mic Button (Small if typing, Large if primary) */}
             <button
                onClick={toggleListening}
                className={`
                  rounded-full flex items-center justify-center transition-all duration-300 shadow-xl shrink-0
                  ${isListening 
                    ? 'w-12 h-12 bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500/30' 
                    : 'w-12 h-12 bg-teal-500 hover:bg-teal-400 text-slate-900 border-2 border-slate-900 ring-2 ring-teal-500/50'
                  }
                `}
              >
                {isListening ? <Square className="fill-current w-5 h-5" /> : <Mic className="w-6 h-6" />}
              </button>
          </div>
          
          <p className="text-slate-500 text-xs">Tap mic to speak or use keyboard</p>
        </div>

      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-white">Configuration</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Gemini API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your API key here..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Required for "Daily Questions" logic. Get one at aistudio.google.com
                </p>
              </div>
              
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Toast */}
      {error && (
        <div className="absolute bottom-4 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
          {error}
          <button onClick={() => setError('')} className="ml-4 underline opacity-80 hover:opacity-100">Dismiss</button>
        </div>
      )}

    </div>
  );
}
