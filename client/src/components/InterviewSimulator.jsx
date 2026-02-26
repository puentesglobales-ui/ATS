import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, User, Cpu, Award, ArrowRight, Loader2, MessageCircle } from 'lucide-react';
import api from '../services/api';
import AudioRecorder from './AudioRecorder';

const InterviewSimulator = ({ session }) => {
    // Session & Profile State
    const [started, setStarted] = useState(false);
    const [mode, setMode] = useState('ALLY');
    const [profileData, setProfileData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Chat State
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [chatProcessing, setChatProcessing] = useState(false);

    // Audio State
    const [isListening, setIsListening] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Analysis State
    const [cvText, setCvText] = useState('');
    const [jobDesc, setJobDesc] = useState('');
    const [currentFeedback, setCurrentFeedback] = useState(null);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (session?.user) {
            fetchProfile();
        }
    }, [session]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get(`/profile/${session.user.id}`);
            setProfileData(data);
            if (data.cv_text) setCvText(data.cv_text);
        } catch (e) {
            console.error("Error fetching profile:", e);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleStart = async () => {
        if (!cvText.trim() || !jobDesc.trim()) {
            alert("Por favor completa tu CV y la descripción de la vacante.");
            return;
        }
        setStarted(true);
        setChatProcessing(true);
        try {
            const { data } = await api.post('/interview/start', {
                cvText,
                jobDescription: jobDesc,
                mode,
                userId: session?.user?.id,
                language: 'es'
            });
            setMessages([{ role: 'assistant', content: data.message }]);
            if (data.feedback) setCurrentFeedback(data.feedback);
        } catch (e) {
            console.error(e);
            alert("Error al iniciar la simulación.");
        } finally {
            setChatProcessing(false);
        }
    };

    const handleSendMessage = async (text) => {
        if (!text || !text.trim()) return;
        const newHistory = [...messages, { role: 'user', content: text }];
        setMessages(newHistory);
        setInputText('');
        setChatProcessing(true);

        try {
            const { data } = await api.post('/interview/chat', {
                messages: newHistory,
                cvText,
                jobDescription: jobDesc,
                mode,
                userId: session?.user?.id,
                language: 'es'
            });

            const aiMsg = { role: 'assistant', content: data.message };
            setMessages([...newHistory, aiMsg]);

            if (data.feedback) setCurrentFeedback(data.feedback);
        } catch (e) {
            console.error(e);
            alert("Error: No pude conectar con Alex.");
        } finally {
            setChatProcessing(false);
        }
    };

    const handleAudioUpload = async (audioBlob) => {
        setIsListening(false);
        setProcessing(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, 'input.webm');
        formData.append('cvText', cvText);
        formData.append('jobDescription', jobDesc);
        formData.append('messages', JSON.stringify(messages));
        formData.append('mode', mode);
        formData.append('userId', session?.user?.id || '');
        formData.append('language', 'es');

        try {
            const { data } = await api.post('/interview/speak', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newMsgs = [
                ...messages,
                { role: 'user', content: data.userText },
                { role: 'assistant', content: data.assistantText }
            ];
            setMessages(newMsgs);

            if (data.feedback) setCurrentFeedback(data.feedback);

            // Play audio: Server TTS or Browser SpeechSynthesis fallback
            setIsSpeaking(true);
            if (data.audioBase64) {
                const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
                audio.onended = () => setIsSpeaking(false);
                audio.onerror = () => {
                    // Fallback to browser speech if audio fails
                    speakWithBrowser(data.assistantText);
                };
                audio.play().catch(() => speakWithBrowser(data.assistantText));
            } else {
                // No audio from server — use browser speech
                speakWithBrowser(data.assistantText);
            }

        } catch (error) {
            console.error("Error processing audio:", error);
            alert("Error procesando audio. Verificá que el servidor esté online y que tengas una OPENAI_API_KEY válida para Whisper.");
        } finally {
            setProcessing(false);
        }
    };

    // Browser SpeechSynthesis fallback for TTS
    const speakWithBrowser = (text) => {
        if (!text || !window.speechSynthesis) {
            setIsSpeaking(false);
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        // Try to find a good Spanish voice
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang.startsWith('es') && v.name.includes('Google'))
            || voices.find(v => v.lang.startsWith('es'));
        if (spanishVoice) utterance.voice = spanishVoice;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    if (loadingProfile) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500">
                <Loader2 className="animate-spin mr-2" /> Cargando simulador...
            </div>
        );
    }

    // Agradecimiento: Llave Maestra no es bloqueada por ATS
    const isMasterKey = session?.user?.email === 'visasytrabajos@gmail.com';
    const isBlocked = !isMasterKey && profileData?.ats_status === 'RECHAZADO';

    return (
        <div className="min-h-screen bg-black text-white p-4 font-sans flex flex-col md:flex-row gap-4 overflow-hidden">
            {isBlocked ? (
                <div className="w-full flex items-center justify-center">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-900/20 border border-red-500/50 p-12 rounded-[3rem] text-center max-w-2xl backdrop-blur-xl">
                        <Award size={64} className="text-red-500 mx-auto mb-6" />
                        <h3 className="text-red-400 font-black text-3xl mb-4 uppercase tracking-tighter">Acceso Denegado por ATS</h3>
                        <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                            Tu último análisis de CV obtuvo un score de <span className="text-red-500 font-bold">{profileData.ats_score}%</span>.
                            El sistema detecta que no cumples con el 80% mínimo requerido para pasar a entrevista técnica.
                        </p>
                        <button onClick={() => window.location.hash = '#/ats-scanner'} className="bg-red-600 hover:bg-red-500 text-white font-black py-4 px-8 rounded-2xl text-sm uppercase tracking-widest transition-all">
                            Optimizar CV para Re-entrar
                        </button>
                    </motion.div>
                </div>
            ) : !started ? (
                <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 self-center py-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 uppercase tracking-tighter">Alex Interview Simulator</h1>
                        <p className="text-slate-400 font-medium">Configura el escenario para que Alex pueda evaluarte.</p>
                        {isMasterKey && <span className="mt-4 inline-block text-[10px] bg-cyan-600 text-white px-3 py-1 rounded-full font-black uppercase">Acceso Maestro Activado 👑</span>}
                    </motion.div>

                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">Estilo de Entrevista</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'ALLY', label: 'Aliado', color: 'green', desc: 'Feedback constante y amable.' },
                                    { id: 'TECHNICAL', label: 'Técnico', color: 'blue', desc: 'Hard skills y precisión lógica.' },
                                    { id: 'STRESS', label: 'Stress', color: 'red', desc: 'Presión alta y "Bad Cop".' }
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setMode(item.id)}
                                        className={`p-4 rounded-2xl text-xs font-black transition-all border-2 ${mode === item.id ? `bg-${item.color}-600/20 border-${item.color}-500 text-white shadow-lg shadow-${item.color}-500/20` : 'bg-slate-800 border-transparent text-slate-500 hover:bg-slate-700'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Cargar Contexto (CV)</label>
                                <textarea value={cvText} onChange={e => setCvText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm h-32 text-slate-300 focus:border-cyan-600 outline-none transition-all" placeholder="Pega el texto de tu currículum..." />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Vacante Objetivo</label>
                                <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm h-32 text-slate-300 focus:border-cyan-600 outline-none transition-all" placeholder="Pega los requisitos del puesto..." />
                            </div>
                        </div>

                        <button onClick={handleStart} disabled={chatProcessing} className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-2xl font-black text-white shadow-xl shadow-cyan-900/20 transition-all flex items-center justify-center gap-2">
                            {chatProcessing ? <Loader2 className="animate-spin" /> : <Play size={20} />} Iniciar Simulación
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col md:flex-row gap-6 w-full max-w-7xl mx-auto h-full max-h-[90vh]">
                    {/* LEFT: AVATAR & FEEDBACK */}
                    <div className="w-full md:w-80 flex flex-col gap-6 h-full overflow-y-auto pr-2">
                        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center">
                            <motion.div animate={{ scale: isSpeaking ? [1, 1.1, 1] : 1 }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-32 h-32 rounded-full border-4 border-cyan-500/30 flex items-center justify-center bg-gradient-to-br from-slate-800 to-black shadow-[0_0_40px_rgba(6,182,212,0.2)] mb-4">
                                <User size={50} className="text-cyan-400" />
                            </motion.div>
                            <h3 className="text-xl font-black text-white">Alex Coach</h3>
                            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest mt-1">Live Simulation</span>
                        </div>

                        {currentFeedback && (
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900/80 border border-slate-800 rounded-[2rem] p-6 space-y-6">
                                {currentFeedback.feedback && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Contenido</span>
                                            <span className="text-xs font-bold bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-lg">{currentFeedback.feedback.score}%</span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed italic">"{currentFeedback.feedback.analysis}"</p>
                                    </div>
                                )}
                                {currentFeedback.language_feedback && (
                                    <div className="space-y-2 pt-4 border-t border-slate-800">
                                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Idioma</span>
                                        <div className="bg-cyan-500/5 p-3 rounded-xl border border-cyan-500/10 text-[11px] text-cyan-200">
                                            <strong>Correction:</strong> {currentFeedback.language_feedback.correction}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* RIGHT: CHAT BOX */}
                    <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-[3rem] overflow-hidden backdrop-blur-md">
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                            {messages.map((m, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${m.role === 'assistant' ? 'bg-cyan-600 text-white' : 'bg-purple-600 text-white'}`}>
                                        {m.role === 'assistant' ? <Cpu size={20} /> : <User size={20} />}
                                    </div>
                                    <div className={`max-w-[75%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-xl ${m.role === 'assistant' ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700' : 'bg-purple-600 text-white rounded-tr-none'}`}>
                                        {m.content}
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* INPUT */}
                        <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex items-center gap-4">
                            <AudioRecorder onRecordingComplete={handleAudioUpload} isProcessing={processing} />
                            <input
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText)}
                                placeholder="Escribe tu respuesta a Alex..."
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-cyan-600 transition-all font-medium"
                            />
                            <button
                                disabled={chatProcessing || !inputText.trim()}
                                onClick={() => handleSendMessage(inputText)}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${chatProcessing ? 'bg-slate-800 text-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                            >
                                {chatProcessing ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Icons
const Play = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>;

export default InterviewSimulator;
