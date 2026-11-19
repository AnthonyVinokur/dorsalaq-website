import {timingSafeEqual} from "node:crypto";
// Bounded AI experiment. Requires server-side OPENAI_API_KEY; no secrets in browser.
const FACTS = [
  "Dorsal AQ is a valve-free dry snorkel technology described on dorsalaq.dev.",
  "The website identifies U.S. Patent 10,549,829.",
  "The website provides technology and licensing information, not retail sales.",
];
const SYSTEM = `You answer questions about the Dorsal AQ website only. Use exclusively the following approved public facts:\n${FACTS.join("\n")}\nIf the answer is not supported by these facts, reply exactly: "I cannot verify that from the approved Dorsal AQ information." Do not speculate, give medical or diving safety instructions, reveal private engineering details, or assert performance guarantees. Be concise.`;
export function validateQuestion(value) {
  return typeof value === "string" && value.trim().length >= 3 && value.length <= 400 && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value);
}
export default async function handler(request) {
  const headers = {"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":"https://dorsalaq.dev","x-content-type-options":"nosniff"};
  const reply = (status, body) => new Response(JSON.stringify(body), {status, headers});
  if (request.method !== "POST") return reply(405,{error:"method_not_allowed"});
  // Fail closed: only an operator with a server-configured secret can invoke inference.
  const accessToken = Netlify.env.get("DORSALAQ_EVAL_TOKEN");
  if (!accessToken || accessToken.length < 32) return reply(503,{error:"evaluation_access_not_configured"});
  const supplied = request.headers.get("x-evaluation-token") || "";
  const a = Buffer.from(accessToken), b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a,b)) return reply(401,{error:"unauthorized"});
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 2048) return reply(413,{error:"request_too_large"});
  let body;
  try {body = await request.json();} catch {return reply(400,{error:"invalid_json"});}
  if (!validateQuestion(body?.question)) return reply(400,{error:"invalid_question"});
  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) return reply(503,{error:"ai_not_configured"});
  const model = Netlify.env.get("DORSALAQ_AI_MODEL") || "gpt-4o-mini";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",headers:{"authorization":`Bearer ${apiKey}`,"content-type":"application/json"},
      signal:AbortSignal.timeout(12000),
      body:JSON.stringify({model,temperature:0,max_tokens:160,messages:[{role:"system",content:SYSTEM},{role:"user",content:body.question.trim()}]})
    });
    if (!response.ok) return reply(502,{error:"model_provider_error"});
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return reply(502,{error:"empty_model_response"});
    return reply(200,{application_id:"dorsalaq-website",model_id:data.model || model,question:body.question.trim(),response:answer.trim(),scope:"approved_public_facts_v1"});
  } catch {return reply(502,{error:"model_request_failed"});}
}
export const config = {path:"/api/ask-dorsalaq"};
