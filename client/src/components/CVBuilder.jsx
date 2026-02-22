import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Layout,
    Palette,
    Type,
    Download,
    Save,
    Search,
    Sparkles,
    User,
    Briefcase,
    GraduationCap,
    Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import CVRenderer from './CVRenderer';
import ATSFeedback from './ATSFeedback';

// --- MOCK TEMPLATES DATA ---
const TEMPLATES = [
    {
        id: 'ats-classic',
        name: 'Harvard ATS Standard',
        category: 'USA',
        description: 'Blanco y negro. Sin columnas. 100% Parsable.',
        tags: ['ats', 'clean', 'strict']
    },
    {
        id: 'modern-tech',
        name: 'Silicon Valley Blue',
        category: 'Tech',
        description: 'Acentos azules, fuente sans-serif moderna.',
        tags: ['modern', 'dev', 'startups']
    },
    {
        id: 'euro-corp',
        name: 'Berlin Professional',
        category: 'Europe',
        description: 'Estructura formal con espacio para foto.',
        tags: ['photo', 'sidebar', 'corp']
    },
    {
        id: 'creative-bold',
        name: 'Amsterdam Creative',
        category: 'Creative',
        description: 'Diseño atrevido para roles de marketing/diseño.',
        tags: ['visual', 'color', 'marketing']
    }
];

const CVBuilder = () => {
    const location = useLocation();
    const wizardData = location.state || {}; // { market, role, industry, etc. }

    const [activeTab, setActiveTab] = useState('templates'); // 'content', 'templates', 'style'
    const [selectedTemplate, setSelectedTemplate] = useState('ats-classic');
    const [searchQuery, setSearchQuery] = useState('');
    const [designTokens, setDesignTokens] = useState(null);
    const [atsData, setAtsData] = useState(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [jobDescription, setJobDescription] = useState('');

    const [cvData, setCvData] = useState(() => {
        const saved = localStorage.getItem('builder_cv_data');
        return saved ? JSON.parse(saved) : {
            personal: { name: 'Tu Nombre', email: 'email@ejemplo.com', phone: '+123456789', location: wizardData.country || 'Ciudad, País', summary: '' },
            experience: [],
            education: []
        };
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Persist changes
    useEffect(() => {
        localStorage.setItem('builder_cv_data', JSON.stringify(cvData));
        if (designTokens) localStorage.setItem('builder_design_tokens', JSON.stringify(designTokens));
        localStorage.setItem('builder_selected_template', selectedTemplate);
        localStorage.setItem('builder_active_tab', activeTab);
    }, [cvData, designTokens, selectedTemplate, activeTab]);

    // AI GENERATION ON MOUNT (Only if not already passed or persisted)
    useEffect(() => {
        const fetchGeneratedCV = async () => {
            // Priority 1: State from Wizard
            if (location.state?.data && location.state?.tokens) {
                const { data, tokens } = location.state;
                setCvData(data);
                setDesignTokens(tokens);
                setIsGenerating(false);
                setActiveTab('content');
                return;
            }

            // Priority 2: LocalStorage (Already handled by useState initializers, but sync tokens)
            const savedTokens = localStorage.getItem('builder_design_tokens');
            if (savedTokens && !designTokens) {
                setDesignTokens(JSON.parse(savedTokens));
                setActiveTab(localStorage.getItem('builder_active_tab') || 'content');
                return;
            }

            if (!wizardData.role) return;

            setIsGenerating(true);
            try {
                const response = await api.post('/generate-cv', wizardData);
                const result = response.data;

                // Merge AI data with state
                setCvData(result.data);
                setDesignTokens(result.tokens);
                setActiveTab('content');

            } catch (error) {
                console.error("AI Generation Failed:", error);
                setCvData(prev => ({
                    ...prev,
                    personal: {
                        ...prev.personal,
                        summary: "Error al generar con IA. Por favor edita manualmente."
                    },
                    experience: [{ id: 1, role: wizardData.role, company: 'Ejemplo Inc', date: '2023', description: 'No se pudo conectar con la IA.' }]
                }));
            } finally {
                setIsGenerating(false);
            }
        };

        fetchGeneratedCV();
    }, [wizardData, location.state]);

    const filteredTemplates = TEMPLATES.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.includes(searchQuery.toLowerCase()))
    );

    const addExperience = () => {
        setCvData(prev => ({
            ...prev,
            experience: [...prev.experience, { id: Date.now(), role: 'Nuevo Rol', company: 'Empresa', date: '2023', description: '' }]
        }));
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        // Ensure we are in a scale that captures well
        const element = document.getElementById('cv-document-renderer') || document.getElementById('cv-document');

        // Save current transform style to restore later
        const originalTransform = element.style.transform;
        const originalMarginTop = element.style.marginTop;
        const originalMarginBottom = element.style.marginBottom;

        // Reset transform to ensure full scale capture
        // We use inline style to override Tailwind utility classes temporarily
        element.style.transform = 'none';
        element.style.marginTop = '0'; // Remove margin for clean capture if needed
        element.style.marginBottom = '0';

        const opt = {
            margin: 0,
            filename: `CV_${cvData.personal.name.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('PDF Export Error:', err);
            alert('Error al generar PDF. Intenta nuevamente.');
        } finally {
            // Restore styles
            element.style.transform = originalTransform;
            element.style.marginTop = originalMarginTop;
            element.style.marginBottom = originalMarginBottom;
            setIsExporting(false);
        }
    };

    const handleAtsOptimize = async () => {
        if (!jobDescription.trim()) return alert("Por favor, pega la oferta de empleo (Job Description)");

        setIsOptimizing(true);
        try {
            const response = await api.post('/ats-optimize', {
                userData: { ...wizardData, rawData: cvData },
                jobDescription
            });

            const result = response.data;
            setAtsData(result);
            setCvData(result.optimized_content); // Inject optimized content

            // Notification or visual feedback
            alert("¡CV Optimizado con las palabras clave de la vacante!");
        } catch (error) {
            console.error(error);
            alert("Error al optimizar con ATS");
        } finally {
            setIsOptimizing(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-900 flex flex-col md:flex-row text-slate-100">
            {/* SIDEBAR */}
            <div className="w-full md:w-80 border-r border-slate-800 bg-slate-900 flex flex-col h-full z-20 shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-950">
                    <Sparkles className="text-cyan-400" />
                    <h1 className="font-bold text-lg">CV Architect AI</h1>
                </div>

                <div className="flex p-2 gap-1 bg-slate-950 border-b border-slate-800">
                    <button onClick={() => setActiveTab('templates')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-tighter rounded-lg transition-all ${activeTab === 'templates' ? 'bg-slate-800 text-cyan-400 shadow' : 'text-slate-500 hover:text-white'}`}>Plantillas</button>
                    <button onClick={() => setActiveTab('content')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-tighter rounded-lg transition-all ${activeTab === 'content' ? 'bg-slate-800 text-cyan-400 shadow' : 'text-slate-500 hover:text-white'}`}>Editor</button>
                    <button onClick={() => setActiveTab('ats')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-tighter rounded-lg transition-all ${activeTab === 'ats' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>ATS Match</button>
                    <button onClick={() => setActiveTab('style')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-tighter rounded-lg transition-all ${activeTab === 'style' ? 'bg-slate-800 text-cyan-400 shadow' : 'text-slate-500 hover:text-white'}`}>Estilo</button>
                </div>

                {/* CONTENT AREA OF SIDEBAR */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900">

                    {/* TEMPLATES TAB */}
                    {activeTab === 'templates' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar plantillas..."
                                    className="w-full bg-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-cyan-500 outline-none placeholder-slate-500 text-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-3">
                                {filteredTemplates.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => setSelectedTemplate(t.id)}
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedTemplate === t.id ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700 hover:border-slate-600 bg-slate-800'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-sm text-white">{t.name}</h3>
                                            {selectedTemplate === t.id && <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1" />}
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2 leading-snug">{t.description}</p>
                                        <div className="flex gap-1 flex-wrap">
                                            {t.tags.map(tag => (
                                                <span key={tag} className="px-1.5 py-0.5 bg-slate-950 rounded text-[10px] text-slate-400 uppercase tracking-wide">#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CONTENT EDITOR TAB */}
                    {activeTab === 'content' && (
                        <div className="space-y-6 pb-20">
                            {/* Personal */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><User size={12} /> Personal</h3>
                                <input className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-sm focus:border-cyan-500 outline-none" value={cvData.personal.name} onChange={(e) => setCvData({ ...cvData, personal: { ...cvData.personal, name: e.target.value } })} placeholder="Nombre" />
                                <input className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-sm focus:border-cyan-500 outline-none" value={cvData.personal.location} onChange={(e) => setCvData({ ...cvData, personal: { ...cvData.personal, location: e.target.value } })} placeholder="Ubicación" />
                                <textarea className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-sm h-32 focus:border-cyan-500 outline-none resize-none" value={cvData.personal.summary} onChange={(e) => setCvData({ ...cvData, personal: { ...cvData.personal, summary: e.target.value } })} placeholder="Perfil Profesional" />
                            </div>

                            {/* Experience */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Briefcase size={12} /> Experiencia</h3>
                                    <button onClick={addExperience} className="text-xs text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-900/30 px-2 py-1 rounded">+ Añadir</button>
                                </div>
                                {cvData.experience.map((exp, i) => (
                                    <div key={exp.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-2">
                                        <input className="w-full bg-transparent font-bold text-sm border-b border-slate-700 pb-1 focus:border-cyan-500 outline-none" value={exp.role} onChange={e => {
                                            const newExp = [...cvData.experience]; newExp[i].role = e.target.value; setCvData({ ...cvData, experience: newExp });
                                        }} placeholder="Cargo / Rol" />
                                        <input className="w-full bg-transparent text-xs text-slate-400 focus:text-white outline-none" value={exp.company} onChange={e => {
                                            const newExp = [...cvData.experience]; newExp[i].company = e.target.value; setCvData({ ...cvData, experience: newExp });
                                        }} placeholder="Empresa" />
                                        <textarea className="w-full bg-black/20 p-2 rounded text-xs text-slate-300 h-24 focus:ring-1 focus:ring-cyan-500 outline-none resize-none" value={exp.description} onChange={e => {
                                            const newExp = [...cvData.experience]; newExp[i].description = e.target.value; setCvData({ ...cvData, experience: newExp });
                                        }} placeholder="• Logros..." />
                                    </div>
                                ))}
                            </div>

                            {/* Education */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><GraduationCap size={12} /> Educación</h3>
                                </div>
                                {cvData.education.map((edu, i) => (
                                    <div key={edu.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-1">
                                        <input className="w-full bg-transparent font-bold text-sm outline-none" value={edu.degree} onChange={e => {
                                            const newEdu = [...cvData.education]; newEdu[i].degree = e.target.value; setCvData({ ...cvData, education: newEdu });
                                        }} />
                                        <input className="w-full bg-transparent text-xs text-slate-400 outline-none" value={edu.school} onChange={e => {
                                            const newEdu = [...cvData.education]; newEdu[i].school = e.target.value; setCvData({ ...cvData, education: newEdu });
                                        }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STYLE TAB PLACEHOLDER */}
                    {activeTab === 'style' && (
                        <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                            <Palette className="text-slate-600 mb-2" />
                            <p className="text-sm text-slate-500">Próximamente: Personalización avanzada de fuentes y acentos de color.</p>
                        </div>
                    )}
                    {/* ATS OPTIMIZATION TAB */}
                    {activeTab === 'ats' && (
                        <div className="space-y-6 pb-20">
                            <div className="bg-cyan-900/10 border border-cyan-500/20 p-4 rounded-xl mb-4">
                                <h3 className="text-cyan-400 font-bold text-sm mb-1 flex items-center gap-2">
                                    <Target size={16} /> Optimizador ATS
                                </h3>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    Pega la oferta de empleo aquí. Re-escribiremos tu CV usando las palabras clave exactas que busca el reclutador.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Description (JD)</label>
                                <textarea
                                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs h-64 focus:border-cyan-500 outline-none resize-none text-slate-300 placeholder-slate-700"
                                    placeholder="Pega aquí los requisitos de la vacante..."
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                />
                                <button
                                    onClick={handleAtsOptimize}
                                    disabled={isOptimizing || !jobDescription.trim()}
                                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 transition-all rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
                                >
                                    {isOptimizing ? <Loader className="animate-spin" size={16} /> : <Target size={16} />}
                                    {isOptimizing ? 'Escaneando...' : 'Optimizar para esta Vacante'}
                                </button>
                            </div>

                            {atsData && (
                                <div className="mt-8">
                                    <ATSFeedback atsData={atsData} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN PREVIEW AREA */}
            <div className="flex-1 bg-slate-950 p-4 md:p-8 flex flex-col items-center justify-start overflow-y-auto relative custom-scrollbar">

                {/* TOOLBAR */}
                <div className="absolute top-4 right-4 md:right-8 flex gap-2 z-30">
                    <button onClick={() => alert("Guardado en tu perfil (Simulación)")} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors shadow-lg border border-slate-700">
                        <Save size={16} /> <span className="hidden md:inline">Guardar</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-white font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? <Loader className="animate-spin" size={16} /> : <Download size={16} />}
                        <span className="hidden md:inline">{isExporting ? 'Generando...' : 'Exportar PDF'}</span>
                    </button>
                </div>

                {/* AI LOADING OVERLAY */}
                <AnimatePresence>
                    {isGenerating && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-40 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-4"
                        >
                            <Loader className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Redactando tu CV con IA...</h2>
                            <p className="text-slate-400">Aplicando reglas del mercado <span className="text-cyan-400 font-bold">{wizardData.market || 'Global'}</span> para el rol de <span className="text-cyan-400 font-bold">{wizardData.role}</span></p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* A4 PAPER PREVIEW (DYNAMIC RENDERER) */}
                <motion.div
                    layout
                    className="origin-top transform scale-[0.5] md:scale-[0.65] lg:scale-[0.85] xl:scale-100 transition-all shadow-2xl mt-12 md:mt-0"
                >
                    {designTokens ? (
                        <CVRenderer data={cvData} tokens={designTokens} />
                    ) : (
                        <div id="cv-document" className="w-[210mm] min-h-[297mm] bg-white text-black rounded-sm overflow-hidden p-12">
                            {/* FALLBACK LEGACY RENDERER IF NO TOKENS YET */}
                            <div className="font-serif text-slate-900">
                                <h1 className="text-4xl font-bold uppercase text-center mb-6">{cvData.personal.name}</h1>
                                <p className="text-center mb-8">{cvData.personal.email} | {cvData.personal.location}</p>
                                <div className="mb-6 text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                    <Sparkles className="mx-auto text-cyan-500 mb-4 animate-pulse" />
                                    <p className="text-sm text-slate-400 italic">Redactando y diseñando con Inteligencia Artificial...</p>
                                </div>
                                <div className="mb-6">
                                    <h2 className="font-bold border-b-2 border-black mb-2 uppercase text-sm">Profile</h2>
                                    <p className="text-sm">{cvData.personal.summary}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default CVBuilder;
