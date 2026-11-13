"use strict";var se=Object.defineProperty;var De=Object.getOwnPropertyDescriptor;var Fe=Object.getOwnPropertyNames;var He=Object.prototype.hasOwnProperty;var Je=(r,e)=>{for(var t in e)se(r,t,{get:e[t],enumerable:!0})},Be=(r,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of Fe(e))!He.call(r,s)&&s!==t&&se(r,s,{get:()=>e[s],enumerable:!(n=De(e,s))||n.enumerable});return r};var Ge=r=>Be(se({},"__esModule",{value:!0}),r);var Ct={};Je(Ct,{default:()=>ne});module.exports=Ge(Ct);var d=require("obsidian");var U={ollamaUrl:"http://localhost:11434",ollamaChatModel:"qwen3.5:4b",chatTimeoutMs:12e4,warmupOnFocus:!1,defaultTargetPath:"notes/gamma.md",reportBackVerbosity:"verbose"};function we(r){let e={...U};if(r===null||typeof r!="object")return e;let t=r;if(typeof t.ollamaUrl=="string"&&t.ollamaUrl.length>0&&(e.ollamaUrl=t.ollamaUrl.replace(/\/$/,"")),typeof t.ollamaChatModel=="string"&&t.ollamaChatModel.length>0&&(e.ollamaChatModel=t.ollamaChatModel),typeof t.chatTimeoutMs=="number"&&Number.isFinite(t.chatTimeoutMs)&&t.chatTimeoutMs>0)e.chatTimeoutMs=t.chatTimeoutMs;else if(typeof t.chatTimeoutMs=="string"){let n=Number(t.chatTimeoutMs);Number.isFinite(n)&&n>0&&(e.chatTimeoutMs=n)}return typeof t.warmupOnFocus=="boolean"&&(e.warmupOnFocus=t.warmupOnFocus),typeof t.defaultTargetPath=="string"&&(e.defaultTargetPath=t.defaultTargetPath),(t.reportBackVerbosity==="minimal"||t.reportBackVerbosity==="normal"||t.reportBackVerbosity==="verbose")&&(e.reportBackVerbosity=t.reportBackVerbosity),e}var A=class{constructor(e){this.opts=e}opts;async complete(e){let t=[...this.opts.systemPrompt?[{role:"system",content:this.opts.systemPrompt}]:[],{role:"user",content:e}];return this.chat(t)}async chat(e,t){let n=new AbortController,s=setTimeout(()=>n.abort(),this.opts.timeoutMs??6e4),i=()=>n.abort();t?.addEventListener("abort",i);try{let a=await fetch(`${this.opts.baseUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.opts.model,messages:e,stream:!0}),signal:n.signal});if(!a.ok){let o="";try{o=await a.text()}catch{}return console.warn("[Huginn] Ollama chat HTTP",a.status,o.slice(0,1e3)),null}return await this.readStreamingResponse(a,t)}catch(a){if(a.name==="AbortError"){if(t?.aborted)return null;console.warn("[Huginn] Ollama chat timed out")}else console.warn("[Huginn] Ollama chat failed:",a.message);return null}finally{t?.removeEventListener("abort",i),clearTimeout(s)}}async readStreamingResponse(e,t){if(!e.body)return null;let n=e.body.getReader(),s=new TextDecoder,i="";try{for(;;){if(t?.aborted)return await n.cancel(),null;let{done:a,value:o}=await n.read();if(a)break;let c=s.decode(o,{stream:!0});for(let l of c.split(`
`)){let u=l.trim();if(u)try{let h=JSON.parse(u);if(h.message?.content&&(i+=h.message.content),h.done)break}catch{}}}}finally{n.releaseLock()}return qe(i.trim())}};function qe(r){let e=r.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);return e?e[1].trim():r.trim()}function Re(r,e){return{recipe:r,inputs:e}}function be(r,e=""){let{recipe:t,inputs:n}=r,s=new Map;for(let a of n)s.set(a.key,Ue(a.value));let i=ke(t.instructions,s);return e.length>0&&(i+=`

Previous mistakes to avoid for this skill:
${e}`),{prompt:i,outputSchemaText:ke(JSON.stringify(t.outputSchema,null,2),s)}}function Ue(r){return r==null?"":typeof r=="string"?r:JSON.stringify(r,null,2)}function ke(r,e){let t=r;for(let[n,s]of e)t=t.split(`{{${n}}}`).join(s);return t}function Ce(r,e,t=""){let n=[];return re(r,e,t,n),{ok:n.length===0,errors:n}}function re(r,e,t,n){if(e.enum!==void 0&&!e.enum.some(s=>s===r)){n.push({path:t,message:`value not in enum ${JSON.stringify(e.enum)}`});return}switch(e.type){case"string":typeof r!="string"&&n.push({path:t,message:`expected string, got ${typeof r}`});break;case"number":(typeof r!="number"||Number.isNaN(r))&&n.push({path:t,message:`expected number, got ${typeof r}`});break;case"boolean":typeof r!="boolean"&&n.push({path:t,message:`expected boolean, got ${typeof r}`});break;case"array":if(!Array.isArray(r)){n.push({path:t,message:`expected array, got ${typeof r}`});return}for(let s=0;s<r.length;s++)re(r[s],e.items,`${t}[${s}]`,n);break;case"object":if(r===null||typeof r!="object"||Array.isArray(r)){n.push({path:t,message:`expected object, got ${r===null?"null":typeof r}`});return}ze(r,e,t,n);break}}function ze(r,e,t,n){if(e.type!=="object")return;let s=e.required??[];for(let i of s)i in r||n.push({path:`${t}.${i}`,message:"missing required property"});if(e.properties)for(let[i,a]of Object.entries(e.properties))i in r&&re(r[i],a,t?`${t}.${i}`:i,n)}function Pe(r,e){let t=[];return Se("",r,e,t),{changes:t}}function Se(r,e,t,n){if(ie(e,t))return;let s=xe(e),i=xe(t);if(s!==i||s!=="object"){n.push({path:r||".",oldValue:e,newValue:t});return}let a=e,o=t,c=new Set([...Object.keys(a),...Object.keys(o)]);for(let l of c){let u=r?`${r}.${l}`:l;l in a?l in o?Se(u,a[l],o[l],n):n.push({path:u,oldValue:a[l],newValue:void 0}):n.push({path:u,oldValue:void 0,newValue:o[l]})}}function xe(r){return r===null?"null":Array.isArray(r)?"array":typeof r}function ie(r,e){if(r===e)return!0;if(r===null||e===null||typeof r!=typeof e||typeof r!="object"||Array.isArray(r)!==Array.isArray(e))return!1;if(Array.isArray(r)){let a=r,o=e;if(a.length!==o.length)return!1;for(let c=0;c<a.length;c++)if(!ie(a[c],o[c]))return!1;return!0}let t=r,n=e,s=Object.keys(t),i=Object.keys(n);if(s.length!==i.length)return!1;for(let a of s)if(!Object.prototype.hasOwnProperty.call(n,a)||!ie(t[a],n[a]))return!1;return!0}function Me(r){if(r.changes.length===0)return"No changes.";let e=[];for(let t of r.changes)e.push(`--- ${t.path}`),e.push(`old: ${JSON.stringify(t.oldValue)}`),e.push(`new: ${JSON.stringify(t.newValue)}`);return e.join(`
`)}var L=class{constructor(e){this.opts=e}opts;async run(e,t,n,s){let i=await this.opts.inputGatherer.gather(e,t),a=this.opts.corrections?await this.opts.corrections.getContext(e.metadata.name,5):{text:""},o=be(Re(e,i),a.text),c=await this.opts.llmClient.complete(o.prompt,s),l={raw:c??"",json:void 0},u=!1,h=[],p=!0,m=[],v=!1;if(c===null)v=!0,h.push({path:"",message:"LLM client returned null"});else{try{l.json=JSON.parse(c)}catch(w){h.push({path:"",message:`Output is not valid JSON: ${w.message}`})}if(l.json!==void 0){let w=Ce(l.json,e.outputSchema);if(u=w.ok,h.push(...w.errors),u&&this.opts.groundTruthValidator){let S=await this.opts.groundTruthValidator.validate(e,i,l.json);p=S.ok,m.push(...S.errors)}}}let g=l.json,k=Pe(n??{},g??{}),f=null,y=null,M=We(i);if(u&&p)if(e.applyMethod==="noop")f=null,y=null;else{let w=e.validation.map(R=>R.description).filter(R=>typeof R=="string"&&R.length>0),S=await this.opts.approvalGate.approve({diffText:JSON.stringify(k),output:g??{},recipeName:e.metadata.name,targetPath:M,groundTruthChecks:w},s);if(S===null)f=null;else if(f=S.approved,f===!0){let R=this.opts.applyRegistry.get(e.applyMethod);R?y=await R({recipe:e,output:g??{},inputs:i}):y={applied:!1,message:`Unknown apply method: ${e.applyMethod}`}}else{let R=S.reason?.trim();y={applied:!1,message:R?`Rejected: ${R}`:"Rejected by approval gate."},this.opts.corrections&&await this.opts.corrections.append({recipe:e.metadata.name,type:"refusal",key:(R??"user rejected suggestion").slice(0,120),note:R?`User rejected suggestion: ${R}`:"User rejected the suggested change via the approval gate."})}}return this.opts.corrections&&!v&&(u?y?.applied===!1&&!y.message.startsWith("Rejected")&&await this.opts.corrections.append({recipe:e.metadata.name,type:"apply-failed",key:y.message.slice(0,120),note:`Apply failed: ${y.message}. Output was: ${JSON.stringify(l.json??null).slice(0,400)}`}):await this.opts.corrections.append({recipe:e.metadata.name,type:"schema-error",key:h.map(w=>w.message).join("; ").slice(0,120),note:`Schema validation failed: ${h.map(w=>w.message).join("; ")}. Output was: ${JSON.stringify(l.json??null).slice(0,400)}`})),{recipeName:e.metadata.name,renderedPrompt:o.prompt,parsedOutput:l,schemaValid:u,schemaErrors:h,groundTruthValid:p,groundTruthErrors:m,diff:k,approved:f,applyResult:y}}async warmup(){await this.opts.llmClient.complete('Say "ok". Return only the word ok.')}};function We(r){let e=r.find(t=>t.key==="targetPath");return typeof e?.value=="string"?e.value:void 0}var j=require("obsidian");var $=class r extends j.Modal{request;onConfirm;static activeModal=null;constructor(e,t,n){super(e),this.request=t,this.onConfirm=n}static closeActive(){let e=r.activeModal;e&&(e.close(),r.activeModal=null)}onOpen(){r.activeModal=this;let{contentEl:e}=this;e.empty(),this.renderMainView(e)}renderMainView(e){if(e.empty(),e.createEl("h2",{text:`Huginn: Approve ${this.request.recipeName}`}),this.request.targetPath&&e.createEl("p",{text:`Target: ${this.request.targetPath}`}),this.request.reason&&e.createEl("p",{text:this.request.reason}),this.request.groundTruthChecks&&this.request.groundTruthChecks.length>0){e.createEl("h3",{text:"Checks passed"});let i=e.createEl("ul",{cls:"huginn-ground-truth-checks"});for(let a of this.request.groundTruthChecks)i.createEl("li",{text:a})}let t=Me(this.request.diff);e.createEl("pre",{cls:"huginn-diff",attr:{style:"white-space: pre-wrap; background: var(--background-secondary); padding: 1em; border-radius: 6px;"}}).setText(t);let s=e.createDiv({cls:"huginn-approval-buttons"});s.style.display="flex",s.style.gap="1em",s.style.marginTop="1em",new j.Setting(s).addButton(i=>{i.setButtonText("Reject"),i.onClick(()=>{this.renderReasonView(e)})}).addButton(i=>{i.setButtonText("Approve"),i.setCta(),i.onClick(()=>{this.close(),this.onConfirm(!0)})})}renderReasonView(e){e.empty(),e.createEl("h3",{text:`Why are you rejecting ${this.request.recipeName}?`}),e.createEl("p",{text:"Optional: explain what was wrong so Huginn can learn."});let t=e.createEl("textarea",{cls:"huginn-rejection-reason",attr:{rows:"3",placeholder:"e.g., wrong tag, unsafe change, ...",style:"width: 100%;"}}),n=e.createDiv({cls:"huginn-approval-buttons"});n.style.display="flex",n.style.gap="1em",n.style.marginTop="1em",new j.Setting(n).addButton(s=>{s.setButtonText("Back"),s.onClick(()=>{this.renderMainView(e)})}).addButton(s=>{s.setButtonText("Confirm reject"),s.setWarning(),s.onClick(()=>{let i=t.value.trim();this.close(),this.onConfirm(!1,i.length>0?i:void 0)})})}onClose(){r.activeModal===this&&(r.activeModal=null);let{contentEl:e}=this;e.empty()}};var I=class{constructor(e){this.app=e}app;async approve(e,t){let n;try{n=JSON.parse(e.diffText)}catch{n={changes:[]}}return new Promise(s=>{let i=new $(this.app,{recipeName:e.recipeName,targetPath:e.targetPath??"",diff:n,reason:this.describeOutput(e.output),groundTruthChecks:e.groundTruthChecks},(o,c)=>{s({approved:o,reason:c})});i.open();let a=()=>{i.close(),s(null)};if(t?.aborted){a();return}t?.addEventListener("abort",a)})}describeOutput(e){if(e===null||typeof e!="object")return;let t=e,n=[];if(typeof t.tag=="string"&&n.push(`Proposed tag: ${t.tag}`),typeof t.reason=="string"&&n.push(`Reason: ${t.reason}`),n.length!==0)return n.join(`
`)}};function x(r){let e=r.trim();return!e||e.length===0||e.endsWith(".md")||/[?#\[]/.test(e)?e:`${e}.md`}var V=class{constructor(e){this.opts=e}opts;async gather(e,t){let n={},s=[];for(let i of e.inputs){let a=await this.resolveInput(i,t??{},n);n[i.key]=a,s.push({key:i.key,value:a})}return s}async resolveInput(e,t,n){switch(e.source){case"recipe-param":{let s=t[e.key]??this.opts.defaultTargetPath??null;return e.key==="targetPath"&&typeof s=="string"?x(s):s}case"content":{let s=x(String(n.targetPath??t.targetPath??this.opts.defaultTargetPath??""));return this.gatherContent(s)}case"vocabulary":return this.gatherVocabulary();case"query":{let s=e.queryKey??e.key,i=x(String(n[s]??t[s]??""));return this.gatherQuery(i)}case"path":{let s=x(String(t[e.key]??this.opts.defaultTargetPath??""));return this.gatherRelatedChunks(s)}case"constant":return t[e.key]??null;default:return null}}gatherVocabulary(){return this.opts.api.tagVocabulary()}gatherQuery(e){if(!e||e.length<2)return null;let t=this.opts.api.searchText(e);return t===null?null:{hits:t.hits.slice(0,20)}}gatherRelatedChunks(e){return!e||e.length===0?null:this.opts.api.relatedChunks(e,10)}async gatherContent(e){if(!e||e.length===0)return null;let t=this.opts.app.vault.getAbstractFileByPath(e);return!t||!Ye(t)?null:this.opts.app.vault.cachedRead(t)}};function Ye(r){return typeof r=="object"&&r!==null&&"path"in r&&"extension"in r}function O(r,e){if(e===""||e==="/")return r;let t=e.replace(/^\//,"").split("."),n=r;for(let s of t){if(n===null||typeof n!="object"||Array.isArray(n))return;n=n[s]}return n}function _e(){let r=new Map;function e(n,s){r.set(n,s)}function t(n){return r.get(n)}return{register:e,get:t}}function ue(r){let{resolveFile:e,readFile:t,writeFile:n,processFrontMatter:s}=r,i=_e();return i.register("noop",async a=>({applied:!1,message:`no-op apply for ${a.recipe.metadata.name}: ${JSON.stringify(a.output).slice(0,200)}`})),i.register("append-frontmatter-array",async a=>{let o=a.recipe.applyParams??{},c=N(o,"key","tags"),l=N(o,"valuePath","value"),u=Xe(o,"unique",!0),h=O(a.output,l),p=Qe(h);if(p.length===0)return{applied:!1,message:`No ${l} provided; nothing to apply.`};let m=ae(a.inputs),v=m?e(m):null;if(!m||!oe(v))return{applied:!1,message:`Target note not found: ${m??"unknown"}`};try{if(s)await s(v,k=>{let f=Te(k[c]);for(let y of p)(!u||!f.includes(y))&&f.push(y);k[c]=f});else{let k=await t(v),{frontmatter:f,body:y}=le(k),M=Te(f[c]);for(let w of p)(!u||!M.includes(w))&&M.push(w);f[c]=M,await n(v,ce(f,y))}return{applied:!0,message:`Added ${p.map(k=>`'${k}'`).join(", ")} to frontmatter ${c} of ${m}.`}}catch(g){return{applied:!1,message:`Failed to write ${c} to ${m}: ${g.message}`}}}),i.register("set-first-heading",async a=>{let o=a.recipe.applyParams??{},c=N(o,"valuePath","title"),l=O(a.output,c);if(!l||typeof l!="string"||l.length===0)return{applied:!1,message:`No ${c} provided; nothing to apply.`};let u=ae(a.inputs),h=u?e(u):null;if(!u||!oe(h))return{applied:!1,message:`Target note not found: ${u??"unknown"}`};try{let p=await t(h),{frontmatter:m,body:v}=le(p);m.title=l;let g=v.trimStart(),k=g.startsWith("# ")?`# ${l}
${g.slice(g.indexOf(`
`)+1)}`:`# ${l}

${v}`;return await n(h,ce(m,k)),{applied:!0,message:`Set first heading to '${l}' in ${u}.`}}catch(p){return{applied:!1,message:`Failed to write title '${l}' to ${u}: ${p.message}`}}}),i.register("append-section",async a=>{let o=a.recipe.applyParams??{},c=N(o,"heading","Related"),l=N(o,"valuePath","items"),u=N(o,"itemTemplate","- {{value}}"),h=O(a.output,l),p=Array.isArray(h)?h.filter(g=>typeof g=="string"&&g.length>0):[];if(p.length===0)return{applied:!1,message:`No ${l} provided; nothing to apply.`};let m=ae(a.inputs),v=m?e(m):null;if(!m||!oe(v))return{applied:!1,message:`Target note not found: ${m??"unknown"}`};try{let g=await t(v),{frontmatter:k,body:f}=le(g),y=p.map(S=>u.replace(/\{\{value\}\}/g,Ke(S))).join(`
`),M=f.length>0&&!f.endsWith(`

`)?`

`:"",w=`${f}${M}## ${c}
${y}
`;return await n(v,ce(k,w)),{applied:!0,message:`Added ${p.length} item(s) to ${m}: ${p.join(", ")}`}}catch(g){return{applied:!1,message:`Failed to write ${l} to ${m}: ${g.message}`}}}),i}function ae(r){let e=r.find(t=>t.key==="targetPath");return typeof e?.value=="string"?e.value:void 0}function oe(r){return typeof r=="object"&&r!==null&&"path"in r&&"extension"in r}function Ke(r){return r.replace(/\.md$/i,"")}function le(r){if(!r.startsWith(`---
`))return{frontmatter:{},body:r};let e=r.indexOf(`
---`,4);if(e===-1)return{frontmatter:{},body:r};let t=r.slice(4,e),n=r.slice(e+4);return{frontmatter:Ze(t),body:n}}function ce(r,e){let t=Object.keys(r);if(t.length===0)return e;let n=["---"];for(let s of t){let i=r[s];if(Array.isArray(i)){n.push(`${s}:`);for(let a of i)n.push(`  - ${String(a)}`)}else(typeof i=="string"||typeof i=="number"||typeof i=="boolean")&&n.push(`${s}: ${String(i)}`)}return n.push("---"),`${n.join(`
`)}${e.startsWith(`
`)?"":`
`}${e}`}function Te(r){return Array.isArray(r)?r.filter(e=>typeof e=="string"):typeof r=="string"?r.split(",").map(e=>e.trim()).filter(Boolean):[]}function Qe(r){return Array.isArray(r)?r.filter(e=>typeof e=="string"&&e.length>0):typeof r=="string"&&r.length>0?[r]:typeof r=="number"?[String(r)]:[]}function N(r,e,t){let n=r[e];return typeof n=="string"?n:t}function Xe(r,e,t){let n=r[e];return typeof n=="boolean"?n:t}function Ze(r){let e={},t=r.split(`
`),n=null;for(let s of t){let i=s.trim();if(i.length===0||i.startsWith("#"))continue;if(i.startsWith("- ")){let l=i.slice(2);n&&e[n].push(l);continue}let a=i.indexOf(": ");if(a===-1)continue;let o=i.slice(0,a),c=i.slice(a+2);c===""?(e[o]=[],n=o):(e[o]=et(c),n=null)}return e}function et(r){return/^-?\d+(\.\d+)?$/.test(r)?Number(r):r}var pe=class{primitives=new Map;register(e){return this.primitives.set(e.name,e),this}get(e){return this.primitives.get(e)}};function he(){return new pe().register(tt).register(nt).register(st).register(rt).register(it).register(at)}var D=class{constructor(e,t){this.registry=e;this.vault=t}registry;vault;async validate(e,t,n){let s=[];for(let i of e.validation)await this.validateRule(e,i,t,n,s);return{ok:s.length===0,errors:s}}async validateRule(e,t,n,s,i){let a=ot(s,t.path);if(a===void 0){i.push({path:t.path,message:"output value missing for ground-truth check"});return}let o=this.registry.get(t.primitive);if(!o){i.push({path:t.path,message:`unsupported ground-truth primitive: ${t.primitive}`});return}let c={recipe:e,output:a,inputs:n,vault:this.vault},l=await o.validate(c,t.params??{});t.description&&l.length>0?i.push(...l.map(u=>({path:u.path,message:`${t.description}: ${u.message}`}))):i.push(...l)}},tt={name:"file-exists",async validate({vault:r,output:e},t){let n=String(e);return r.getFileFrontmatter(n)!==null?[]:[{path:String(t.path??"/"),message:`file does not exist: ${n}`}]}},nt={name:"file-not-exists",async validate({vault:r,output:e},t){let n=String(e);return r.getFileFrontmatter(n)!==null?[{path:String(t.path??"/"),message:`file already exists: ${n}`}]:[]}},st={name:"frontmatter-contains",async validate({vault:r,output:e,inputs:t},n){let s=z(t,String(n.targetPathInput??"targetPath"));if(!s)return[{path:String(n.path??"/"),message:"missing targetPath input for frontmatter check"}];let i=r.getFileFrontmatter(s);if(i===null)return[{path:String(n.path??"/"),message:`target file not found: ${s}`}];let a=String(n.key??"tags"),o=i[a];return Ae(o,e)?[]:[{path:String(n.path??"/"),message:`value does not match frontmatter key '${a}'`}]}},rt={name:"frontmatter-not-contains",async validate({vault:r,output:e,inputs:t},n){let s=z(t,String(n.targetPathInput??"targetPath"));if(!s)return[{path:String(n.path??"/"),message:"missing targetPath input for frontmatter check"}];let i=r.getFileFrontmatter(s);if(i===null)return[{path:String(n.path??"/"),message:`target file not found: ${s}`}];let a=String(n.key??"tags"),o=i[a];return Ae(o,e)?[{path:String(n.path??"/"),message:`value already present in frontmatter key '${a}'`}]:[]}},it={name:"note-contains-text",async validate({vault:r,output:e,inputs:t},n){let s=z(t,String(n.targetPathInput??"targetPath"));if(!s)return[{path:String(n.path??"/"),message:"missing targetPath input for note text check"}];let i=await r.readFile(s);if(i===null)return[{path:String(n.path??"/"),message:`target file not found: ${s}`}];let a=String(e).toLowerCase();return i.toLowerCase().includes(a)?[]:[{path:String(n.path??"/"),message:`text not found in note body: ${String(e)}`}]}},at={name:"note-not-contains-text",async validate({vault:r,output:e,inputs:t},n){let s=z(t,String(n.targetPathInput??"targetPath"));if(!s)return[{path:String(n.path??"/"),message:"missing targetPath input for note text check"}];let i=await r.readFile(s);if(i===null)return[{path:String(n.path??"/"),message:`target file not found: ${s}`}];let a=String(e).toLowerCase();return i.toLowerCase().includes(a)?[{path:String(n.path??"/"),message:`text already present in note body: ${String(e)}`}]:[]}};function z(r,e){let n=r.find(s=>s.key===e)?.value;return typeof n=="string"?n:void 0}function ot(r,e){if(e===""||e==="/")return r;let t=e.replace(/^\//,"").split("/"),n=r;for(let s of t){if(n===null||typeof n!="object"||Array.isArray(n))return;n=n[s]}return n}function Ae(r,e){return r==null?!1:Array.isArray(r)?r.some(t=>t===e):r===e}var de=require("obsidian"),F=class{constructor(e){this.app=e}app;getFileFrontmatter(e){let t=this.app.vault.getAbstractFileByPath(e);return!t||!(t instanceof de.TFile)?null:this.app.metadataCache.getFileCache(t)?.frontmatter??{}}async readFile(e){let t=this.app.vault.getAbstractFileByPath(e);if(!t||!(t instanceof de.TFile))return null;try{return await this.app.vault.cachedRead(t)}catch{return null}}};var C=require("obsidian"),H=class{constructor(e){this.vault=e}vault;async read(e){let t=(0,C.normalizePath)(e),n=this.vault.getAbstractFileByPath(t);if(!n||!(n instanceof C.TFile))throw new Error(`Memory file not found: ${e}`);return this.vault.cachedRead(n)}async write(e,t){let n=(0,C.normalizePath)(e);await this.ensureFolder(n);let s=this.vault.getAbstractFileByPath(n);s&&s instanceof C.TFile?await this.vault.modify(s,t):await this.vault.create(n,t)}async exists(e){let t=(0,C.normalizePath)(e);return this.vault.getAbstractFileByPath(t)instanceof C.TFile}async ensureFolder(e){let t=e.split("/");t.pop();let n="";for(let s of t){n=n?`${n}/${s}`:s;let i=this.vault.getAbstractFileByPath((0,C.normalizePath)(n));(!i||!(i instanceof C.TFolder))&&await this.vault.createFolder((0,C.normalizePath)(n))}}};var E=class{constructor(e,t){this.storage=e;this.basePath=t}storage;basePath;async append(e,t){let n=this.resolvePath(e),s=this.formatEntry(t),i=await this.readRaw(n);i.length>0&&!i.endsWith(`
`)&&(i+=`
`),i.length>0&&(i+=`
---

`),i+=s,await this.storage.write(n,i)}async readContext(e,t={}){let n=this.resolvePath(e),s=await this.readRaw(n);if(s.trim().length===0)return"";let a=this.parseEntries(s);t.recipe&&(a=a.filter(l=>l.recipe===t.recipe));let o=t.limit??10,c=a.slice(-o);return c.length===0?"":c.map(l=>`- ${l.type}${l.recipe?` (${l.recipe})`:""}: ${l.note}`).join(`
`)+`
`}async summarizeRecurrence(e,t=4){let n=this.resolvePath(e),s=await this.readRaw(n);if(s.trim().length===0)return[];let i=this.parseEntries(s),a=new Map;for(let l of i){let u=this.recurrenceKey(l);a.set(u,(a.get(u)??0)+1)}let o=new Set,c=[];for(let l=i.length-1;l>=0;l--){let u=i[l],h=this.recurrenceKey(u),p=a.get(h)??0;p>=t&&!o.has(h)&&(o.add(h),c.unshift({...u,recurrence:p}))}return c}resolvePath(e){return`${this.basePath.replace(/\/$/,"")}/${e.replace(/^\//,"")}`}async readRaw(e){return await this.storage.exists(e)?this.storage.read(e):""}formatEntry(e){let t=["---"];return t.push(`date: ${e.date}`),t.push(`type: ${e.type}`),e.recipe&&t.push(`recipe: ${e.recipe}`),t.push(`key: ${e.key}`),e.recurrence!==void 0&&t.push(`recurrence: ${e.recurrence}`),t.push("---"),t.push(e.note.trim()),t.join(`
`)}parseEntries(e){let t=[],n=e.replace(/\r\n?/g,`
`),s=0;for(;s<n.length;){let i=n.indexOf(`---
`,s);if(i===-1)break;let a=i+4,o=n.indexOf(`
---`,a);if(o===-1)break;let c=n.slice(a,o).trim(),l=o+4,u=n.indexOf(`
---
`,l);u===-1&&(u=n.length);let h=n.slice(l,u).trim(),p=this.parseFrontmatter(c);s=u===n.length?u:u+5,!(!p.type||!p.key)&&t.push({date:typeof p.date=="string"?p.date:new Date().toISOString(),type:String(p.type),recipe:typeof p.recipe=="string"?p.recipe:void 0,key:String(p.key),note:h,recurrence:typeof p.recurrence=="number"?p.recurrence:void 0})}return t}parseFrontmatter(e){let t={};for(let n of e.split(`
`)){let s=n.replace(/\r$/,"").trim();if(s.length===0)continue;let i=s.indexOf(": ");if(i===-1)continue;let a=s.slice(0,i).trim(),o=s.slice(i+2).trim();o==="true"?t[a]=!0:o==="false"?t[a]=!1:/^-?\d+$/.test(o)?t[a]=Number(o):t[a]=o}return t}recurrenceKey(e){return[e.type,e.recipe??"_none_",e.key].join("|")}};var me="Agents/Huginn/MEMORY";function ge(){return new Date().toISOString()}var J=class{store;constructor(e){this.store=new E(e,me)}async append(e){let t={date:ge(),type:e.type,recipe:e.recipe,key:e.key,note:e.note};await this.store.append("corrections.md",t)}async getContext(e,t){let n=await this.store.readContext("corrections.md",{recipe:e,limit:t});return n.length===0?{text:""}:{text:`Previous mistakes to avoid:
${n}`}}async promoted(e=4){return this.store.summarizeRecurrence("corrections.md",e)}},B=class{store;constructor(e){this.store=new E(e,me)}async append(e){let t={date:ge(),type:e.type,key:e.key,note:e.note};await this.store.append("user.md",t)}async getContext(e){let t=await this.store.readContext("user.md",{limit:e});return t.length===0?{text:""}:{text:`Things the user has told you:
${t}`}}},G=class{store;constructor(e){this.store=new E(e,me)}async append(e){let t={date:ge(),type:"chat-summary",key:e.key,note:e.note};await this.store.append("chat-summaries.md",t)}async getContext(e){let t=await this.store.readContext("chat-summaries.md",{limit:e});return t.length===0?{text:""}:{text:`Summaries of earlier conversations:
${t}`}}};var T=require("obsidian"),W=class{constructor(e,t){this.vault=e;this.dir=t}vault;dir;async listRecipes(){let e=(0,T.normalizePath)(this.dir),t=this.vault.getAbstractFileByPath(e);return t===null||!(t instanceof T.TFolder)?(console.warn("[Huginn] recipe folder not found in vault index:",e),[]):t.children.filter(n=>n instanceof T.TFile).filter(n=>n.extension==="md").map(n=>n.path).sort()}async readRecipe(e){let t=(0,T.normalizePath)(e),n=this.vault.getAbstractFileByPath(t);if(n===null)throw new Error(`Recipe not found: ${e}`);return this.vault.cachedRead(n)}};function Oe(r,e){let t=[],n=lt(r);if(n===void 0)return t.push("Missing YAML frontmatter block"),{ok:!1,errors:t};let s=ct(n,t),i=ut(r),a=pt(i.get("trigger"),t),o=ht(i.get("inputs"),t),c=$e(i.get("instructions"),"Instructions",t),l=dt(i.get("output contract"),t),u=$e(i.get("apply method"),"Apply Method",t),h=ft(i.get("apply params"),t),p=mt(i.get("validation"),t),m=gt(i.get("chat render"),t);return t.length>0?{ok:!1,errors:t}:{ok:!0,recipe:{metadata:s,trigger:a,inputs:o,instructions:c,outputSchema:l,applyMethod:u,applyParams:h,validation:p,chatRender:m},errors:t}}function lt(r){let e=r.trim();if(!e.startsWith("---"))return;let t=e.indexOf("---",3);if(t!==-1)return e.slice(3,t).trim()}function ct(r,e){let t=r.split(`
`).map(s=>s.replace(/\r$/,"")),n={};for(let s of t){let i=s.indexOf(":");if(i===-1)continue;let a=s.slice(0,i).trim(),o=s.slice(i+1).trim();a==="name"?n.name=o:a==="version"?n.version=o:a==="modelTier"?n.modelTier=o:a==="riskClass"&&(n.riskClass=o)}if((!n.name||n.name.length===0)&&e.push("Metadata missing name"),(!n.version||n.version.length===0)&&e.push("Metadata missing version"),(!n.modelTier||!["fast","capable"].includes(n.modelTier))&&e.push("Metadata missing or invalid modelTier (fast | capable)"),(!n.riskClass||!["read-only","suggest"].includes(n.riskClass))&&e.push("Metadata missing or invalid riskClass (read-only | suggest)"),!(e.length>0))return n}function ut(r){let e=new Map,t=r.replace(/^---[\s\S]*?---\n?/,""),n=/^#\s+(.+)$/m,s=null,i=[];function a(){s!==null&&(e.set(s.toLowerCase().trim(),i.join(`
`).trim()),i.length=0)}for(let o of t.split(`
`)){let c=o.replace(/\r$/,""),l=n.exec(c);if(l){a(),s=l[1].trim();continue}s!==null&&i.push(c)}return a(),e}function pt(r,e){if(!r||r.length===0){e.push("Missing # Trigger section");return}return{description:r}}function ht(r,e){if(!r||r.length===0)return[];let t=[],n=Ne(r);for(let s of n){let i=b(s,"key"),a=b(s,"description"),o=b(s,"source"),c=b(s,"queryKey");if(!i||!a){e.push(`Invalid input entry (missing key or description): ${s.slice(0,40)}`);continue}if(!o||!["query","path","vocabulary","constant","recipe-param","content"].includes(o)){e.push(`Invalid input source for ${i}: ${o}`);continue}let l={key:i,description:a,source:o};o==="query"&&c&&(l.queryKey=c),t.push(l)}return t}function $e(r,e,t){if(!r||r.trim().length===0){t.push(`Missing or empty # ${e} section`);return}return r.trim()}function dt(r,e){if(!r||r.length===0){e.push("Missing # Output Contract section");return}let t;try{t=JSON.parse(r)}catch(s){e.push(`Output Contract is not valid JSON: ${s.message}`);return}let n=fe(t,"outputSchema",e);if(!n||n.type!=="object"){e.push("Output Contract root must be an object schema");return}return n}function mt(r,e){if(!r||r.length===0)return[];let t=[],n=Ne(r);for(let s of n){let i=b(s,"primitive"),a=b(s,"path"),o=b(s,"description");if(b(s,"source")||b(s,"check")){e.push(`Validation uses deprecated 'source'/'check' fields; use 'primitive' instead: ${s.slice(0,60)}`);continue}if(!i||!a){e.push(`Invalid validation entry (missing primitive or path): ${s.slice(0,60)}`);continue}let c=b(s,"params"),l={};if(c)try{l=JSON.parse(c)}catch(h){e.push(`Invalid validation params for ${a}: ${h.message}`);continue}let u={primitive:i,path:a};o&&(u.description=o),Object.keys(l).length>0&&(u.params=l),t.push(u)}return t}function gt(r,e){if(!r||r.trim().length===0)return;let t=b(r,"template"),n=b(r,"field"),s=b(r,"message");if(!t||!["paragraph","numbered-list","bulleted-list","json"].includes(t)){e.push("Invalid or missing chat render template (paragraph | numbered-list | bulleted-list | json)");return}if(!n||n.length===0){e.push("Chat render requires a 'field' path into the output object");return}return{template:t,field:n,message:s}}function ft(r,e){if(!(!r||r.trim().length===0))try{return JSON.parse(r)}catch(t){e.push(`Apply Params is not valid JSON: ${t.message}`);return}}function fe(r,e,t){if(r===null||typeof r!="object"||Array.isArray(r)){t.push(`Schema at ${e} must be an object`);return}let n=r,s=n.type;if(typeof s!="string"||!yt(s)){t.push(`Schema at ${e} missing or invalid type`);return}let i={type:s,description:typeof n.description=="string"?n.description:void 0,enum:Array.isArray(n.enum)?n.enum:void 0};switch(s){case"string":return i;case"number":return i;case"boolean":return i;case"array":{if(!n.items||typeof n.items!="object"||Array.isArray(n.items)){t.push(`Schema at ${e} array missing items`);return}let a=fe(n.items,`${e}.items`,t);return a?{...i,items:a}:void 0}case"object":{let a={};if(n.properties&&typeof n.properties=="object"&&!Array.isArray(n.properties)){let c=n.properties;for(let[l,u]of Object.entries(c)){let h=fe(u,`${e}.${l}`,t);if(!h)return;a[l]=h}}let o=Array.isArray(n.required)?n.required.filter(c=>typeof c=="string"):void 0;return{...i,properties:a,required:o}}}}function yt(r){return["string","number","boolean","array","object"].includes(r)}function Ne(r){let e=[],t=r.split(`
`).map(s=>s.replace(/\r$/,"")),n=[];for(let s of t)if(s.startsWith("- "))n.length>0&&e.push(n.join(`
`).trim()),n=[s.slice(2).trim()];else{if(s.trim().length===0)continue;n.length>0&&n.push(s)}return n.length>0&&e.push(n.join(`
`).trim()),e}function b(r,e){let t=r.split(`
`).map(n=>n.replace(/\r$/,""));for(let n=0;n<t.length;n++){let s=t[n],i=s.indexOf(":");if(i===-1||s.slice(0,i).trim()!==e)continue;let o=s.slice(i+1).trim();if(o.startsWith("|")){let c=[],l=n+1;for(;l<t.length&&(t[l].startsWith("  ")||t[l].startsWith("	"));)c.push(t[l].replace(/^[ \t]+/,"")),l++;return c.join(`
`).trim()}return o}}async function Ee(r){let e=await r.listRecipes(),t=[],n=[];for(let s of e)if(s.endsWith(".md"))try{let i=await r.readRecipe(s),a=Oe(i,s);if(!a.ok){n.push(`Recipe ${s}: ${a.errors.join("; ")}`);continue}t.push({...a.recipe,sourcePath:s})}catch(i){n.push(`Recipe ${s}: read failed \u2014 ${i.message}`)}return{ok:n.length===0,recipes:t,errors:n}}var Le=[{fileName:"tag-assignment.md",content:`---
name: tag-assignment
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants a tag suggestion for a note that lacks one.

# Inputs
- key: targetPath
  description: Path to the note needing a tag
  source: recipe-param
- key: vocabulary
  description: Existing tag vocabulary with file and chunk counts
  source: vocabulary
- key: relatedChunks
  description: Semantically related chunks and their tags
  source: path
- key: titleQuery
  description: Text to search for related notes
  source: recipe-param
- key: relatedTextHits
  description: Notes found by text search for the titleQuery
  source: query
  queryKey: titleQuery

# Instructions
You are a tag assistant. Given a vault note, propose exactly one tag.
Prefer tags that already exist in the vault vocabulary. Only propose a new
tag if none of the existing tags are a reasonable fit.

Target note path: {{targetPath}}

Existing tag vocabulary (JSON):
{{vocabulary}}

Related chunks from semantic search (JSON):
{{relatedChunks}}

Related notes from text search (JSON):
{{relatedTextHits}}

Return a JSON object with three fields only:
- tag: the proposed tag string
- reason: one sentence explaining the choice
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["tag", "reason", "confidence"],
  "properties": {
    "tag": { "type": "string" },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-frontmatter-array

# Apply Params
{
  "key": "tags",
  "valuePath": "tag"
}

# Validation
- primitive: frontmatter-not-contains
  path: /tag
  description: The proposed tag must not already be in the target note's frontmatter tags.
  params: {"key":"tags"}
`},{fileName:"title-suggestion.md",content:`---
name: title-suggestion
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants a better title for a note.

# Inputs
- key: targetPath
  description: Path to the note to rename
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content
- key: vocabulary
  description: Existing tag vocabulary with file and chunk counts
  source: vocabulary

# Instructions
You are a title assistant. Given a vault note, propose exactly one better title.
The title should be concise, descriptive, and use normal file-title casing.

Target note path: {{targetPath}}

Note content:
{{content}}

Existing tag vocabulary (JSON):
{{vocabulary}}

Return a JSON object with three fields only:
- title: the proposed title string (without file extension)
- reason: one sentence explaining the choice
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["title", "reason", "confidence"],
  "properties": {
    "title": { "type": "string" },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
set-first-heading

# Apply Params
{
  "valuePath": "title"
}

# Validation
`},{fileName:"link-suggestion.md",content:`---
name: link-suggestion
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants wikilink suggestions to insert into a note.

# Inputs
- key: targetPath
  description: Path of the note receiving links
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content
- key: relatedChunks
  description: Semantically related notes and their snippets
  source: path
- key: titleQuery
  description: Text to search for related notes
  source: recipe-param
- key: relatedTextHits
  description: Notes found by text search for the titleQuery
  source: query
  queryKey: titleQuery

# Instructions
You are a link assistant. Given a vault note, suggest up to five existing vault
notes that the note should link to. Prefer notes that are explicitly related
in content. Only suggest notes that actually exist in the vault.

Target note path: {{targetPath}}

Note content:
{{content}}

Related notes from semantic search (JSON):
{{relatedChunks}}

Related notes from text search (JSON):
{{relatedTextHits}}

Return a JSON object with two fields only:
- links: an array of vault paths to link to, e.g. ["notes/alpha.md", "notes/beta.md"]
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["links", "confidence"],
  "properties": {
    "links": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-section

# Apply Params
{
  "valuePath": "links",
  "heading": "Related",
  "itemTemplate": "- [[{{value}}]]"
}

# Validation
`},{fileName:"task-extraction.md",content:`---
name: task-extraction
version: 0.1.0
modelTier: capable
riskClass: read-only
---

# Trigger
User wants implied TODOs generated from a note's prose.

# Inputs
- key: targetPath
  description: Path of the note to scan for implied tasks
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content
- key: verbosity
  description: How verbose the returned TODOs should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
You are a task assistant. Read the note below and generate up to ten *implied*
actionable TODOs. These are not existing Obsidian task lines; they are actions a
reader would infer from the prose. Keep each TODO concise and phrased as a task.

Important: this recipe does NOT extract existing Obsidian \`- [ ]\` tasks. It
synthesizes new TODOs the reader should consider after reading the note.

Target note path: {{targetPath}}

Note content:
{{content}}

Verbosity: {{verbosity}}

If verbosity is "verbose", include a short parenthetical rationale for each TODO
explaining why it follows from the note. If verbosity is "minimal" or "normal",
return only the task text.

Return a JSON object with two fields only:
- todos: an array of TODO item strings
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["todos", "confidence"],
  "properties": {
    "todos": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: numbered-list
field: todos
message: No actionable TODOs found.

# Validation
`},{fileName:"note-summary.md",content:`---
name: note-summary
version: 0.1.0
modelTier: fast
riskClass: read-only
---

# Trigger
User wants a concise summary of a note.

# Inputs
- key: targetPath
  description: Path of the note to summarize
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content

# Instructions
You are a summarization assistant. Read the note below and produce a concise
summary of its main ideas in 1-3 sentences. Do not add commentary.

Target note path: {{targetPath}}

Note content:
{{content}}

Return a JSON object with two fields only:
- summary: the concise paragraph summary
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["summary", "confidence"],
  "properties": {
    "summary": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: paragraph
field: summary
message: No summary available.

# Validation
`},{fileName:"related-notes.md",content:`---
name: related-notes
version: 0.1.0
modelTier: fast
riskClass: read-only
---

# Trigger
User wants existing vault notes that are related to a target note.

# Inputs
- key: targetPath
  description: Path of the note to find related notes for
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content
- key: relatedChunks
  description: Semantically related notes and their snippets
  source: path
- key: titleQuery
  description: Text to search for related notes
  source: recipe-param
- key: relatedTextHits
  description: Notes found by text search for the titleQuery
  source: query
  queryKey: titleQuery

# Instructions
You are a related-notes assistant. Given a vault note, suggest up to five
existing vault notes that are related in content. Only suggest notes that
actually exist in the vault.

Target note path: {{targetPath}}

Note content:
{{content}}

Related notes from semantic search (JSON):
{{relatedChunks}}

Related notes from text search (JSON):
{{relatedTextHits}}

Return a JSON object with two fields only:
- notes: an array of vault paths, e.g. ["notes/alpha.md", "notes/beta.md"]
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["notes", "confidence"],
  "properties": {
    "notes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: bulleted-list
field: notes
message: No related notes found.

# Validation
`}];var Y="Agents/Huginn/SKILLS";async function ye(r,e={}){let t={installed:0,skipped:0,overwritten:0,errors:[]};if(!r.getAbstractFileByPath(Y))try{await r.createFolder(Y)}catch(s){return t.errors.push(`Failed to create ${Y}: ${s.message}`),t}for(let s of Le){let i=`${Y}/${s.fileName}`,a=r.getAbstractFileByPath(i);if(a&&!e.force){t.skipped++;continue}try{a?(await r.modify(a,s.content),t.overwritten++):(await r.create(i,s.content),t.installed++)}catch(o){t.errors.push(`Failed to write ${i}: ${o.message}`)}}return t}var P=require("obsidian");var _=class extends P.Modal{recipes;chosen=null;targetPath="";onConfirm;constructor(e,t,n,s){super(e),this.recipes=t,this.targetPath=n,this.onConfirm=s,t.length>0&&(this.chosen=t[0])}onOpen(){let{contentEl:e}=this;if(e.empty(),e.createEl("h2",{text:"Huginn: Run skill"}),this.recipes.length===0){e.createEl("p",{text:"No recipes found."});return}new P.Setting(e).setName("Recipe").setDesc("Choose the skill recipe to run.").addDropdown(t=>{for(let n of this.recipes)t.addOption(n.sourcePath,n.metadata.name);t.setValue(this.chosen?.sourcePath??""),t.onChange(n=>{this.chosen=this.recipes.find(s=>s.sourcePath===n)??null})}),new P.Setting(e).setName("Target note path").setDesc("Vault path of the note to run the skill against.").addText(t=>{t.setPlaceholder("notes/gamma.md"),t.setValue(this.targetPath),t.onChange(n=>{this.targetPath=n})}),new P.Setting(e).addButton(t=>{t.setButtonText("Run"),t.setCta(),t.onClick(()=>{if(this.chosen===null){new P.Notice("Please select a recipe.");return}let n=x(this.targetPath);if(n.length===0){new P.Notice("Please enter a target note path.");return}this.close(),this.onConfirm({recipe:this.chosen,targetPath:n})})})}onClose(){this.chosen===null&&this.onConfirm(null);let{contentEl:e}=this;e.empty()}};var K=class{opts;constructor(e){this.opts=e}async createSession(){let{path:e,content:t}=await this.readActiveNote(),n=await this.buildSystemPrompt(e,t);return{messages:n?[{role:"system",content:n}]:[],activeNotePath:e,activeNoteContent:t}}async sendMessage(e,t,n){let s=[...e.messages,{role:"user",content:t}],i=await this.opts.llmClient.chat(s,n);if(i===null)return{response:null,updatedSession:e};let a={role:"assistant",content:i};return{response:i,updatedSession:{...e,messages:[...s,a]}}}async summarizeChat(e,t){let n=e.map(i=>`${i.role==="user"?"User":"Huginn"}: ${i.content}`).join(`

`),s=[{role:"system",content:"You are a concise conversation summarizer. You will be given a transcript of a user/assistant chat. Produce a short paragraph summary of facts, decisions, and context the user would want to recall in future chats. Return only the summary, with no preamble, role labels, or markdown fences."},{role:"user",content:`Summarize this conversation:

${n}`}];return this.opts.llmClient.chat(s,t)}async readActiveNote(){let e=this.opts.app.workspace.getActiveFile();if(!e||typeof e!="object"||!("path"in e))return{path:null,content:null};try{let t=await this.opts.app.vault.cachedRead(e);return{path:e.path,content:t}}catch(t){return console.warn("[Huginn] failed to read active note:",t.message),{path:e.path,content:null}}}async buildSystemPrompt(e,t){let n=["You are Huginn, an AI assistant embedded in Obsidian as a vault-aware chat companion.","","Your job is to help the user with their notes and general knowledge. Be concise but useful."];if(this.opts.getUserMemoryContext){let s=await this.opts.getUserMemoryContext();s.length>0&&n.push("","CRITICAL \u2014 you MUST follow these user preferences and facts. They override any default guideline below:",s)}if(this.opts.getChatSummaryContext){let s=await this.opts.getChatSummaryContext();s.length>0&&n.push("","CRITICAL \u2014 remember these summaries of earlier conversations:",s)}return n.push("","Guidelines:","- The user is looking at an Obsidian note. Use the note content below when the question is about it.","- If the question is not about the active note, answer from general knowledge rather than inventing a connection.","- Prefer short, actionable answers. Use markdown formatting (headings, lists, code fences) when it improves readability.","- Do not claim the note says something it does not. If the note lacks the answer, say so.","- You cannot rename, move, delete, or otherwise modify files unless the user explicitly asks you to run a skill."),e&&t?n.push("",`Active note path: ${e}`,"","Note content:","---",t,"---"):n.push("","No active note is currently open. Answer from general knowledge."),n.join(`
`)}};var Q=class{constructor(e){this.opts=e}opts;async dispatch(e,t,n){let s=await this.buildDispatchMessages(e,t),i=await this.opts.llmClient.chat(s,n);return i===null?{intent:null,raw:null}:{intent:this.parseDispatch(i),raw:i}}async buildDispatchMessages(e,t){let n=this.opts.getRecipes().map(a=>`- ${a.metadata.name}: ${a.trigger.description}`).join(`
`),s=this.opts.corrections?await this.opts.corrections.getContext(void 0,5):{text:""};return[{role:"system",content:["You are Huginn, a dispatcher inside Obsidian. The user has typed a request in a chat panel.","Your job is to choose the best matching skill from the list below, and to identify which vault note the skill should target.","","Available skills:",n,"","Rules:","- Return ONLY a raw JSON object with three fields: recipeName, targetPath, reason.","- recipeName must exactly match one of the available skill names.",`- targetPath should be a vault-relative note path ending in .md. If the user does not name a note, use "${t??"no active note"}" as the fallback target path.`,"- reason should be one sentence explaining why you chose this skill.",'- If no skill matches the request, return {"recipeName":"", "targetPath":"", "reason":"No matching skill."}.',"- Do not return markdown, commentary, or code fences.",s.text.length>0?`
${s.text}`:""].join(`
`)},{role:"user",content:e}]}parseDispatch(e){let t=e.trim(),n=t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);n&&(t=n[1].trim());try{let s=JSON.parse(t);return typeof s.recipeName!="string"||typeof s.targetPath!="string"||typeof s.reason!="string"||s.recipeName.length===0||!this.opts.getRecipes().find(a=>a.metadata.name===s.recipeName)?null:{recipeName:s.recipeName,targetPath:s.targetPath,reason:s.reason}}catch{return null}}};var ee=require("obsidian");function X(){return{messages:[],activeNotePath:null,activeNoteContent:null}}function vt(r){if(r===null||typeof r!="object")return!1;let e=r;return(e.role==="system"||e.role==="user"||e.role==="assistant")&&typeof e.content=="string"}function je(r){if(r===null||typeof r!="object")return null;let e=r,t=X();return typeof e.activeNotePath=="string"&&(t.activeNotePath=e.activeNotePath),(typeof e.activeNoteContent=="string"||e.activeNoteContent===null)&&(t.activeNoteContent=e.activeNoteContent),Array.isArray(e.messages)&&(t.messages=e.messages.filter(vt)),t}var wt=[{type:"remember",regex:/^\s*remember\b\s*(?:that\s*)?(.+)$/is}];function Ie(r){let e=r.trim();if(e.length===0)return null;for(let{type:t,regex:n}of wt){let s=e.match(n);if(s&&s[1]){let i=s[1].trim().replace(/\.$/,""),a=i.slice(0,120);return{type:t,key:a,note:i}}}return null}var q="huginn-chat",Z=class extends ee.ItemView{services;session;container=null;messagesContainer=null;inputEl=null;sendButton=null;contextEl=null;isLoading=!1;abortController=null;activeLeafChangeRef=null;get verbosity(){return this.services.getSettings().reportBackVerbosity}constructor(e,t){super(e),this.services=t,this.session=X()}get harness(){return this.services.getHarness()}getViewType(){return q}getDisplayText(){return"Huginn Chat"}getIcon(){return"message-square"}async onOpen(){this.container=this.contentEl.createDiv({cls:"huginn-chat-view"}),this.render(),await this.refreshContext(),this.activeLeafChangeRef=this.app.workspace.on("active-leaf-change",()=>{this.refreshContext(!1)})}async onClose(){this.activeLeafChangeRef&&(this.app.workspace.offref(this.activeLeafChangeRef),this.activeLeafChangeRef=null),this.container?.empty()}getState(){return{messages:[],activeNotePath:null,activeNoteContent:null}}async setState(e,t){je(e)!==null&&(this.session=X(),this.applySessionToDom(),window.setTimeout(()=>{this.refreshContext()},0))}render(){if(!this.container)return;this.container.empty();let e=this.container.createEl("div",{cls:"huginn-chat-header"});this.contextEl=e.createEl("div",{cls:"huginn-chat-context"}),e.createEl("button",{cls:"huginn-chat-refresh",text:"Refresh context"}).addEventListener("click",()=>{this.refreshContext(!1)}),e.createEl("button",{cls:"huginn-chat-remember",text:"Remember chat"}).addEventListener("click",()=>{this.rememberChat()}),e.createEl("button",{cls:"huginn-chat-reset",text:"New chat"}).addEventListener("click",()=>{this.resetChat()}),this.messagesContainer=this.container.createEl("div",{cls:"huginn-chat-messages"});let i=this.container.createEl("div",{cls:"huginn-chat-input-container"});this.inputEl=i.createEl("textarea",{cls:"huginn-chat-input",placeholder:"Ask about the active note..."}),this.inputEl.addEventListener("keydown",a=>{a.key==="Enter"&&!a.shiftKey&&(a.preventDefault(),this.handleSend())}),this.sendButton=i.createEl("button",{text:"Send",cls:"mod-cta huginn-chat-send"}),this.sendButton.addEventListener("click",()=>{this.handleSend()}),this.applySessionToDom(),this.inputEl.focus()}async refreshContext(e=!0){let t=await this.services.controller.createSession();if(e)this.session=t;else{let n=this.session.messages.filter(s=>s.role!=="system");this.session={...t,messages:[...t.messages,...n]}}this.applySessionToDom()}applySessionToDom(){if(!(!this.contextEl||!this.messagesContainer)){this.contextEl.empty(),this.session.activeNotePath?this.contextEl.createEl("small",{text:`Active note: ${this.session.activeNotePath}`}):this.contextEl.createEl("small",{text:"No active note open."}),this.messagesContainer.empty();for(let e of this.session.messages)e.role!=="system"&&this.renderMessage(e.role,e.content)}}async handleSend(){if(!this.inputEl)return;let e=this.inputEl.value.trim();if(e.length===0)return;if(this.abortController){console.log("[Huginn chat] Stop clicked; aborting in-flight request."),this.abortController.abort(),$.closeActive();return}if(this.isLoading){this.setLoading(!1);return}let t=Ie(e);if(t){let n=this.services.getMemory?.().user??null;n?(await n.append(t),this.appendMessage("assistant",`Memory saved: ${t.type} \u2014 ${t.note}`)):this.appendMessage("assistant","Memory storage is not available yet."),this.inputEl.value="";return}this.abortController=new AbortController,this.setLoading(!0),this.renderMessage("user",e),this.inputEl.value="";try{let n=await this.services.dispatcher.dispatch(e,this.session.activeNotePath,this.abortController.signal);if(this.abortController.signal.aborted)return;let s=n.intent,i=s?this.services.getRecipes().find(a=>a.metadata.name===s.recipeName)??null:null;if(s&&i){if(this.abortController.signal.aborted)return;await this.runSkillFromChat(e,s,i,n)}else await this.runPlainChat(e)}finally{this.abortController=null,this.setLoading(!1),this.scrollToBottom()}}async runPlainChat(e){let t=await this.services.controller.sendMessage(this.session,e,this.abortController?.signal);this.session=t.updatedSession,t.response===null?this.renderMessage("assistant","[No response from model]"):this.renderMessage("assistant",t.response)}async runSkillFromChat(e,t,n,s){let i=this.harness;if(!i){this.appendMessage("assistant","Huginn harness is not ready yet. Is Muninn installed and enabled?");return}this.session.messages.push({role:"user",content:e}),this.verbosity!=="minimal"&&this.appendMessage("assistant",`Running ${n.metadata.name} on ${t.targetPath}...`);let a=x(t.targetPath),o=await i.run(n,{targetPath:a,titleQuery:n.metadata.name,verbosity:this.verbosity},{},this.abortController?.signal);if(this.abortController?.signal.aborted){this.appendMessage("assistant","[Interrupted]");return}if(!o.schemaValid){let c=o.schemaErrors.map(l=>l.message).join("; ");this.appendMessage("assistant",`Skill failed: ${c}`);return}if(!o.groundTruthValid){let c=o.groundTruthErrors.map(l=>l.message).join("; ");this.appendMessage("assistant",`The suggestion from ${n.metadata.name} is already reflected in the vault (${c}). No change needed.`);return}await this.renderRunResult(n,o)}async renderRunResult(e,t){if(e.applyMethod==="noop"){this.renderReadOnlyResult(e,t);return}if(t.applyResult?.applied)this.appendMessage("assistant",t.applyResult.message);else if(t.applyResult){let n=this.verbosity==="minimal"?"Skill could not be applied.":`Skill could not be applied: ${t.applyResult.message}`;this.appendMessage("assistant",n)}else t.approved===!1?this.appendMessage("assistant","Skill suggestion was rejected."):this.appendMessage("assistant","```json\n"+JSON.stringify(t.parsedOutput.json,null,2)+"\n```")}resetChat(){this.session={...this.session,messages:this.session.messages.filter(e=>e.role==="system")},this.applySessionToDom()}async rememberChat(){let e=this.services.getMemory?.().summary??null;if(e===null){this.renderMessage("assistant","Memory storage is not available yet.");return}let t=this.session.messages.filter(n=>n.role!=="system");if(t.length===0){this.appendMessage("assistant","Nothing to remember yet.");return}if(this.abortController){this.abortController.abort();return}if(this.isLoading){this.setLoading(!1);return}this.abortController=new AbortController,this.setLoading(!0),this.appendMessage("assistant","Saving chat summary...");try{let n=await this.services.controller.summarizeChat(t,this.abortController.signal);if(n===null||n.trim().length===0){this.appendMessage("assistant","Could not generate a chat summary.");return}await e.append({key:this.session.activeNotePath??"general chat",note:n.trim()}),this.appendMessage("assistant","Chat summary saved.")}catch(n){console.warn("[Huginn chat] Remember chat failed:",n.message),this.appendMessage("assistant",`Could not save chat summary: ${n.message}`)}finally{this.abortController=null,this.setLoading(!1),this.scrollToBottom()}}renderReadOnlyResult(e,t){let n=t.parsedOutput.json,s=e.chatRender;if(!s){this.appendMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```");return}let i=O(n,s.field);if(s.template==="paragraph"&&typeof i=="string"){this.appendMessage("assistant",i);return}if((s.template==="numbered-list"||s.template==="bulleted-list")&&Array.isArray(i)){let a=i;if(a.length===0){this.appendMessage("assistant",s.message??"No items found.");return}let o=s.template==="numbered-list"?c=>`${c+1}. `:()=>"- ";this.appendMessage("assistant",a.map((c,l)=>`${o(l)}${c}`).join(`
`));return}if(s.template==="json"){this.appendMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```");return}this.appendMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```")}renderMessage(e,t){if(!this.messagesContainer)return;let n=this.messagesContainer.createEl("div",{cls:`huginn-chat-message huginn-chat-message-${e}`});n.createEl("div",{cls:"huginn-chat-message-role",text:e==="user"?"You":"Huginn"});let s=n.createEl("div",{cls:"huginn-chat-message-body"});e==="assistant"?ee.MarkdownRenderer.render(this.app,t,s,this.session.activeNotePath??"",this):s.innerText=t}appendMessage(e,t){this.session.messages.push({role:e,content:t}),this.renderMessage(e,t)}setLoading(e){this.isLoading=e,this.sendButton&&(this.sendButton.textContent=this.abortController?"Stop":"Send")}scrollToBottom(){this.messagesContainer&&(this.messagesContainer.scrollTop=this.messagesContainer.scrollHeight)}};var kt="muninn",te="Agents/Huginn/SKILLS",Rt=500,bt=3e4,ne=class extends d.Plugin{settings={...U};muninnApi=null;harness=null;chatClient=null;recipes=[];correctionsMemory=null;userMemory=null;chatSummaryMemory=null;async onload(){try{let e=await this.loadData();this.settings=we(e)}catch(e){console.warn("[Huginn] failed to load settings, using defaults:",e),this.settings={...U}}this.addSettingTab(new ve(this.app,this)),this.addCommand({id:"run-skill",name:"Run Huginn skill",callback:()=>{this.runSkill()}}),this.addCommand({id:"open-chat",name:"Open Huginn chat",callback:()=>{this.openChat()}}),this.addCommand({id:"install-default-recipes",name:"Install default Huginn skills",callback:()=>{this.installDefaultRecipes(!1)}}),this.addCommand({id:"reset-default-recipes",name:"Reset default Huginn skills",callback:()=>{this.installDefaultRecipes(!0)}}),this.registerView(q,e=>new Z(e,this.createChatViewServices())),this.addRibbonIcon("message-square","Huginn chat",()=>{this.openChat()}),this.app.workspace.onLayoutReady(()=>{this.awaitMuninnReady().then(async e=>{if(e===null){new d.Notice("Huginn requires Muninn to be installed and enabled.");return}this.muninnApi=e,this.chatClient=new A({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs});let t=new H(this.app.vault);this.correctionsMemory=new J(t),this.userMemory=new B(t),this.chatSummaryMemory=new G(t),this.harness=new L({llmClient:this.chatClient,inputGatherer:new V({api:e,app:this.app}),approvalGate:new I(this.app),applyRegistry:ue(Ve(this.app)),groundTruthValidator:new D(he(),new F(this.app)),corrections:this.correctionsMemory});let n=await ye(this.app.vault,{force:!1});n.installed>0&&new d.Notice(`Huginn installed ${n.installed} default skill recipe(s) in ${te}`),n.errors.length>0&&console.warn("[Huginn] recipe seed errors:",n.errors),await this.loadRecipes(),this.registerRecipeFolderWatcher(),console.log("[Huginn] harness initialized against Muninn API"),this.settings.warmupOnFocus&&this.warmupChatModel()})})}registerRecipeFolderWatcher(){let e=`${te}`;this.registerEvent(this.app.vault.on("create",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("modify",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("delete",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("rename",(t,n)=>{(t.path.startsWith(e)||n.startsWith(e))&&this.loadRecipes()}))}async awaitMuninnReady(){let e=Date.now(),t=e+bt,n=!1;for(;Date.now()<t;){let i=this.discoverMuninnApi();if(i!==null)return i;!n&&Date.now()>e+5e3&&(console.log("[Huginn] still waiting for Muninn to become ready..."),n=!0),await new Promise(a=>window.setTimeout(a,Rt))}let s=this.discoverMuninnApi();return s===null&&console.warn("[Huginn] Muninn did not become ready within 30s. Is it installed and enabled?"),s}async warmupChatModel(){if(this.harness!==null){console.log("[Huginn] warming up chat model...");try{await this.harness.warmup(),console.log("[Huginn] chat model warmup complete")}catch(e){console.warn("[Huginn] chat model warmup failed:",e.message)}}}discoverMuninnApi(){let t=this.app.plugins?.plugins?.[kt];return!t||typeof t.getMuninnApi!="function"?null:t.getMuninnApi()}async runSkill(){if(this.harness===null||this.muninnApi===null){let t=this.discoverMuninnApi();if(t===null){new d.Notice("Huginn harness is not ready. Is Muninn installed and enabled?");return}this.muninnApi=t;let n=new H(this.app.vault),s=this.correctionsMemory??new J(n);this.correctionsMemory=s,this.userMemory=this.userMemory??new B(n),this.chatSummaryMemory=this.chatSummaryMemory??new G(n),this.harness=new L({llmClient:new A({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs}),inputGatherer:new V({api:t,app:this.app}),approvalGate:new I(this.app),applyRegistry:ue(Ve(this.app)),groundTruthValidator:new D(he(),new F(this.app)),corrections:s})}let e=await this.loadRecipes();if(e.length===0){new d.Notice(`No recipes found in ${te}`);return}new _(this.app,e,this.settings.defaultTargetPath,t=>{t!==null&&this.runChosenRecipe(t.recipe,t.targetPath)}).open()}async loadRecipes(){let e=new W(this.app.vault,te),t=await Ee(e);return t.errors.length>0&&console.warn("[Huginn] recipe load errors:",t.errors),this.recipes=t.recipes,this.recipes}async runChosenRecipe(e,t){console.log("[Huginn] running recipe:",e.metadata.name,"target:",t);let n=await this.harness.run(e,{targetPath:t,titleQuery:e.metadata.name},{});console.log("[Huginn] recipe result:",n)}openChat(){this.openChatView()}createChatViewServices(){let e=this.chatClient??new A({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs}),t=()=>this.recipes,n=()=>this.harness,s=()=>this.settings,i=()=>({corrections:this.correctionsMemory,user:this.userMemory,summary:this.chatSummaryMemory});return{controller:new K({app:this.app,llmClient:e,getUserMemoryContext:async()=>(await this.userMemory?.getContext(5))?.text??"",getChatSummaryContext:async()=>(await this.chatSummaryMemory?.getContext(5))?.text??""}),dispatcher:new Q({llmClient:e,getRecipes:t,corrections:this.correctionsMemory??void 0}),getHarness:n,getRecipes:t,getSettings:s,getMemory:i}}async openChatView(){let e=this.app.workspace.getLeavesOfType(q)[0]??null;if(e!==null){this.app.workspace.revealLeaf(e);return}let t=this.app.workspace.getRightLeaf(!1);t!==null&&(await t.setViewState({type:q,active:!0}),this.app.workspace.revealLeaf(t))}async installDefaultRecipes(e){let t=await ye(this.app.vault,{force:e}),n=[];t.installed>0&&n.push(`${t.installed} installed`),t.skipped>0&&n.push(`${t.skipped} skipped (already present)`),t.overwritten>0&&n.push(`${t.overwritten} overwritten`),t.errors.length>0&&n.push(`${t.errors.length} errors`),new d.Notice(`Huginn default skills: ${n.join(", ")||"no changes"}`),t.errors.length>0&&console.warn("[Huginn] install default recipes errors:",t.errors),await this.loadRecipes()}};function Ve(r){return{resolveFile(e){let t=r.vault.getAbstractFileByPath(e);return t instanceof d.TFile?t:null},async readFile(e){if(!(e instanceof d.TFile))throw new Error("Invalid file");return r.vault.read(e)},async writeFile(e,t){if(!(e instanceof d.TFile))throw new Error("Invalid file");await r.vault.modify(e,t)},async processFrontMatter(e,t){if(!(e instanceof d.TFile))throw new Error("Invalid file");await r.fileManager.processFrontMatter(e,t)}}}var ve=class extends d.PluginSettingTab{plugin;constructor(e,t){super(e,t),this.plugin=t}display(){let{containerEl:e}=this;e.empty(),e.createEl("h2",{text:"Huginn Settings"}),new d.Setting(e).setName("Ollama base URL").setDesc("Base URL for the Ollama API, without trailing slash.").addText(t=>t.setPlaceholder("http://localhost:11434").setValue(this.plugin.settings.ollamaUrl).onChange(async n=>{this.plugin.settings.ollamaUrl=n.replace(/\/$/,""),await this.plugin.saveData(this.plugin.settings)})),new d.Setting(e).setName("Chat model").setDesc("Ollama model used for skill chat completions. Must be a chat-capable model, not an embedding model.").addText(t=>t.setPlaceholder("qwen3.5:4b").setValue(this.plugin.settings.ollamaChatModel).onChange(async n=>{this.plugin.settings.ollamaChatModel=n,await this.plugin.saveData(this.plugin.settings)})),new d.Setting(e).setName("Chat timeout (ms)").setDesc("Abort chat completion requests after this many milliseconds.").addText(t=>t.setPlaceholder("120000").setValue(String(this.plugin.settings.chatTimeoutMs)).onChange(async n=>{let s=Number(n);Number.isFinite(s)&&s>0&&(this.plugin.settings.chatTimeoutMs=s,await this.plugin.saveData(this.plugin.settings))})),new d.Setting(e).setName("Report-back verbosity").setDesc("How much status feedback the chat sidebar shows when running skills. Verbose is useful while testing; Minimal keeps the chat cleaner.").addDropdown(t=>t.addOption("minimal","Minimal").addOption("normal","Normal").addOption("verbose","Verbose").setValue(this.plugin.settings.reportBackVerbosity).onChange(async n=>{let s=n;(s==="minimal"||s==="normal"||s==="verbose")&&(this.plugin.settings.reportBackVerbosity=s,await this.plugin.saveData(this.plugin.settings))})),new d.Setting(e).setName("Warm up chat model on load").setDesc("Send a trivial chat request when Huginn initializes so the model is already loaded in memory. Increases VRAM/RAM use.").addToggle(t=>t.setValue(this.plugin.settings.warmupOnFocus).onChange(async n=>{this.plugin.settings.warmupOnFocus=n,await this.plugin.saveData(this.plugin.settings)})),new d.Setting(e).setName("Default target note path").setDesc("Default vault path used by the Run Huginn skill chooser.").addText(t=>t.setPlaceholder("notes/gamma.md").setValue(this.plugin.settings.defaultTargetPath).onChange(async n=>{this.plugin.settings.defaultTargetPath=n,await this.plugin.saveData(this.plugin.settings)}))}};
