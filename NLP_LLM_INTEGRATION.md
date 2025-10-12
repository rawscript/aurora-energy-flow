# NLP and LLM Integration

This document explains how Natural Language Processing (NLP) and Large Language Models (LLMs) integrate into Aurora Energy and how they connect to the platform’s AI/ML algorithms for actionable, data-driven insights.

## Goals
- Natural-language interface for users (chat and instructions)
- Localized, human-friendly explanations of complex analytics (English + Swahili)
- Intent detection and routing to the right analytics/model
- Summarization of time-series usage and anomalies into concise insights
- Safe, resilient operation with offline fallbacks and caching

## Core Components and Files
- Conversational UI: `src/components/ChatInterface.tsx` and `src/components/Chatbot.tsx`
- LLM Service Layer with fallbacks: `src/services/aiService.ts`
- ML Insight Generation (rules + lightweight models): `src/utils/mlInsights.ts`
- Insight presentation: `src/components/EnergyInsights.tsx`, `src/components/RealTimeInsights.tsx`
- AI alerts and analytics (DB): `supabase/migrations/*` (e.g., `ai_alerts`, `get_token_analytics`)

## What NLP/LLM Does vs. What ML Does

- LLM/NLP responsibilities:
  - Conversational understanding: parse user questions and classify intent (e.g., “Why is my bill high?”, “How can I reduce usage?”, “Predict next month’s cost”).
  - Natural language generation: generate user-facing explanations for complex analytics.
  - Orchestration: choose which analytic to run and in what order (e.g., anomaly check → cost factors → recommendation).
  - Summarization and translation: concise summaries in English and Swahili; tone and reading-level adaptation.

- ML/Algorithmic responsibilities:
  - Pattern recognition: identify peak usage windows and recurring behaviors.
  - Anomaly detection: detect abnormal spikes, unusual device patterns, or billing irregularities.
  - Prediction/forecasting: linear trends, short-term usage forecasts, projected costs.
  - Optimization scoring: efficiency score, cost optimization opportunities.

In short: ML produces structured signals from numeric data; the LLM turns that into context-aware, human explanations and routes follow-up analysis from natural language requests.

## How LLM Connects to Existing AI Algorithms

- Pattern Recognition → LLM Explanation
  - Source: `EnergyMLAnalyzer.analyzeUsagePatterns()` in `src/utils/mlInsights.ts`
  - LLM role: Explain peak hours and actionable shifts (e.g., “Move heavy usage out of 6–9 PM”).

- Anomaly Detection → LLM Root-Cause Narrative
  - Source: `EnergyMLAnalyzer.detectAnomalies()`
  - LLM role: Describe likely cause in plain language and suggest verification steps.

- Trend Prediction → LLM Forecast + Caveats
  - Source: `EnergyMLAnalyzer.predictFutureTrends()`
  - LLM role: Communicate rising/declining trends, expected impact on cost, and confidence ranges.

- Efficiency Optimization → LLM Recommendations
  - Source: `EnergyMLAnalyzer.optimizeEfficiency()` and `detectCostOptimizations()`
  - LLM role: Convert factors into prioritized actions with estimated savings.

- Behavioral Patterns → LLM Coaching
  - Source: `EnergyMLAnalyzer.analyzeBehavioralPatterns()`
  - LLM role: Provide habit-level advice (e.g., “Your profile matches Night Saver; consider shifting laundry to 10 PM”).

- Token Analytics → LLM Budgeting Advice
  - Source: DB function `get_token_analytics` and usage summaries
  - LLM role: Translate remaining token days, burn rate, and refills into budget guidance.

## End-to-End Data Flow

1. User asks a question in chat (ChatInterface/Chatbot).
2. LLM service (`aiService.ts`) processes input:
   - Classifies intent (e.g., Forecasting, Anomaly, Optimization, Budgeting).
   - Selects corresponding analytics: ML insights (`mlInsights.ts`) and/or DB analytics (e.g., `get_token_analytics`).
   - Retrieves latest energy context from Supabase (latest readings, trends).
3. ML/analytics produce structured outputs with confidences and metrics.
4. LLM synthesizes an answer: localized, concise, and with next steps.
5. UI presents the response; if the AI service is offline, a fallback response is used.

## LLM Orchestration Pattern

- Intent classification:
  - Map user text to a small intent set: [summary, anomaly, prediction, optimization, budgeting, explain-term, how-to].

- Tool selection (conceptual function-calling):
  - get_usage_summary → compose from recent readings and ML pattern outputs
  - detect_anomalies → call `detectAnomalies()`
  - predict_usage → call `predictFutureTrends()`
  - optimize_cost → call `optimizeEfficiency()` + `detectCostOptimizations()`
  - token_analytics → call DB `get_token_analytics`

- Response synthesis:
  - Summarize objective metrics → offer 1–3 prioritized actions → state confidence.
  - If relevant, generate bilingual output (English + Swahili line-by-line).

Note: The LLM currently integrates via Google Gemini in `aiService.ts` and `ChatInterface.tsx`.

## Prompt and Output Structure (Recommended)

- System prompt core elements:
  - Role: “You are an energy optimization assistant for Kenyan households.”
  - Data sensitivity: Avoid fabricating meter values; cite metrics and confidence.
  - Local context: KPLC tariffs, typical peak hours (e.g., 6–9 PM), common devices.
  - Output schema: Include sections (Insights, Actions, Confidence, Next Checkpoint).

- Optional function-call schema (for future expansion):
  - name: detect_anomalies, parameters: { window: days }
  - name: predict_usage, parameters: { horizon: days }
  - name: token_analytics, parameters: { user_id }

- Example answer format:
  - Insight: “Usage increased 12% week-over-week, concentrated at 7–9 PM.”
  - Action: “Shift water heating to 10 PM; potential KSh 300/month savings.”
  - Confidence: “73% based on 21 readings; recheck in 7 days.”
  - Swahili: “Tumia hita ya maji baada ya saa 4 usiku kupunguza gharama.”

## Multilingual and Accessibility

- English + Swahili responses when actionable guidance is given
- Simple reading level; avoid technical jargon unless asked to explain
- Short sentences; bullet points for actions
- Works in degraded mode with offline templates if LLM is unavailable

## Resilience: Caching, Fallbacks, and Status

- Caching: `aiService.ts` caches responses by normalized prompt to reduce API calls
- Fallbacks: If the AI service fails, return predefined responses with a clear “offline response” note
- Status Broadcast: Components subscribe to AI status and display banners (Online / Offline / Connecting)

## Privacy, Safety, and Cost Controls

- Minimization: Send only necessary metrics (summaries, not raw logs) to the LLM
- PII: Avoid transmitting PII; redact meter identifiers
- Cost guardrails: Cache, short prompts, and concise outputs; consider rate-limiting
- Safety: Avoid medical/financial guarantees; state that values are estimates

## Setup Checklist

- Environment variables:
  - Replace hardcoded keys with env vars (recommended):
    - `VITE_GEMINI_API_KEY` for frontend usage (if required)
    - Or route via a backend proxy that injects the key
  - Ensure Supabase URL and keys are configured in deployment

- Code references:
  - `src/services/aiService.ts` – consolidate key management, retry logic, and prompt templates
  - `src/components/ChatInterface.tsx` – main chat workflow
  - `src/utils/mlInsights.ts` – add methods as new analytics/models are introduced

## Testing and Quality

- Prompt unit tests: Given intents, verify tool selection and template injection
- Golden responses: Maintain sample Q→A pairs and diff for regressions
- Red-teaming: Queries that push the boundary (e.g., fabricate meter data) must be steered safely
- Metrics: Track answer latency, fallback rate, and user helpfulness ratings

## Roadmap

1. Retrieval-Augmented Generation (RAG)
   - Index user-specific energy summaries; retrieve recent anomalies and tariffs
   - Store embeddings in a vector DB (client- or server-side)

2. Function-Calling Integration
   - Explicit tool schema for ML calls (anomaly, prediction, optimization) and DB analytics

3. Better Forecasting Models
   - Add seasonality-aware forecasting and confidence calibration

4. Notification Authoring
   - Use LLM to draft personalized notifications, then store in `ai_alerts`

5. Strict Data Contracts
   - JSON schema validation for AI outputs consumed by the UI

## Example Prompts and Mappings

- “Why is my bill so high this week?”
  - Intent: anomaly + summary
  - Tools: detectAnomalies → analyzeUsagePatterns → cost factors
  - Output: 2–3 causes + prioritized actions, with confidence

- “Predict my cost next month”
  - Intent: prediction
  - Tools: predictFutureTrends + token_analytics (optional)
  - Output: projected KSh range + sensitivity to peak-hours usage

- “Nipunguzie gharama ya umeme” (Help me reduce my electricity cost)
  - Intent: optimization (Swahili)
  - Tools: optimizeEfficiency + detectCostOptimizations
  - Output: 3 targeted tips, localized wording

## Quick Integration Notes

- The LLM is an orchestrator and explainer; numeric intelligence comes from `mlInsights.ts` and DB functions.
- Keep prompts short and structured; prefer metrics → actions → confidence layout.
- Always handle offline mode gracefully and label fallback answers.

