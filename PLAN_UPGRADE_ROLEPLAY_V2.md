# 🧠 PLAN MAESTRO: UPGRADE ROLEPLAY V2
## Career Mastery Engine — Interview Simulator

**Autor:** Antigravity Agent / Gabriel  
**Fecha:** 2026-02-25  
**Estado:** ✅ ARCHIVOS CREADOS — Listo para subir a producción

---

## 📍 DIAGNÓSTICO ACTUAL

| Componente | Estado | Problema |
|---|---|---|
| Cerebro Multi-LLM | ⚠️ Parcial | Gemini + DeepSeek + OpenAI, FALTA Claude |
| Constitución | ❌ No existe | Sin reglas formales, valores ni límites |
| Prompt Conversacional | ⚠️ Básico | Mezclado con instrucciones técnicas, sin tono definido |
| Edge Cases | ❌ No existe | Sin manejo de agresividad, off-topic, spam |
| Memoria Conversacional | ❌ Stateless | Cada request pierde contexto anterior |

---

## 🗺️ FASES DE IMPLEMENTACIÓN

---

### FASE 1: CONSTITUCIÓN DE ALEX RECRUITER 📜
**Prioridad:** 🔴 CRÍTICA  
**Archivo:** `server/config/CONSTITUCION_ALEX_RECRUITER.js`

Crear un archivo de constitución formal inspirado en `CONSTITUCION_ALEXANDRA.md` del WhatsApp bot, pero adaptado al contexto de entrevistas laborales.

**Contenido de la Constitución:**

```
I. PROPÓSITO
   - Alex Recruiter es un simulador de entrevistas laborales con IA
   - Prepara candidatos para entrevistas reales
   - Da feedback constructivo en tiempo real
   - Evalúa contenido (STAR method) + idioma (CEFR)

II. IDENTIDAD Y TONO DE VOZ
   - Nombre: "Alex" (todos los modos)
   - Tono base: Profesional pero humano
   - NUNCA robótico ni genérico
   - Se adapta según el modo:
     * ALLY: Cálido, paciente, motivador
     * TECHNICAL: Preciso, directo, exigente pero justo
     * STRESS: Frío, desafiante, provocador (pero NUNCA ofensivo)
   - Idioma: Respeta 100% el idioma seleccionado por el usuario

III. LEYES FUNDAMENTALES
   1. Ley de Respuesta Garantizada: SIEMPRE responde, nunca deja al usuario sin respuesta
   2. Ley de Feedback Constructivo: Toda crítica va acompañada de una sugerencia de mejora
   3. Ley de Seguridad: NUNCA comparte datos del usuario, NUNCA genera contenido dañino
   4. Ley de Realismo: Simula entrevistas REALES, no exámenes académicos
   5. Ley de Progresión: Las 4 fases se cumplen en orden (Rompehielo → CV → Situacional → Presión)

IV. LÍMITES Y REGLAS DE COMPORTAMIENTO
   - NO diagnóstica salud mental
   - NO da consejos legales
   - NO promete resultados ("vas a conseguir el trabajo")
   - NO hace comentarios sobre raza, género, religión, orientación sexual
   - Si el usuario se pone agresivo → Desescalar con profesionalismo
   - Si el usuario va off-topic → Redirigir amablemente a la entrevista
   - Si el usuario pide ayuda real (no simulación) → Sugerir recursos apropiados

V. FLUJO DE DECISIÓN DE IA
   1. Gemini 2.0 Flash (Primario - GRATIS)
   2. Claude 3.5 Sonnet (Fallback 1 - Mejor razonamiento)
   3. DeepSeek Chat (Fallback 2 - LOW COST)
   4. GPT-4o-mini (Fallback 3 - Garantía final)
   Si todos fallan → Mensaje de recuperación elegante

VI. POLÍTICA DE CALIDAD
   - Feedback JSON SIEMPRE estructurado
   - Score de contenido obligatorio (0-100)
   - Correcciones de idioma cuando aplica
   - Máximo 2-3 oraciones por turno de diálogo (natural, no sermón)
```

**Entregable:** Archivo JS exportable con todas las constantes y reglas.

---

### FASE 2: CEREBRO MULTI-LLM CON CLAUDE 🧠
**Prioridad:** 🔴 ALTA  
**Archivo a modificar:** `server/services/aiRouter.js`

**Cambios:**

1. **Agregar Claude como Fallback 1** (mejor razonamiento que DeepSeek para entrevistas)
   - Usar `@anthropic-ai/sdk` (ya está en `ProgrammingRouter.js`)
   - Modelo: `claude-3-5-sonnet-20240620`
   - Variable de entorno: `ANTHROPIC_API_KEY`

2. **Nuevo orden de fallback:**
   ```
   Gemini 1.5 Flash → Claude 3.5 Sonnet → DeepSeek → GPT-4o-mini
   ```

3. **Agregar timeouts y retry por proveedor:**
   - Gemini: timeout 15s, 1 retry
   - Claude: timeout 20s, 1 retry
   - DeepSeek: timeout 15s, sin retry
   - OpenAI: timeout 20s, sin retry (garantía final)

4. **Registrar qué modelo respondió:**
   - Incluir `provider_used` en la respuesta
   - Log en consola: `🧠 Cerebro: claude-sonnet | Roleplay Chat`

**Entregable:** `aiRouter.js` actualizado con 4 providers + resiliencia.

---

### FASE 3: PROMPT CONVERSACIONAL ROBUSTO 💬
**Prioridad:** 🔴 ALTA  
**Archivo a modificar:** `server/services/interviewCoach.js`

**Problemas actuales:**
- El system prompt mezcla instrucciones técnicas con personalidad
- No hay separación entre "quién eres" y "qué debes hacer"
- Las instrucciones JSON están pegadas al prompt de personalidad
- El LANGBYPASS se repite 2 veces (redundante)

**Nuevo diseño del prompt (3 capas):**

```
CAPA 1: CONSTITUCIÓN (importada del archivo de Fase 1)
  → Quién eres, valores, límites, tono

CAPA 2: CONTEXTO DE SESIÓN (dinámico)
  → CV del usuario (resumido inteligentemente, no truncado bruto)
  → Job Description (parseada con keywords)
  → Modo de entrevista (ALLY/TECHNICAL/STRESS)
  → Fase actual (Rompehielo/CV/Situacional/Presión)
  → Historial resumido de la conversación

CAPA 3: INSTRUCCIONES DE OUTPUT (técnico)
  → Formato JSON esperado
  → Reglas de idioma
  → Motor lingüístico CEFR
```

**Mejoras específicas:**
1. Truncado inteligente del CV (extraer keywords, no cortar en el char 2000)
2. Detección automática de fase (no hardcodeada)
3. Prompt adaptativo según el turno de conversación (turno 1 ≠ turno 8)
4. Instrucciones de longitud: "Máximo 2-3 oraciones naturales, como un reclutador real"

**Entregable:** `interviewCoach.js` refactorizado con 3 capas separadas.

---

### FASE 4: MANEJO DE EDGE CASES 🛡️
**Prioridad:** 🟡 MEDIA  
**Archivos:** `server/services/interviewCoach.js` + `server/config/CONSTITUCION_ALEX_RECRUITER.js`

**Edge Cases a cubrir:**

| Situación | Respuesta Alex |
|---|---|
| **Usuario agresivo/grosero** | Desescalar: "Entiendo tu frustración. En una entrevista real, mantener la calma es clave. ¿Quieres intentar de nuevo?" |
| **Off-topic (habla del clima, fútbol)** | Redirigir: "Interesante, pero volvamos a la entrevista. Tu próxima pregunta es..." |
| **Respuesta vacía o "no sé"** | Guiar: "No pasa nada. Intenta usar el método STAR: Situación, Tarea, Acción, Resultado." |
| **Respuesta demasiado larga (500+ palabras)** | Feedback: "Buena info, pero en una entrevista real tenés ~2 minutos. ¿Puedes resumir los 3 puntos clave?" |
| **Usuario pide respuestas** | Límite: "Mi trabajo es prepararte, no darte respuestas. Te doy una pista: enfócate en X." |
| **Contenido inapropiado** | Corte: "Eso no es apropiado en un contexto laboral. Continuemos profesionalmente." |
| **JSON parse falla** | Fallback elegante con mensaje genérico en el idioma correcto |
| **Usuario quiere terminar** | Cierre: Generar reporte final con scores acumulados |

**Implementación técnica:**
- Pre-procesador de mensajes del usuario antes de enviar al LLM
- Detección de patrones (regex + keywords) para situaciones edge
- Respuestas predefinidas para casos críticos (no depender del LLM)

**Entregable:** Módulo `edgeCaseHandler.js` + integración en flujo.

---

### FASE 5: MEMORIA CONVERSACIONAL 🧬
**Prioridad:** 🟡 MEDIA  
**Archivos:** `server/services/interviewCoach.js` + `server/index.js` + DB

**Problema actual:**
- El frontend envía TODO el historial de mensajes en cada request
- No hay resumen ni compresión
- Si la conversación es larga (15+ turnos), el prompt explota y pierde contexto

**Solución en 3 niveles:**

#### Nivel 1: Ventana Deslizante (Rápido - Sin DB)
```
- Mantener últimos 6 mensajes completos
- Mensajes anteriores → Resumir en 1 párrafo con el LLM
- El resumen se inyecta como "contexto previo" en el system prompt
```

#### Nivel 2: Estado de Sesión (Con memoria de servidor)
```
- Crear objeto de sesión en memoria del servidor (Map por sessionId)
- Trackear: fase actual, scores acumulados, temas ya cubiertos
- Timeout de sesión: 30 minutos de inactividad
```

#### Nivel 3: Persistencia en DB (Con Supabase)
```
- Tabla: interview_sessions
  * id (UUID)
  * user_id (FK → profiles)
  * session_data (JSONB): { messages_summary, phase, scores, topics_covered }
  * started_at, updated_at
  * status: 'active' | 'completed' | 'abandoned'
  
- Al finalizar → Generar reporte final guardado en DB
- El usuario puede ver su historial de simulaciones
```

**Entregable:** Sistema de memoria en 3 niveles, implementado progresivamente.

---

## 📐 ORDEN DE EJECUCIÓN

```
FASE 1 (Constitución)     ████████████░░░░░  → Base de todo
FASE 2 (Cerebro Claude)   ████████████░░░░░  → Resiliencia
FASE 3 (Prompt Robusto)   ████████████████░  → Calidad de respuesta
FASE 4 (Edge Cases)       ████████░░░░░░░░░  → Seguridad
FASE 5 (Memoria)          ████░░░░░░░░░░░░░  → Experiencia premium
```

**Recomendación:** Fases 1-2-3 primero (son las más críticas y se construyen una sobre otra). Fases 4-5 después.

---

## 📁 ARCHIVOS NUEVOS A CREAR

| Archivo | Propósito |
|---|---|
| `server/config/CONSTITUCION_ALEX_RECRUITER.js` | Constitución formal exportable |
| `server/services/edgeCaseHandler.js` | Manejo de situaciones edge |
| `server/sql/Create_Interview_Sessions.sql` | Tabla para persistir sesiones |

## 📁 ARCHIVOS A MODIFICAR

| Archivo | Cambios |
|---|---|
| `server/services/aiRouter.js` | + Claude, + timeouts, + retry, + logging |
| `server/services/interviewCoach.js` | Refactor total del prompt (3 capas) |
| `server/index.js` (rutas interview) | + Memoria de sesión, + edge case handler |
| `client/src/components/InterviewSimulator.jsx` | + Indicador de fase, + reporte final |

---

## ✅ CRITERIOS DE ÉXITO

- [ ] Alex SIEMPRE responde (0 errores silenciosos)
- [ ] El tono es natural y profesional (no robótico)
- [ ] Si Gemini cae, Claude toma el control en <3s
- [ ] Un usuario agresivo NUNCA recibe una respuesta agresiva
- [ ] Las conversaciones largas NO pierden contexto
- [ ] El feedback JSON es SIEMPRE parseable
- [ ] El usuario puede ver un reporte al final de la simulación

---

**ESTADO:** Esperando aprobación de Gabriel para arrancar Fase 1.
