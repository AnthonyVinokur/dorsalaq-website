import test from "node:test";
import assert from "node:assert/strict";
import handler,{validateQuestion} from "../netlify/functions/ask-dorsalaq.mjs";
test("question validation",()=>{assert.equal(validateQuestion("What patent?"),true);assert.equal(validateQuestion(""),false);assert.equal(validateQuestion("x".repeat(401)),false);});
test("rejects GET",async()=>{const r=await handler(new Request("https://dorsalaq.dev/api/ask-dorsalaq"));assert.equal(r.status,405);});
test("rejects malformed JSON",async()=>{const r=await handler(new Request("https://dorsalaq.dev/api/ask-dorsalaq",{method:"POST",body:"{",headers:{"content-type":"application/json"}}));assert.equal(r.status,400);});
test("rejects short question without provider access",async()=>{const r=await handler(new Request("https://dorsalaq.dev/api/ask-dorsalaq",{method:"POST",body:JSON.stringify({question:"x"}),headers:{"content-type":"application/json"}}));assert.equal(r.status,400);});
