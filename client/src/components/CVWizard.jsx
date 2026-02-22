import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Briefcase, Sparkles, ArrowRight, ArrowLeft,
    CheckCircle, List, Send, User, MapPin,
    GraduationCap, Cpu, MessageCircle, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CVWizard = ({ session }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [data, setData] = useState({
        name: '',
        location: '',
        destination: '',
        jobDescription: '',
        currentRole: '',
        yearsExp: '',
        rawExperience: '',
        accomplishments: '',
        education: '',
        skills: ''
    });

    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Initial Greeting
        const welcome = {
            role: 'assistant',
            content: "¡Hola! Soy Alex, tu Coach para armar un CV que rompa el mercado. Vamos a construir tu perfil paso a paso. Cuéntame, ¿cuál es tu nombre completo y dónde vives?"
        };
        setMessages([welcome]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleNext = async (input) => {
        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            if (step === 1) {
                // Parse Name and Location (Simple split for now or just store)
                const parts = input.split(',');
                setData(prev => ({
                    ...prev,
                    name: parts[0]?.trim() || input,
                    location: parts[1]?.trim() || 'Remoto/Global'
                }));
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `¡Encantado! Ahora, dime: ¿cuál es tu objetivo profesional? ¿Qué puesto buscas? Si tienes el link o texto de una vacante específica, pégalo aquí también para que enfoquemos todo el CV a ganar ese puesto.`
                    }]);
                    setStep(2);
                    setLoading(false);
                }, 800);
            }
            else if (step === 2) {
                // Use input as both job description and intended role for matching
                setData(prev => ({ ...prev, jobDescription: input, destination: input.slice(0, 50) }));
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `Entendido. Vamos con tu Perfil Profesional. No me des una lista aburrida. Cuéntame en tus palabras: ¿quién eres profesionalmente y cuál es tu "superpoder" que te hace ideal para este rol?`
                    }]);
                    setStep(3);
                    setLoading(false);
                }, 800);
            }
            else if (step === 3) {
                setData(prev => ({ ...prev, currentRole: input.slice(0, 50), rawExperience: input }));
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `¡Excelente enfoque! Ahora hablemos de tu trayectoria. Cuéntame sobre tus últimos empleos: empresas, cargos y fechas. No te preocupes por el formato, solo dame la información cruda.`
                    }]);
                    setStep(4);
                    setLoading(false);
                }, 800);
            }
            else if (step === 4) {
                setData(prev => ({ ...prev, accomplishments: input }));
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `Casi terminamos. Necesito saber tu formación académica (universidad, cursos clave) y tus habilidades técnicas principales (Software, metodologías, etc.).`
                    }]);
                    setStep(5);
                    setLoading(false);
                }, 800);
            }
            else if (step === 5) {
                setData(prev => ({ ...prev, education: input, skills: input })); // Mapping input to both temporarily for the prompt
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `¡Listo! He recopilado toda la base estratégica. Ahora mi motor de IA va a ensamblar tu CV de alto rendimiento. ¿Damos el salto al arquitecto final?`
                    }]);
                    setStep(6);
                    setLoading(false);
                }, 800);
            }
        } catch (err) {
            console.error("Wizard Step Error:", err);
            setLoading(false);
        }
    };

    const generateFinalCV = async () => {
        setLoading(true);
        try {
            // Re-map to the structure expected by CVBuilder/Backend
            const wizardPayload = {
                role: data.destination || data.currentRole,
                market: 'Global',
                jobDescription: data.jobDescription,
                personal: { name: data.name, location: data.location },
                rawExperience: data.rawExperience,
                accomplishments: data.accomplishments,
                education: data.education,
                skills: data.skills,
                userId: session?.user?.id
            };

            const res = await api.post('/generate-cv', wizardPayload);
            navigate('/cv-builder', { state: { ...wizardPayload, ...res.data } });
        } catch (err) {
            alert("Error generando el CV pro. Reintenta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center font-sans overflow-hidden">
            {/* PROGRESS HEADER */}
            <div className="w-full bg-slate-900/50 backdrop-blur-md border-b border-slate-800 p-6 flex justify-center sticky top-0 z-50">
                <div className="w-full max-w-4xl flex justify-between relative">
                    {[1, 2, 3, 4, 5, 6].map(s => (
                        <div key={s} className={`flex flex-col items-center gap-2 transition-all duration-500 ${step >= s ? 'opacity-100' : 'opacity-30'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= s ? 'bg-cyan-600 border-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                                {step > s ? <CheckCircle size={16} /> : <span className="text-xs font-bold">{s}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 w-full max-w-3xl flex flex-col p-6 space-y-6 overflow-y-auto scrollbar-hide">
                <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${m.role === 'assistant' ? 'bg-cyan-600' : 'bg-white text-slate-950'}`}>
                                {m.role === 'assistant' ? <Cpu size={20} /> : <User size={20} />}
                            </div>
                            <div className={`max-w-[80%] p-5 rounded-[2rem] text-sm leading-relaxed shadow-xl ${m.role === 'assistant' ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none' : 'bg-white text-slate-950 rounded-tr-none font-medium'}`}>
                                {m.content}
                            </div>
                        </motion.div>
                    ))}
                    {loading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-cyan-600 flex items-center justify-center animate-pulse">
                                <Cpu size={20} />
                            </div>
                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex gap-2">
                                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="w-full max-w-4xl p-6 bg-slate-950">
                {step < 6 ? (
                    <div className="relative group">
                        <textarea
                            disabled={loading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleNext(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 pr-20 text-white focus:outline-none focus:border-cyan-500 transition-all font-medium resize-none shadow-2xl"
                            placeholder="Escribe aquí tu respuesta..."
                            rows={3}
                        />
                        <button
                            disabled={loading}
                            onClick={() => {
                                const el = document.querySelector('textarea');
                                handleNext(el.value);
                                el.value = '';
                            }}
                            className="absolute right-4 bottom-4 w-12 h-12 bg-white text-slate-950 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                        >
                            <ArrowRight />
                        </button>
                    </div>
                ) : (
                    <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={generateFinalCV}
                        disabled={loading}
                        className="w-full py-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-xl uppercase tracking-widest rounded-3xl shadow-[0_0_40px_rgba(8,145,178,0.3)] flex items-center justify-center gap-4 hover:brightness-110 transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={24} />}
                        {loading ? 'Preparando Arquitectura...' : 'Generar Mi CV de Alto Rendimiento'}
                    </motion.button>
                )}
                <p className="text-center text-[10px] text-slate-600 mt-4 uppercase tracking-[0.2em] font-black">Powered by Alex Coach Engine v5.1</p>
            </div>
        </div>
    );
};

export default CVWizard;
