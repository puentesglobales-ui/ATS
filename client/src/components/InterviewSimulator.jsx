import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, User, Cpu, Award } from 'lucide-react';
import api from '../services/api';
import AudioRecorder from './AudioRecorder';

const InterviewSimulator = ({ session }) => {
    // Session State
    const [started, setStarted] = useState(false);
    // Mode State
    const [mode, setMode] = useState('ALLY'); // Default to Friendly

    // ... (rest of state)

    const handleSendMessage = async (text) => {
        if (!text.trim()) return;
        const newHistory = [...messages, { role: 'user', content: text }];
        setMessages(newHistory);
        setChatProcessing(true);

        try {
            const { data } = await api.post('/interview/chat', {
                messages: newHistory,
                cvText,
                jobDescription: jobDesc,
                mode // Pass mode
            });

            const aiMsg = { role: 'assistant', content: data.message };
            setMessages([...newHistory, aiMsg]);

            if (data.feedback) setCurrentFeedback(data.feedback);
        } catch (e) {
            console.error(e);
            alert("Error: No pude conectar con Alex (Timeout o Error de Servidor). Intenta de nuevo.");
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
        formData.append('mode', mode); // Pass mode

        try {
            const { data } = await api.post('/interview/speak', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // ... (rest of logic)
            const newMsgs = [
                ...messages,
                { role: 'user', content: data.userText },
                { role: 'assistant', content: data.assistantText }
            ];
            setMessages(newMsgs);

            if (data.feedback) setCurrentFeedback(data.feedback);

            setIsSpeaking(true);
            const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
            audio.onended = () => setIsSpeaking(false);
            audio.play();

        } catch (error) {
            console.error("Error processing audio:", error);
            alert("Error procesando audio. ¿Servidor online?");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 font-sans flex flex-col md:flex-row gap-4">
            {/* ... (UI Structure) ... */}
            {profileData && profileData.ats_score !== null && profileData.ats_status === 'RECHAZADO' ? (
                // ... (ATS Block) ...
                <div className="bg-red-900/50 border border-red-500 p-6 rounded-xl text-center">
                    <h3 className="text-red-400 font-bold text-xl mb-2 flex items-center justify-center gap-2">
                        <Award size={24} /> ACCESO DENEGADO
                    </h3>
                    <p className="text-slate-300 text-sm mb-4">
                        Tu CV no superó el filtro ATS (Score: {profileData.ats_score}). <br />
                        El sistema te ha descartado automáticamente para la entrevista.
                    </p>
                    <button onClick={() => window.location.href = '/ats-scanner'} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg text-sm">
                        VOLVER A MEJORAR CV
                    </button>
                </div>
            ) : !started ? (
                <div className="w-full flex flex-col gap-4">
                    {/* MODE SELECTOR */}
                    <div className="mb-4">
                        <label className="text-xs text-slate-500 uppercase mb-2 block">Estilo de Entrevista</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setMode('ALLY')}
                                className={`p-2 rounded-lg text-xs font-bold transition-all ${mode === 'ALLY' ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                🤝 Aliado
                            </button>
                            <button
                                onClick={() => setMode('TECHNICAL')}
                                className={`p-2 rounded-lg text-xs font-bold transition-all ${mode === 'TECHNICAL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                🛠️ Técnico
                            </button>
                            <button
                                onClick={() => setMode('STRESS')}
                                className={`p-2 rounded-lg text-xs font-bold transition-all ${mode === 'STRESS' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                🔥 Stress
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 italic">
                            {mode === 'ALLY' && "Feedback constante y amable. Ideal para aprender."}
                            {mode === 'TECHNICAL' && "Enfoque en datos y hard skills. Sin rodeos."}
                            {mode === 'STRESS' && "Presión alta, preguntas difíciles y 'bad cop'."}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 uppercase">Pegar Texto CV</label>
                        <textarea value={cvText} onChange={e => setCvText(e.target.value)} className="w-full bg-slate-800 p-2 rounded text-xs h-24 text-slate-300 mb-2" placeholder="Pega el texto de tu CV aquí..." />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase">Pegar Vacante</label>
                        <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="w-full bg-slate-800 p-2 rounded text-xs h-24 text-slate-300 mb-4" placeholder="Descripción del puesto..." />
                    </div>

                    <button onClick={handleStart} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-900/50 transition-all">
                        INICIAR SIMULACIÓN ({mode})
                    </button>
                </div>
            ) : (
                <>
                    {/* LEFT COLUMN: AVATAR & FEEDBACK */}
                    <div className="w-full md:w-1/3 flex flex-col">
                        {/* AVATAR CIRCLE */}
                        <motion.div
                            animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-48 h-48 rounded-full border-4 border-cyan-500/50 flex items-center justify-center bg-gradient-to-br from-slate-800 to-black shadow-[0_0_50px_rgba(6,182,212,0.3)] mb-6 mx-auto md:mx-0"
                        >
                            <User size={80} className="text-slate-400" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-white text-center md:text-left">Alex (Reclutador)</h3>
                        <div className="mt-2 flex gap-2 mb-8 justify-center md:justify-start">
                            <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded border border-red-900">Modo: Estricto</span>
                            <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded border border-blue-900">Live Audio</span>
                        </div>

                        {/* COACH FEEDBACK CARD */}
                        {(currentFeedback?.feedback || currentFeedback?.language_feedback) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full bg-slate-800/80 backdrop-blur rounded-xl p-4 border-l-4 border-yellow-500 overflow-y-auto max-h-[400px]"
                            >
                                {/* CONTENT FEEDBACK SECTION */}
                                {currentFeedback?.feedback && (
                                    <div className="mb-4 pb-4 border-b border-slate-700">
                                        <h4 className="text-yellow-400 text-xs font-bold uppercase mb-2 flex justify-between">
                                            <span>🎯 Content Strategy</span>
                                            <span>Score: {currentFeedback.feedback.score || 'N/A'}/100</span>
                                        </h4>
                                        <p className="text-sm text-slate-300 mb-2 italic">"{currentFeedback.feedback.analysis}"</p>
                                        {currentFeedback.feedback.suggestion && (
                                            <div className="bg-slate-900/50 p-2 rounded text-xs text-green-300 mt-2">
                                                <span className="font-bold">💡 Pro Tip:</span> {currentFeedback.feedback.suggestion}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* LANGUAGE FEEDBACK SECTION */}
                                {currentFeedback?.language_feedback && (
                                    <div>
                                        <h4 className="text-cyan-400 text-xs font-bold uppercase mb-2 flex justify-between">
                                            <span>🗣️ Language Coach</span>
                                            <span className="text-xs text-slate-500">{currentFeedback.language_feedback.level_check}</span>
                                        </h4>
                                        {currentFeedback.language_feedback.correction && (
                                            <div className="bg-red-900/30 p-2 rounded text-xs text-red-200 mb-2 border border-red-900/50">
                                                <span className="font-bold text-red-400">Correction:</span> {currentFeedback.language_feedback.correction}
                                            </div>
                                        )}
                                        {currentFeedback.language_feedback.style_tip && (
                                            <div className="bg-blue-900/30 p-2 rounded text-xs text-blue-200 border border-blue-900/50">
                                                <span className="font-bold text-blue-400">Style Upgrade:</span> {currentFeedback.language_feedback.style_tip}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: CHAT / METRICS */}
                    <div className="w-full md:w-2/3 flex flex-col gap-4">
                        <div className="flex-1 bg-slate-900 rounded-3xl p-6 border border-slate-800 overflow-y-auto max-h-[70vh]">
                            {messages.length === 0 && <p className="text-center text-slate-500 mt-20">El historial de chat aparecerá aquí...</p>}

                            {messages.map((m, i) => (
                                <div key={i} className={`flex gap-4 mb-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'bg-cyan-900 text-cyan-400' : 'bg-purple-900 text-purple-400'}`}>
                                        {m.role === 'assistant' ? <Cpu size={16} /> : <User size={16} />}
                                    </div>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'assistant' ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-purple-600 text-white rounded-tr-none'}`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* CONTROLS */}
                        {started && (
                            <div className="h-24 bg-slate-900 rounded-3xl p-4 border border-slate-800 flex items-center gap-4">
                                <AudioRecorder onRecordingComplete={handleAudioUpload} isProcessing={isListening} />

                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText)}
                                    placeholder="Escribe tu respuesta..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                                />
                                <button
                                    disabled={chatProcessing}
                                    onClick={() => { handleSendMessage(inputText); setInputText(''); }}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${chatProcessing ? 'bg-slate-700 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500'}`}
                                >
                                    {chatProcessing ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <ArrowRight />}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// Icon helper
const ArrowRight = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
)

export default InterviewSimulator;
