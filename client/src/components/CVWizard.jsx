import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Briefcase, Sparkles, ArrowRight, ArrowLeft,
    CheckCircle, List, Send, Info, ShieldCheck, MapPin,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CVWizard = ({ session }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        destination: '',
        company: '',
        jobDescription: '',
        country: 'Global',
        currentRole: '',
        yearsExp: '',
        englishLevel: 'B2',
        rawExperience: '',
        accomplishments: '',
        selectedSkills: []
    });

    const [analysis, setAnalysis] = useState({
        jd: null,
        gap: null,
        extraction: null
    });

    const updateData = (key, value) => setData(prev => ({ ...prev, [key]: value }));

    const nextStep = async () => {
        if (step === 1 && data.jobDescription) {
            setLoading(true);
            try {
                const res = await api.post('/cv-wizard/1', {
                    jobDescription: data.jobDescription,
                    userId: session?.user?.id
                });
                setAnalysis(prev => ({ ...prev, jd: res.data }));
                setStep(2);
            } catch (err) { alert("Error analizando la vacante"); }
            finally { setLoading(false); }
        }
        else if (step === 2) {
            setLoading(true);
            try {
                const res = await api.post('/cv-wizard/2', {
                    currentProfile: { role: data.currentRole, years: data.yearsExp, english: data.englishLevel },
                    jdAnalysis: analysis.jd,
                    userId: session?.user?.id
                });
                setAnalysis(prev => ({ ...prev, gap: res.data }));
                setStep(3);
            } catch (err) { alert("Error calculando el match"); }
            finally { setLoading(false); }
        }
        else if (step === 3) setStep(4);
        else if (step === 4) setStep(5);
        else if (step === 5) {
            setLoading(true);
            try {
                // First call step 4 to build impacts
                const resImpact = await api.post('/cv-wizard/4', {
                    structuredExperience: data.rawExperience,
                    accomplishments: data.accomplishments,
                    userId: session?.user?.id
                });

                // Then call step 5 for final generation
                const resFinal = await api.post('/cv-wizard/5', {
                    fullData: {
                        ...data,
                        impactExperiences: resImpact.data.impactExperiences,
                        jdAnalysis: analysis.jd
                    },
                    userId: session?.user?.id
                });

                // Final redirect to editor with full data
                navigate('/cv-builder', { state: { ...data, ...analysis, finalAnalysis: resFinal.data } });
            } catch (err) {
                console.error(err);
                alert("Error finalizando el CV");
            }
            finally { setLoading(false); }
        }
        else {
            setStep(s => s + 1);
        }
    };

    const prevStep = () => setStep(s => s - 1);

    const steps = [
        { id: 1, title: "El Objetivo", icon: <Target className="text-cyan-400" /> },
        { id: 2, title: "Tu Perfil", icon: <Briefcase className="text-purple-400" /> },
        { id: 3, title: "Tu Historia", icon: <List className="text-emerald-400" /> },
        { id: 4, title: "Tus Logros", icon: <Sparkles className="text-yellow-400" /> },
        { id: 5, title: "Finalizar", icon: <Send className="text-blue-400" /> }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-6 font-sans">
            {/* PROGRESS BAR */}
            <div className="w-full max-w-4xl flex justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                {steps.map(s => (
                    <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${step >= s.id ? 'bg-cyan-600 border-cyan-400 shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                            {step > s.id ? <CheckCircle size={20} /> : s.icon}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s.id ? 'text-cyan-400' : 'text-slate-600'}`}>{s.title}</span>
                    </div>
                ))}
            </div>

            <div className="w-full max-w-3xl">
                <AnimatePresence mode="wait">
                    {/* STEP 1: JOB DESCRIPTION */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-black tracking-tighter">Define tu <span className="text-cyan-400">Meta Profesional</span></h1>
                                <p className="text-slate-400 font-medium">Para optimizar tu CV, necesitamos entender exactamente qué tipo de vacante estás buscando.</p>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6 backdrop-blur-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">Job Title</label>
                                        <input className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl focus:border-cyan-500 transition-all outline-none" placeholder="Ex: Full Stack Developer" value={data.destination} onChange={e => updateData('destination', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">País del Mercado</label>
                                        <select className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl focus:border-cyan-500 outline-none" value={data.country} onChange={e => updateData('country', e.target.value)}>
                                            <option>USA</option>
                                            <option>España</option>
                                            <option>Alemania</option>
                                            <option>UK</option>
                                            <option>Global</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">Job Description (JD)</label>
                                    <textarea className="w-full h-48 bg-slate-950 border border-slate-800 p-4 rounded-2xl focus:border-cyan-500 transition-all outline-none resize-none" placeholder="Pega los requisitos de la vacante..." value={data.jobDescription} onChange={e => updateData('jobDescription', e.target.value)} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: CURRENT STATUS & GAP */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-black tracking-tighter">Analizando el <span className="text-purple-400">Match</span></h1>
                                <p className="text-slate-400 font-medium">Comparamos tu perfil actual con los requisitos para detectar brechas críticas.</p>
                            </div>

                            {analysis.jd && (
                                <div className="bg-cyan-600/10 border border-cyan-400/20 p-6 rounded-3xl flex gap-4 items-center">
                                    <Info className="text-cyan-400 shrink-0" />
                                    <p className="text-xs text-cyan-100 italic">
                                        IA detectó: <span className="font-bold text-white uppercase">{analysis.jd.seniorityLevel}</span> para un puesto de <span className="font-bold text-white">{analysis.jd.detectedRole}</span>.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rol Actual</label>
                                        <input className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none focus:border-purple-500" value={data.currentRole} onChange={e => updateData('currentRole', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Años de Exp.</label>
                                        <input type="number" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl outline-none focus:border-purple-500" value={data.yearsExp} onChange={e => updateData('yearsExp', e.target.value)} />
                                    </div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex flex-col justify-center gap-4">
                                    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inglés</span>
                                        <div className="flex gap-2">
                                            {['B1', 'B2', 'C1'].map(l => (
                                                <button key={l} onClick={() => updateData('englishLevel', l)} className={`px-2 py-1 rounded text-[10px] font-bold ${data.englishLevel === l ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{l}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: RAW EXPERIENCE */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-black tracking-tighter">Tu <span className="text-emerald-400">Trayectoria Relevante</span></h1>
                                <p className="text-slate-400 font-medium">Describe tu experiencia de forma narrativa. Menciona tus responsabilidades clave y el contexto de tu trabajo.</p>
                            </div>

                            {analysis.gap && (
                                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
                                    <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                                        <ShieldCheck size={14} /> Tu Superpoder Detectado:
                                    </div>
                                    <p className="text-sm font-medium text-slate-200">{analysis.gap.superpower}</p>
                                </div>
                            )}

                            <textarea
                                className="w-full h-80 bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] focus:border-emerald-500 outline-none text-slate-300 font-medium leading-relaxed shadow-inner"
                                placeholder="Ej: Empecé en una startup haciendo de todo. A los 6 meses me pasaron a liderar el equipo de frontend..."
                                value={data.rawExperience}
                                onChange={e => updateData('rawExperience', e.target.value)}
                            />
                        </motion.div>
                    )}

                    {/* STEP 4: IMPACT (LOGROS) */}
                    {step === 4 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-black tracking-tighter">Logros e <span className="text-yellow-400">Impacto Cuantificable</span></h1>
                                <p className="text-slate-400 font-medium">Este es el corazón de un CV de alto rendimiento. Enfócate en resultados, no solo en tareas.</p>
                            </div>

                            <div className="grid gap-4">
                                <div className="p-6 bg-blue-900/10 border border-blue-400/20 rounded-3xl flex gap-4">
                                    <AlertCircle className="text-blue-400 shrink-0" />
                                    <p className="text-xs text-blue-200 leading-relaxed">
                                        <span className="font-bold underline">Tip de Experto:</span> No pongas "Responsable de ventas". Pon "Aumenté las ventas un 20% en 3 meses automatizando el CRM".
                                    </p>
                                </div>

                                <textarea
                                    className="w-full h-64 bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] focus:border-yellow-500 outline-none text-slate-300 font-medium"
                                    placeholder="¿Redujiste costos? ¿Automatizaste procesos? ¿Lideraste a alguien?"
                                    value={data.accomplishments}
                                    onChange={e => updateData('accomplishments', e.target.value)}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5: FINAL PREVIEW */}
                    {step === 5 && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-8 py-12">
                            <div className="w-24 h-24 bg-cyan-600/10 rounded-full flex items-center justify-center text-cyan-400 animate-pulse">
                                <Sparkles size={48} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black">El Constructor está <span className="text-cyan-400">Listo</span></h2>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    Hemos construido conciencia y estrategia. Ahora el algoritmo ensamblará tu versión de alto rendimiento.
                                </p>
                            </div>

                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                                Pipeline: Extraction → Gap Analysis → Impact Builder → ATS Review
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* NAVIGATION BUTTONS */}
                <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-900">
                    {step > 1 ? (
                        <button onClick={prevStep} className="flex items-center gap-2 px-6 py-3 font-black uppercase text-xs tracking-widest text-slate-500 hover:text-white transition-all">
                            <ArrowLeft size={16} /> Volver
                        </button>
                    ) : <div />}

                    <button
                        onClick={nextStep}
                        disabled={loading}
                        className="px-10 py-5 bg-white text-slate-950 font-black rounded-2xl flex items-center gap-3 hover:scale-[1.05] transition-all shadow-xl shadow-cyan-600/10 disabled:opacity-50"
                    >
                        {loading ? <Loader className="animate-spin" /> : <span>{step === 5 ? 'Generar Perfil Pro' : 'Continuar'}</span>}
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const Loader = ({ className }) => <div className={`w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full ${className}`}></div>;

export default CVWizard;
