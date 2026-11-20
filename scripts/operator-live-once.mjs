// Local-only operator harness. Executes exactly one genuine model request.
// Requires environment variables in current shell; never prints secrets.
import handler from "../netlify/functions/ask-dorsalaq.mjs";
import {writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
const token = process.env.DORSALAQ_EVAL_TOKEN;
const apiKey = process.env.OPENAI_API_KEY;
const report = process.argv[2];
if (!report || !token || token.length < 32 || !apiKey) {
  console.error("Usage: node scripts/operator-live-once.mjs <new-report.json> (with DORSALAQ_EVAL_TOKEN and OPENAI_API_KEY in environment)");
  process.exit(2);
}
globalThis.Netlify = {env:{get:(key) => process.env[key]}};
const question = "What U.S. patent is identified on the Dorsal AQ website?";
const request = new Request("https://localhost/api/ask-dorsalaq", {
  method:"POST",headers:{"content-type":"application/json","x-evaluation-token":token},
  body:JSON.stringify({question})
});
const response = await handler(request);
const payload = await response.json();
if (!response.ok) {
  console.error("Live inference failed: HTTP",response.status, payload.error || "unknown");
  process.exit(1);
}
const record = {
  application_id:payload.application_id,case_id:"patent-001",
  model_id:payload.model_id,response:payload.response,
  captured_at:new Date().toISOString(),
  execution_mode:"local_function_live_provider",
  source_revision:process.env.DORSALAQ_SOURCE_REVISION || null,
  response_sha256:createHash("sha256").update(payload.response).digest("hex")
};
writeFileSync(report,JSON.stringify(record,null,2)+"\n",{flag:"wx",mode:0o600});
console.log("Live response captured. Model:",record.model_id,"SHA-256:",record.response_sha256);
