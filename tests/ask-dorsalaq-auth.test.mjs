import test from "node:test";
import assert from "node:assert/strict";
import handler from "../netlify/functions/ask-dorsalaq.mjs";

const secret = "a".repeat(64);
function request(token) {
  const headers = {"content-type":"application/json"};
  if (token !== undefined) headers["x-evaluation-token"] = token;
  return new Request("https://preview.example/api/ask-dorsalaq", {
    method:"POST", headers, body:JSON.stringify({question:"What patent is identified?"})
  });
}
async function withMocks(fn) {
  const previousNetlify = globalThis.Netlify, previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.Netlify = {env:{get(name) {
    return {DORSALAQ_EVAL_TOKEN:secret,OPENAI_API_KEY:"test-only",DORSALAQ_AI_MODEL:"test-model"}[name];
  }}};
  globalThis.fetch = async (url, options) => {
    calls.push({url, options});
    return Response.json({model:"test-model",choices:[{message:{content:"U.S. Patent 10,549,829"}}]});
  };
  try { await fn(calls); } finally {
    globalThis.Netlify = previousNetlify;
    globalThis.fetch = previousFetch;
  }
}
test("missing token is rejected by function before provider call", async () => {
  await withMocks(async calls => {
    const r = await handler(request());
    assert.equal(r.status,401);
    assert.deepEqual(await r.json(),{error:"unauthorized"});
    assert.equal(calls.length,0);
  });
});
test("incorrect token is rejected before provider call", async () => {
  await withMocks(async calls => {
    const r = await handler(request("b".repeat(64)));
    assert.equal(r.status,401);
    assert.equal(calls.length,0);
  });
});
test("correct token reaches mocked provider and records model identity", async () => {
  await withMocks(async calls => {
    const r = await handler(request(secret));
    assert.equal(r.status,200);
    const body = await r.json();
    assert.equal(body.model_id,"test-model");
    assert.match(body.response,/10,549,829/);
    assert.equal(calls.length,1);
    assert.equal(calls[0].url,"https://api.openai.com/v1/chat/completions");
  });
});
