import React from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Sparkles, Brain, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = ({ session }) => {
    const tools = [
        {
            title: "Constructor de CV",
            desc: "Crea un CV de alto impacto optimizado para Microsoft, Amazon y Google.",
            icon: <Sparkles className="w-8 h-8" />,
            link: "/cv-builder",
            color: "cyan",
            bgColor: "bg-cyan-900/30",
            hoverBg: "group-hover:bg-cyan-600",
            hoverIcon: "group-hover:text-white",
            hoverText: "group-hover:text-cyan-400"
        },
        {
            title: "Escáner ATS",
            desc: "Analiza tu CV contra ofertas reales y descubre por qué no te están llamando.",
            icon: <FileText className="w-8 h-8" />,
            link: "/ats-scanner",
            color: "blue",
            bgColor: "bg-blue-900/30",
            hoverBg: "group-hover:bg-blue-600",
            hoverIcon: "group-hover:text-white",
            hoverText: "group-hover:text-blue-400"
        },
        {
            title: "Test Psicométrico",
            desc: "IA adaptativa que evalúa tu perfil vs el puesto objetivo. Veredicto profesional.",
            icon: <Brain className="w-8 h-8" />,
            link: "/psychometric",
            color: "purple",
            bgColor: "bg-purple-900/30",
            hoverBg: "group-hover:bg-purple-600",
            hoverIcon: "group-hover:text-white",
            hoverText: "group-hover:text-purple-400"
        },
        {
            title: "Juego de rol Entrevista",
            desc: "Simula entrevistas técnicas y de RRHH con Alex. Feedback en tiempo real.",
            icon: <User className="w-8 h-8" />,
            link: "/interview",
            color: "emerald",
            bgColor: "bg-emerald-900/30",
            hoverBg: "group-hover:bg-emerald-600",
            hoverIcon: "group-hover:text-white",
            hoverText: "group-hover:text-emerald-400"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans py-20">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
            >
                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-6 uppercase tracking-tighter">
                    Career Mastery Engine
                </h1>
                <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                    Tu arsenal completo de IA para dominar el mercado internacional.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                {tools.map((tool, idx) => (
                    <Link to={tool.link} key={idx} className="group">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 h-full flex flex-col justify-between hover:border-slate-700 hover:shadow-2xl hover:shadow-cyan-900/10 transition-all"
                        >
                            <div>
                                <div className={`w-16 h-16 ${tool.bgColor} rounded-2xl flex items-center justify-center mb-6 ${tool.hoverBg} transition-all duration-300`}>
                                    <div className={`text-${tool.color}-400 ${tool.hoverIcon} transition-colors`}>
                                        {tool.icon}
                                    </div>
                                </div>
                                <h2 className={`text-2xl font-black text-white mb-3 ${tool.hoverText} transition-colors uppercase tracking-tight`}>
                                    {tool.title}
                                </h2>
                                <p className="text-slate-400 leading-relaxed font-medium">
                                    {tool.desc}
                                </p>
                            </div>
                            <div className="mt-8 flex items-center font-black text-sm uppercase tracking-widest text-slate-500 group-hover:text-white group-hover:translate-x-2 transition-all">
                                ACCEDER AHORA <ArrowRight className="ml-2 w-4 h-4" />
                            </div>
                        </motion.div>
                    </Link>
                ))}
            </div>

            <div className="mt-16 text-center">
                <Link to="/admin" className="text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] hover:text-cyan-500 transition-all">
                    Portal de Administración
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
