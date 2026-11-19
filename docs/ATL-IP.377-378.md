# ATL-IP.377–378 — DorsalAQ bounded AI experiment

The public website remains static. A separate /ai-lab.html experiment calls a Netlify Function at /api/ask-dorsalaq, using the OpenAI Chat Completions API on the server. It is not linked from the production homepage and is not a production-certified answer service.

## Setup
Configure OPENAI_API_KEY as a Netlify environment variable for Functions; optionally DORSALAQ_AI_MODEL (default gpt-4o-mini). Never commit credentials. Deploy a branch preview first; do not merge or enable production until verified. Netlify Function uses Netlify.env, requires Netlify runtime, and has no local secret fallback.

## Operator
Run `node --test tests/ask-dorsalaq.test.mjs` (Node 20+). On the deployed branch preview, POST JSON `{"question":"What patent is identified?"}` to `/api/ask-dorsalaq`. Capture the returned response and model_id with the exact deployed Git SHA; do not call fixture responses real inference. Map captured responses to the private evaluator's `application_id`, `case_id`, `model_id`, and `response` fields. Independently approve reference answers before treating evaluations as conclusive.

## Safety and limitations
The server-side prompt is an instruction boundary, not a guarantee of factual correctness or injection resistance. No persistent conversation, retrieval, user data storage, IP-sensitive details, or safety advice. Rate limits and abuse controls are not implemented; keep experimental endpoint in a controlled preview and do not deploy publicly without them. External provider may process submitted questions. Provider errors do not reveal keys.
