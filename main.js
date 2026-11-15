"use strict";var se=Object.defineProperty;var Ge=Object.getOwnPropertyDescriptor;var Je=Object.getOwnPropertyNames;var Be=Object.prototype.hasOwnProperty;var qe=(r,e)=>{for(var t in e)se(r,t,{get:e[t],enumerable:!0})},Ue=(r,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of Je(e))!Be.call(r,s)&&s!==t&&se(r,s,{get:()=>e[s],enumerable:!(n=Ge(e,s))||n.enumerable});return r};var ze=r=>Ue(se({},"__esModule",{value:!0}),r);var Mt={};qe(Mt,{default:()=>re});module.exports=ze(Mt);var h=require("obsidian");var z={ollamaUrl:"http://localhost:11434",ollamaChatModel:"qwen3.5:4b",chatTimeoutMs:12e4,warmupOnFocus:!1,defaultTargetPath:"notes/gamma.md",reportBackVerbosity:"verbose"};function ke(r){let e={...z};if(r===null||typeof r!="object")return e;let t=r;if(typeof t.ollamaUrl=="string"&&t.ollamaUrl.length>0&&(e.ollamaUrl=t.ollamaUrl.replace(/\/$/,"")),typeof t.ollamaChatModel=="string"&&t.ollamaChatModel.length>0&&(e.ollamaChatModel=t.ollamaChatModel),typeof t.chatTimeoutMs=="number"&&Number.isFinite(t.chatTimeoutMs)&&t.chatTimeoutMs>0)e.chatTimeoutMs=t.chatTimeoutMs;else if(typeof t.chatTimeoutMs=="string"){let n=Number(t.chatTimeoutMs);Number.isFinite(n)&&n>0&&(e.chatTimeoutMs=n)}return typeof t.warmupOnFocus=="boolean"&&(e.warmupOnFocus=t.warmupOnFocus),typeof t.defaultTargetPath=="string"&&(e.defaultTargetPath=t.defaultTargetPath),(t.reportBackVerbosity==="minimal"||t.reportBackVerbosity==="normal"||t.reportBackVerbosity==="verbose")&&(e.reportBackVerbosity=t.reportBackVerbosity),e}var $=class{constructor(e){this.opts=e}opts;async complete(e,t){let n=[...this.opts.systemPrompt?[{role:"system",content:this.opts.systemPrompt}]:[],{role:"user",content:e}];return this.chat(n,t)}async chat(e,t){let n=new AbortController,s=setTimeout(()=>n.abort(),this.opts.timeoutMs??6e4),i=()=>n.abort();t?.addEventListener("abort",i);try{let o=await fetch(`${this.opts.baseUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.opts.model,messages:e,stream:!0}),signal:n.signal});if(!o.ok){let l="";try{l=await o.text()}catch{}return console.warn("[Huginn] Ollama chat HTTP",o.status,l.slice(0,1e3)),null}return await this.readStreamingResponse(o,n.signal)}catch(o){if(o.name==="AbortError"){if(t?.aborted)return null;console.warn("[Huginn] Ollama chat timed out")}else console.warn("[Huginn] Ollama chat failed:",o.message);return null}finally{t?.removeEventListener("abort",i),clearTimeout(s)}}async readStreamingResponse(e,t){if(!e.body)return null;let n=e.body.getReader(),s=new TextDecoder,i="";try{for(;;){if(t?.aborted)return await n.cancel(),null;let{done:o,value:l}=await n.read();if(o)break;let c=s.decode(l,{stream:!0});for(let a of c.split(`
`)){let p=a.trim();if(p)try{let u=JSON.parse(p);if(u.message?.content&&(i+=u.message.content),u.done)break}catch{}}}}finally{n.releaseLock()}return We(i.trim())}};function We(r){let e=r.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);return e?e[1].trim():r.trim()}function be(r,e){return{recipe:r,inputs:e}}function Ce(r,e=""){let{recipe:t,inputs:n}=r,s=new Map;for(let o of n)s.set(o.key,Ye(o.value));let i=Re(t.instructions,s);return e.length>0&&(i+=`

Previous mistakes to avoid for this skill:
${e}`),{prompt:i,outputSchemaText:Re(JSON.stringify(t.outputSchema,null,2),s)}}function Ye(r){return r==null?"":typeof r=="string"?r:JSON.stringify(r,null,2)}function Re(r,e){let t=r;for(let[n,s]of e)t=t.split(`{{${n}}}`).join(s);return t}function xe(r,e,t=""){let n=[];return ie(r,e,t,n),{ok:n.length===0,errors:n}}function ie(r,e,t,n){if(e.enum!==void 0&&!e.enum.some(s=>s===r)){n.push({path:t,message:`value not in enum ${JSON.stringify(e.enum)}`});return}switch(e.type){case"string":typeof r!="string"&&n.push({path:t,message:`expected string, got ${typeof r}`});break;case"number":(typeof r!="number"||Number.isNaN(r))&&n.push({path:t,message:`expected number, got ${typeof r}`});break;case"boolean":typeof r!="boolean"&&n.push({path:t,message:`expected boolean, got ${typeof r}`});break;case"array":if(!Array.isArray(r)){n.push({path:t,message:`expected array, got ${typeof r}`});return}for(let s=0;s<r.length;s++)ie(r[s],e.items,`${t}[${s}]`,n);break;case"object":if(r===null||typeof r!="object"||Array.isArray(r)){n.push({path:t,message:`expected object, got ${r===null?"null":typeof r}`});return}_e(r,e,t,n);break}}function _e(r,e,t,n){if(e.type!=="object")return;let s=e.required??[];for(let i of s)i in r||n.push({path:`${t}.${i}`,message:"missing required property"});if(e.properties)for(let[i,o]of Object.entries(e.properties))i in r&&ie(r[i],o,t?`${t}.${i}`:i,n)}function Se(r,e){let t=[];return Me("",r,e,t),{changes:t}}function Me(r,e,t,n){if(oe(e,t))return;let s=Pe(e),i=Pe(t);if(s!==i||s!=="object"){n.push({path:r||".",oldValue:e,newValue:t});return}let o=e,l=t,c=new Set([...Object.keys(o),...Object.keys(l)]);for(let a of c){let p=r?`${r}.${a}`:a;a in o?a in l?Me(p,o[a],l[a],n):n.push({path:p,oldValue:o[a],newValue:void 0}):n.push({path:p,oldValue:void 0,newValue:l[a]})}}function Pe(r){return r===null?"null":Array.isArray(r)?"array":typeof r}function oe(r,e){if(r===e)return!0;if(r===null||e===null||typeof r!=typeof e||typeof r!="object"||Array.isArray(r)!==Array.isArray(e))return!1;if(Array.isArray(r)){let o=r,l=e;if(o.length!==l.length)return!1;for(let c=0;c<o.length;c++)if(!oe(o[c],l[c]))return!1;return!0}let t=r,n=e,s=Object.keys(t),i=Object.keys(n);if(s.length!==i.length)return!1;for(let o of s)if(!Object.prototype.hasOwnProperty.call(n,o)||!oe(t[o],n[o]))return!1;return!0}function Te(r){if(r.changes.length===0)return"No changes.";let e=[];for(let t of r.changes)e.push(`--- ${t.path}`),e.push(`old: ${JSON.stringify(t.oldValue)}`),e.push(`new: ${JSON.stringify(t.newValue)}`);return e.join(`
`)}var ae=class{primitives=new Map;register(e){return this.primitives.set(e.name,e),this}get(e){return this.primitives.get(e)}};function le(){return new ae().register(Ke).register(Qe).register(Xe).register(Ze).register(et).register(tt)}var j=class{constructor(e,t){this.registry=e;this.vault=t}registry;vault;async validate(e,t,n){let s=[],i=[];for(let o of e.validation)await this.validateRule(e,o,t,n,s,i);return{ok:s.length===0,errors:s,drops:i}}async validateRule(e,t,n,s,i,o){let l=rt(s,t.path);if(l===void 0){i.push({path:t.path,message:"output value missing for ground-truth check"});return}let c=this.registry.get(t.primitive);if(!c){i.push({path:t.path,message:`unsupported ground-truth primitive: ${t.primitive}`});return}let a={recipe:e,output:l,inputs:n,vault:this.vault},p=nt(await c.validate(a,t.params??{}));for(let u of p.drops)o.push({path:t.path,value:u});t.description&&p.errors.length>0?i.push(...p.errors.map(u=>({path:u.path,message:`${t.description}: ${u.message}`}))):i.push(...p.errors)}},Ke={name:"file-exists",async validate({vault:r,output:e},t){let n=String(e);return r.getFileFrontmatter(n)!==null?{errors:[],drops:[]}:{errors:[{path:String(t.path??"/"),message:`file does not exist: ${n}`}],drops:[]}}},Qe={name:"file-not-exists",async validate({vault:r,output:e},t){let n=String(e);return r.getFileFrontmatter(n)!==null?{errors:[{path:String(t.path??"/"),message:`file already exists: ${n}`}],drops:[]}:{errors:[],drops:[]}}},Xe={name:"frontmatter-contains",async validate({vault:r,output:e,inputs:t},n){let s=W(t,String(n.targetPathInput??"targetPath"));if(!s)return{errors:[{path:String(n.path??"/"),message:"missing targetPath input for frontmatter check"}],drops:[]};let i=r.getFileFrontmatter(s);if(i===null)return{errors:[{path:String(n.path??"/"),message:`target file not found: ${s}`}],drops:[]};let o=String(n.key??"tags"),l=i[o];if(Array.isArray(e)){let a=$e(l);return e.map(d=>String(d)).filter(d=>!a.includes(d)).length===0?{errors:[],drops:[]}:{errors:[{path:String(n.path??"/"),message:`values not present in frontmatter key '${o}'`}],drops:[]}}return Ae(l,e)?{errors:[],drops:[]}:{errors:[{path:String(n.path??"/"),message:`value does not match frontmatter key '${o}'`}],drops:[]}}},Ze={name:"frontmatter-not-contains",async validate({vault:r,output:e,inputs:t},n){let s=W(t,String(n.targetPathInput??"targetPath"));if(!s)return{errors:[{path:String(n.path??"/"),message:"missing targetPath input for frontmatter check"}],drops:[]};let i=r.getFileFrontmatter(s);if(i===null)return{errors:[{path:String(n.path??"/"),message:`target file not found: ${s}`}],drops:[]};let o=String(n.key??"tags"),l=i[o];if(Array.isArray(e)){let a=$e(l),p=e.map(d=>String(d)),u=p.filter(d=>a.includes(d));return u.length===p.length?{errors:[{path:String(n.path??"/"),message:`values already present in frontmatter key '${o}'`}],drops:p}:{errors:[],drops:u}}return Ae(l,e)?{errors:[{path:String(n.path??"/"),message:`value already present in frontmatter key '${o}'`}],drops:[]}:{errors:[],drops:[]}}},et={name:"note-contains-text",async validate({vault:r,output:e,inputs:t},n){let s=W(t,String(n.targetPathInput??"targetPath"));if(!s)return{errors:[{path:String(n.path??"/"),message:"missing targetPath input for note text check"}],drops:[]};let i=await r.readFile(s);if(i===null)return{errors:[{path:String(n.path??"/"),message:`target file not found: ${s}`}],drops:[]};if(Array.isArray(e)){let c=e.map(a=>String(a)).filter(a=>!i.toLowerCase().includes(a.toLowerCase()));return c.length===0?{errors:[],drops:[]}:{errors:[{path:String(n.path??"/"),message:`text not found in note body: ${c.join(", ")}`}],drops:[]}}let o=String(e).toLowerCase();return i.toLowerCase().includes(o)?{errors:[],drops:[]}:{errors:[{path:String(n.path??"/"),message:`text not found in note body: ${String(e)}`}],drops:[]}}},tt={name:"note-not-contains-text",async validate({vault:r,output:e,inputs:t},n){let s=W(t,String(n.targetPathInput??"targetPath"));if(!s)return{errors:[{path:String(n.path??"/"),message:"missing targetPath input for note text check"}],drops:[]};let i=await r.readFile(s);if(i===null)return{errors:[{path:String(n.path??"/"),message:`target file not found: ${s}`}],drops:[]};if(Array.isArray(e)){let l=e.map(a=>String(a)),c=l.filter(a=>i.toLowerCase().includes(a.toLowerCase()));return c.length===l.length?{errors:[{path:String(n.path??"/"),message:`text already present in note body: ${c.join(", ")}`}],drops:l}:{errors:[],drops:c}}let o=String(e).toLowerCase();return i.toLowerCase().includes(o)?{errors:[{path:String(n.path??"/"),message:`text already present in note body: ${String(e)}`}],drops:[]}:{errors:[],drops:[]}}};function W(r,e){let n=r.find(s=>s.key===e)?.value;return typeof n=="string"?n:void 0}function nt(r){return Array.isArray(r)?{errors:r,drops:[]}:r}function rt(r,e){if(e===""||e==="/")return r;let t=e.replace(/^\//,"").split("/"),n=r;for(let s of t){if(n===null||typeof n!="object"||Array.isArray(n))return;n=n[s]}return n}function Ae(r,e){return r==null?!1:Array.isArray(r)?r.some(t=>t===e):r===e}function $e(r){return r==null?[]:Array.isArray(r)?r.map(e=>String(e)):[String(r)]}function Oe(r,e){if(e.length===0)return r;let t=JSON.parse(JSON.stringify(r??null));for(let n of e){let s=n.path.replace(/^\//,"").split("/").filter(c=>c.length>0);if(s.length===0)continue;let i=s[s.length-1],o=t;for(let c of s.slice(0,-1)){let a=o?.[c];o=typeof a=="object"&&a!==null&&!Array.isArray(a)?a:void 0}if(!o)continue;let l=o[i];if(Array.isArray(l)){let c=l.filter(a=>String(a)!==n.value);c.length===0?delete o[i]:o[i]=c}else l!==void 0&&String(l)===n.value&&delete o[i]}return t}var D=class{constructor(e){this.opts=e}opts;async run(e,t,n,s){let i=await this.opts.inputGatherer.gather(e,t),o=this.opts.corrections?await this.opts.corrections.getContext(e.metadata.name,5):{text:""},l=Ce(be(e,i),o.text),c=await this.opts.llmClient.complete(l.prompt,s),a={raw:c??"",json:void 0},p=!1,u=[],d=!0,m=[],g=[],f=!1;if(c===null)f=!0,u.push({path:"",message:"LLM client returned null"});else{try{a.json=JSON.parse(c)}catch(k){u.push({path:"",message:`Output is not valid JSON: ${k.message}`})}if(a.json!==void 0){let k=xe(a.json,e.outputSchema);if(p=k.ok,u.push(...k.errors),p&&this.opts.groundTruthValidator){let M=await this.opts.groundTruthValidator.validate(e,i,a.json);d=M.ok,m.push(...M.errors),g.push(...M.drops??[])}}}let v=Oe(a.json,g),w=Se(n??{},v??{}),C=null,y=null,A=st(i);if(p&&d)if(e.applyMethod==="noop")C=null,y=null;else{let k=e.validation.map(R=>R.description).filter(R=>typeof R=="string"&&R.length>0),M=await this.opts.approvalGate.approve({diffText:JSON.stringify(w),output:v??{},recipeName:e.metadata.name,targetPath:A,groundTruthChecks:k},s);if(M===null)C=null;else if(C=M.approved,C===!0){let R=this.opts.applyRegistry.get(e.applyMethod);R?y=await R({recipe:e,output:v??{},inputs:i}):y={applied:!1,message:`Unknown apply method: ${e.applyMethod}`}}else{let R=M.reason?.trim();y={applied:!1,message:R?`Rejected: ${R}`:"Rejected by approval gate."},this.opts.corrections&&await this.opts.corrections.append({recipe:e.metadata.name,type:"refusal",key:(R??"user rejected suggestion").slice(0,120),note:R?`User rejected suggestion: ${R}`:"User rejected the suggested change via the approval gate."})}}return this.opts.corrections&&!f&&(p?y?.applied===!1&&!y.message.startsWith("Rejected")&&await this.opts.corrections.append({recipe:e.metadata.name,type:"apply-failed",key:y.message.slice(0,120),note:`Apply failed: ${y.message}. Output was: ${JSON.stringify(a.json??null).slice(0,400)}`}):await this.opts.corrections.append({recipe:e.metadata.name,type:"schema-error",key:u.map(k=>k.message).join("; ").slice(0,120),note:`Schema validation failed: ${u.map(k=>k.message).join("; ")}. Output was: ${JSON.stringify(a.json??null).slice(0,400)}`})),{recipeName:e.metadata.name,renderedPrompt:l.prompt,parsedOutput:a,schemaValid:p,schemaErrors:u,groundTruthValid:d,groundTruthErrors:m,groundTruthDropped:g.map(k=>k.value),diff:w,approved:C,applyResult:y}}async warmup(){await this.opts.llmClient.complete('Say "ok". Return only the word ok.')}};function st(r){let e=r.find(t=>t.key==="targetPath");return typeof e?.value=="string"?e.value:void 0}var I=require("obsidian");var O=class r extends I.Modal{request;onConfirm;static activeModal=null;constructor(e,t,n){super(e),this.request=t,this.onConfirm=n}static closeActive(){let e=r.activeModal;e&&(e.close(),r.activeModal=null)}onOpen(){r.activeModal=this;let{contentEl:e}=this;e.empty(),this.renderMainView(e)}renderMainView(e){if(e.empty(),e.createEl("h2",{text:`Huginn: Approve ${this.request.recipeName}`}),this.request.targetPath&&e.createEl("p",{text:`Target: ${this.request.targetPath}`}),this.request.reason&&e.createEl("p",{text:this.request.reason}),this.request.groundTruthChecks&&this.request.groundTruthChecks.length>0){e.createEl("h3",{text:"Checks passed"});let i=e.createEl("ul",{cls:"huginn-ground-truth-checks"});for(let o of this.request.groundTruthChecks)i.createEl("li",{text:o})}let t=Te(this.request.diff);e.createEl("pre",{cls:"huginn-diff",attr:{style:"white-space: pre-wrap; background: var(--background-secondary); padding: 1em; border-radius: 6px;"}}).setText(t);let s=e.createDiv({cls:"huginn-approval-buttons"});s.style.display="flex",s.style.gap="1em",s.style.marginTop="1em",new I.Setting(s).addButton(i=>{i.setButtonText("Reject"),i.onClick(()=>{this.renderReasonView(e)})}).addButton(i=>{i.setButtonText("Approve"),i.setCta(),i.onClick(()=>{this.close(),this.onConfirm(!0)})})}renderReasonView(e){e.empty(),e.createEl("h3",{text:`Why are you rejecting ${this.request.recipeName}?`}),e.createEl("p",{text:"Optional: explain what was wrong so Huginn can learn."});let t=e.createEl("textarea",{cls:"huginn-rejection-reason",attr:{rows:"3",placeholder:"e.g., wrong tag, unsafe change, ...",style:"width: 100%;"}}),n=e.createDiv({cls:"huginn-approval-buttons"});n.style.display="flex",n.style.gap="1em",n.style.marginTop="1em",new I.Setting(n).addButton(s=>{s.setButtonText("Back"),s.onClick(()=>{this.renderMainView(e)})}).addButton(s=>{s.setButtonText("Confirm reject"),s.setWarning(),s.onClick(()=>{let i=t.value.trim();this.close(),this.onConfirm(!1,i.length>0?i:void 0)})})}onClose(){r.activeModal===this&&(r.activeModal=null);let{contentEl:e}=this;e.empty()}};var V=class{constructor(e){this.app=e}app;async approve(e,t){let n;try{n=JSON.parse(e.diffText)}catch{n={changes:[]}}return new Promise(s=>{let i=new O(this.app,{recipeName:e.recipeName,targetPath:e.targetPath??"",diff:n,reason:this.describeOutput(e.output),groundTruthChecks:e.groundTruthChecks},(l,c)=>{s({approved:l,reason:c})});i.open();let o=()=>{i.close(),s(null)};if(t?.aborted){o();return}t?.addEventListener("abort",o)})}describeOutput(e){if(e===null||typeof e!="object")return;let t=e,n=[];if(typeof t.tag=="string"&&n.push(`Proposed tag: ${t.tag}`),typeof t.reason=="string"&&n.push(`Reason: ${t.reason}`),n.length!==0)return n.join(`
`)}};function P(r){let e=r.trim();return!e||e.length===0||e.endsWith(".md")||/[?#\[]/.test(e)?e:`${e}.md`}var F=class{constructor(e){this.opts=e}opts;async gather(e,t){let n={},s=[];for(let i of e.inputs){let o=await this.resolveInput(i,t??{},n);n[i.key]=o,s.push({key:i.key,value:o})}return s}async resolveInput(e,t,n){switch(e.source){case"recipe-param":{let s=t[e.key]??this.opts.defaultTargetPath??null;return e.key==="targetPath"&&typeof s=="string"?P(s):s}case"content":{let s=P(String(n.targetPath??t.targetPath??this.opts.defaultTargetPath??""));return this.gatherContent(s)}case"vocabulary":return this.gatherVocabulary();case"query":{let s=e.queryKey??e.key,i=P(String(n[s]??t[s]??""));return this.gatherQuery(i)}case"path":{let s=P(String(t[e.key]??this.opts.defaultTargetPath??""));return this.gatherRelatedChunks(s)}case"constant":return t[e.key]??null;default:return null}}gatherVocabulary(){return this.opts.api.tagVocabulary()}gatherQuery(e){if(!e||e.length<2)return null;let t=this.opts.api.searchText(e);return t===null?null:{hits:t.hits.slice(0,20)}}gatherRelatedChunks(e){return!e||e.length===0?null:this.opts.api.relatedChunks(e,10)}async gatherContent(e){if(!e||e.length===0)return null;let t=this.opts.app.vault.getAbstractFileByPath(e);return!t||!it(t)?null:this.opts.app.vault.cachedRead(t)}};function it(r){return typeof r=="object"&&r!==null&&"path"in r&&"extension"in r}function N(r,e){if(e===""||e==="/")return r;let t=e.replace(/^\//,"").split("."),n=r;for(let s of t){if(n===null||typeof n!="object"||Array.isArray(n))return;n=n[s]}return n}function ot(){let r=new Map;function e(n,s){r.set(n,s)}function t(n){return r.get(n)}return{register:e,get:t}}function he(r){let{resolveFile:e,readFile:t,writeFile:n,processFrontMatter:s}=r,i=ot();return i.register("noop",async o=>({applied:!1,message:`no-op apply for ${o.recipe.metadata.name}: ${JSON.stringify(o.output).slice(0,200)}`})),i.register("append-frontmatter-array",async o=>{let l=o.recipe.applyParams??{},c=E(l,"key","tags"),a=E(l,"valuePath","value"),p=ct(l,"unique",!0),u=N(o.output,a),d=lt(u);if(d.length===0)return{applied:!1,message:`No ${a} provided; nothing to apply.`};let m=ce(o.inputs),g=m?e(m):null;if(!m||!pe(g))return{applied:!1,message:`Target note not found: ${m??"unknown"}`};try{if(s)await s(g,v=>{let w=Ne(v[c]);for(let C of d)(!p||!w.includes(C))&&w.push(C);v[c]=w});else{let v=await t(g),{frontmatter:w,body:C}=ue(v),y=Ne(w[c]);for(let A of d)(!p||!y.includes(A))&&y.push(A);w[c]=y,await n(g,de(w,C))}return{applied:!0,message:`Added ${d.map(v=>`'${v}'`).join(", ")} to frontmatter ${c} of ${m}.`}}catch(f){return{applied:!1,message:`Failed to write ${c} to ${m}: ${f.message}`}}}),i.register("set-first-heading",async o=>{let l=o.recipe.applyParams??{},c=E(l,"valuePath","title"),a=N(o.output,c);if(!a||typeof a!="string"||a.length===0)return{applied:!1,message:`No ${c} provided; nothing to apply.`};let p=ce(o.inputs),u=p?e(p):null;if(!p||!pe(u))return{applied:!1,message:`Target note not found: ${p??"unknown"}`};try{let d=await t(u),{frontmatter:m,body:g}=ue(d);m.title=a;let f=g.trimStart(),v=f.startsWith("# ")?`# ${a}
${f.slice(f.indexOf(`
`)+1)}`:`# ${a}

${g}`;return await n(u,de(m,v)),{applied:!0,message:`Set first heading to '${a}' in ${p}.`}}catch(d){return{applied:!1,message:`Failed to write title '${a}' to ${p}: ${d.message}`}}}),i.register("append-section",async o=>{let l=o.recipe.applyParams??{},c=E(l,"heading","Related"),a=E(l,"valuePath","items"),p=E(l,"itemTemplate","- {{value}}"),u=N(o.output,a),d=Array.isArray(u)?u.filter(f=>typeof f=="string"&&f.length>0):[];if(d.length===0)return{applied:!1,message:`No ${a} provided; nothing to apply.`};let m=ce(o.inputs),g=m?e(m):null;if(!m||!pe(g))return{applied:!1,message:`Target note not found: ${m??"unknown"}`};try{let f=await t(g),{frontmatter:v,body:w}=ue(f),C=d.map(k=>p.replace(/\{\{value\}\}/g,at(k))).join(`
`),y=w.length>0&&!w.endsWith(`

`)?`

`:"",A=`${w}${y}## ${c}
${C}
`;return await n(g,de(v,A)),{applied:!0,message:`Added ${d.length} item(s) to ${m}: ${d.join(", ")}`}}catch(f){return{applied:!1,message:`Failed to write ${a} to ${m}: ${f.message}`}}}),i}function ce(r){let e=r.find(t=>t.key==="targetPath");return typeof e?.value=="string"?e.value:void 0}function pe(r){return typeof r=="object"&&r!==null&&"path"in r&&"extension"in r}function at(r){return r.replace(/\.md$/i,"")}function ue(r){if(!r.startsWith(`---
`))return{frontmatter:{},body:r};let e=r.indexOf(`
---`,4);if(e===-1)return{frontmatter:{},body:r};let t=r.slice(4,e),n=r.slice(e+4);return{frontmatter:pt(t),body:n}}function de(r,e){let t=Object.keys(r);if(t.length===0)return e;let n=["---"];for(let s of t){let i=r[s];if(Array.isArray(i)){n.push(`${s}:`);for(let o of i)n.push(`  - ${String(o)}`)}else(typeof i=="string"||typeof i=="number"||typeof i=="boolean")&&n.push(`${s}: ${String(i)}`)}return n.push("---"),`${n.join(`
`)}${e.startsWith(`
`)?"":`
`}${e}`}function Ne(r){return Array.isArray(r)?r.filter(e=>typeof e=="string"):typeof r=="string"?r.split(",").map(e=>e.trim()).filter(Boolean):[]}function lt(r){return Array.isArray(r)?r.filter(e=>typeof e=="string"&&e.length>0):typeof r=="string"&&r.length>0?[r]:typeof r=="number"?[String(r)]:[]}function E(r,e,t){let n=r[e];return typeof n=="string"?n:t}function ct(r,e,t){let n=r[e];return typeof n=="boolean"?n:t}function pt(r){let e={},t=r.split(`
`),n=null;for(let s of t){let i=s.trim();if(i.length===0||i.startsWith("#"))continue;if(i.startsWith("- ")){let a=i.slice(2);n&&e[n].push(a);continue}let o=i.indexOf(": ");if(o===-1){if(i.endsWith(":")){let a=i.slice(0,-1).trim();e[a]=[],n=a}continue}let l=i.slice(0,o),c=i.slice(o+2);c===""?(e[l]=[],n=l):(e[l]=ut(c),n=null)}return e}function ut(r){return/^-?\d+(\.\d+)?$/.test(r)?Number(r):r}var me=require("obsidian"),H=class{constructor(e){this.app=e}app;getFileFrontmatter(e){let t=this.app.vault.getAbstractFileByPath(e);return!t||!(t instanceof me.TFile)?null:this.app.metadataCache.getFileCache(t)?.frontmatter??{}}async readFile(e){let t=this.app.vault.getAbstractFileByPath(e);if(!t||!(t instanceof me.TFile))return null;try{return await this.app.vault.cachedRead(t)}catch{return null}}};var x=require("obsidian"),G=class{constructor(e){this.vault=e}vault;async read(e){let t=(0,x.normalizePath)(e),n=this.vault.getAbstractFileByPath(t);if(!n||!(n instanceof x.TFile))throw new Error(`Memory file not found: ${e}`);return this.vault.cachedRead(n)}async write(e,t){let n=(0,x.normalizePath)(e);await this.ensureFolder(n);let s=this.vault.getAbstractFileByPath(n);s&&s instanceof x.TFile?await this.vault.modify(s,t):await this.vault.create(n,t)}async exists(e){let t=(0,x.normalizePath)(e);return this.vault.getAbstractFileByPath(t)instanceof x.TFile}async ensureFolder(e){let t=e.split("/");t.pop();let n="";for(let s of t){n=n?`${n}/${s}`:s;let i=this.vault.getAbstractFileByPath((0,x.normalizePath)(n));(!i||!(i instanceof x.TFolder))&&await this.vault.createFolder((0,x.normalizePath)(n))}}};var L=class{constructor(e,t){this.storage=e;this.basePath=t}storage;basePath;async append(e,t){let n=this.resolvePath(e),s=this.formatEntry(t),i=await this.readRaw(n);i.length>0&&!i.endsWith(`
`)&&(i+=`
`),i.length>0&&(i+=`
---

`),i+=s,await this.storage.write(n,i)}async readContext(e,t={}){let n=this.resolvePath(e),s=await this.readRaw(n);if(s.trim().length===0)return"";let o=this.parseEntries(s);t.recipe&&(o=o.filter(a=>a.recipe===t.recipe));let l=t.limit??10,c=o.slice(-l);return c.length===0?"":c.map(a=>`- ${a.type}${a.recipe?` (${a.recipe})`:""}: ${a.note}`).join(`
`)+`
`}async summarizeRecurrence(e,t=4){let n=this.resolvePath(e),s=await this.readRaw(n);if(s.trim().length===0)return[];let i=this.parseEntries(s),o=new Map;for(let a of i){let p=this.recurrenceKey(a);o.set(p,(o.get(p)??0)+1)}let l=new Set,c=[];for(let a=i.length-1;a>=0;a--){let p=i[a],u=this.recurrenceKey(p),d=o.get(u)??0;d>=t&&!l.has(u)&&(l.add(u),c.unshift({...p,recurrence:d}))}return c}resolvePath(e){return`${this.basePath.replace(/\/$/,"")}/${e.replace(/^\//,"")}`}async readRaw(e){return await this.storage.exists(e)?this.storage.read(e):""}formatEntry(e){let t=["---"];return t.push(`date: ${e.date}`),t.push(`type: ${e.type}`),e.recipe&&t.push(`recipe: ${e.recipe}`),t.push(`key: ${e.key}`),e.recurrence!==void 0&&t.push(`recurrence: ${e.recurrence}`),t.push("---"),t.push(e.note.trim()),t.join(`
`)}parseEntries(e){let t=[],n=e.replace(/\r\n?/g,`
`),s=0;for(;s<n.length;){let i=n.indexOf(`---
`,s);if(i===-1)break;let o=i+4,l=n.indexOf(`
---`,o);if(l===-1)break;let c=n.slice(o,l).trim(),a=l+4,p=n.indexOf(`
---
`,a);p===-1&&(p=n.length);let u=n.slice(a,p).trim(),d=this.parseFrontmatter(c);s=p===n.length?p:p+5,!(!d.type||!d.key)&&t.push({date:typeof d.date=="string"?d.date:new Date().toISOString(),type:String(d.type),recipe:typeof d.recipe=="string"?d.recipe:void 0,key:String(d.key),note:u,recurrence:typeof d.recurrence=="number"?d.recurrence:void 0})}return t}parseFrontmatter(e){let t={};for(let n of e.split(`
`)){let s=n.replace(/\r$/,"").trim();if(s.length===0)continue;let i=s.indexOf(": ");if(i===-1)continue;let o=s.slice(0,i).trim(),l=s.slice(i+2).trim();l==="true"?t[o]=!0:l==="false"?t[o]=!1:/^-?\d+$/.test(l)?t[o]=Number(l):t[o]=l}return t}recurrenceKey(e){return[e.type,e.recipe??"_none_",e.key].join("|")}};var ge="Agents/Huginn/MEMORY";function fe(){return new Date().toISOString()}var J=class{store;constructor(e){this.store=new L(e,ge)}async append(e){let t={date:fe(),type:e.type,recipe:e.recipe,key:e.key,note:e.note};await this.store.append("corrections.md",t)}async getContext(e,t){let n=await this.store.readContext("corrections.md",{recipe:e,limit:t});return n.length===0?{text:""}:{text:`Previous mistakes to avoid:
${n}`}}async promoted(e=4){return this.store.summarizeRecurrence("corrections.md",e)}},B=class{store;constructor(e){this.store=new L(e,ge)}async append(e){let t={date:fe(),type:e.type,key:e.key,note:e.note};await this.store.append("user.md",t)}async getContext(e){let t=await this.store.readContext("user.md",{limit:e});return t.length===0?{text:""}:{text:`Things the user has told you:
${t}`}}},q=class{store;constructor(e){this.store=new L(e,ge)}async append(e){let t={date:fe(),type:"chat-summary",key:e.key,note:e.note};await this.store.append("chat-summaries.md",t)}async getContext(e){let t=await this.store.readContext("chat-summaries.md",{limit:e});return t.length===0?{text:""}:{text:`Summaries of earlier conversations:
${t}`}}};var T=require("obsidian"),Y=class{constructor(e,t){this.vault=e;this.dir=t}vault;dir;async listRecipes(){let e=(0,T.normalizePath)(this.dir),t=this.vault.getAbstractFileByPath(e);return t===null||!(t instanceof T.TFolder)?(console.warn("[Huginn] recipe folder not found in vault index:",e),[]):t.children.filter(n=>n instanceof T.TFile).filter(n=>n.extension==="md").map(n=>n.path).sort()}async readRecipe(e){let t=(0,T.normalizePath)(e),n=this.vault.getAbstractFileByPath(t);if(n===null)throw new Error(`Recipe not found: ${e}`);return this.vault.cachedRead(n)}};function Le(r,e){let t=[],n=dt(r);if(n===void 0)return t.push("Missing YAML frontmatter block"),{ok:!1,errors:t};let s=ht(n,t),i=mt(r),o=gt(i.get("trigger"),t),l=ft(i.get("inputs"),t),c=Ee(i.get("instructions"),"Instructions",t),a=yt(i.get("output contract"),t),p=Ee(i.get("apply method"),"Apply Method",t),u=kt(i.get("apply params"),t),d=vt(i.get("validation"),t),m=wt(i.get("chat render"),t);return t.length>0?{ok:!1,errors:t}:{ok:!0,recipe:{metadata:s,trigger:o,inputs:l,instructions:c,outputSchema:a,applyMethod:p,applyParams:u,validation:d,chatRender:m},errors:t}}function dt(r){let e=r.trim();if(!e.startsWith("---"))return;let t=e.indexOf("---",3);if(t!==-1)return e.slice(3,t).trim()}function ht(r,e){let t=r.split(`
`).map(s=>s.replace(/\r$/,"")),n={};for(let s of t){let i=s.indexOf(":");if(i===-1)continue;let o=s.slice(0,i).trim(),l=s.slice(i+1).trim();o==="name"?n.name=l:o==="version"?n.version=l:o==="modelTier"?n.modelTier=l:o==="riskClass"&&(n.riskClass=l)}if((!n.name||n.name.length===0)&&e.push("Metadata missing name"),(!n.version||n.version.length===0)&&e.push("Metadata missing version"),(!n.modelTier||!["fast","capable"].includes(n.modelTier))&&e.push("Metadata missing or invalid modelTier (fast | capable)"),(!n.riskClass||!["read-only","suggest"].includes(n.riskClass))&&e.push("Metadata missing or invalid riskClass (read-only | suggest)"),!(e.length>0))return n}function mt(r){let e=new Map,t=r.replace(/^---[\s\S]*?---\n?/,""),n=/^#\s+(.+)$/m,s=null,i=[];function o(){s!==null&&(e.set(s.toLowerCase().trim(),i.join(`
`).trim()),i.length=0)}for(let l of t.split(`
`)){let c=l.replace(/\r$/,""),a=n.exec(c);if(a){o(),s=a[1].trim();continue}s!==null&&i.push(c)}return o(),e}function gt(r,e){if(!r||r.length===0){e.push("Missing # Trigger section");return}return{description:r}}function ft(r,e){if(!r||r.length===0)return[];let t=[],n=je(r);for(let s of n){let i=b(s,"key"),o=b(s,"description"),l=b(s,"source"),c=b(s,"queryKey");if(!i||!o){e.push(`Invalid input entry (missing key or description): ${s.slice(0,40)}`);continue}if(!l||!["query","path","vocabulary","constant","recipe-param","content"].includes(l)){e.push(`Invalid input source for ${i}: ${l}`);continue}let a={key:i,description:o,source:l};l==="query"&&c&&(a.queryKey=c),t.push(a)}return t}function Ee(r,e,t){if(!r||r.trim().length===0){t.push(`Missing or empty # ${e} section`);return}return r.trim()}function yt(r,e){if(!r||r.length===0){e.push("Missing # Output Contract section");return}let t;try{t=JSON.parse(r)}catch(s){e.push(`Output Contract is not valid JSON: ${s.message}`);return}let n=ye(t,"outputSchema",e);if(!n||n.type!=="object"){e.push("Output Contract root must be an object schema");return}return n}function vt(r,e){if(!r||r.length===0)return[];let t=[],n=je(r);for(let s of n){let i=b(s,"primitive"),o=b(s,"path"),l=b(s,"description");if(b(s,"source")||b(s,"check")){e.push(`Validation uses deprecated 'source'/'check' fields; use 'primitive' instead: ${s.slice(0,60)}`);continue}if(!i||!o){e.push(`Invalid validation entry (missing primitive or path): ${s.slice(0,60)}`);continue}let c=b(s,"params"),a={};if(c)try{a=JSON.parse(c)}catch(u){e.push(`Invalid validation params for ${o}: ${u.message}`);continue}let p={primitive:i,path:o};l&&(p.description=l),Object.keys(a).length>0&&(p.params=a),t.push(p)}return t}function wt(r,e){if(!r||r.trim().length===0)return;let t=b(r,"template"),n=b(r,"field"),s=b(r,"message");if(!t||!["paragraph","numbered-list","bulleted-list","json"].includes(t)){e.push("Invalid or missing chat render template (paragraph | numbered-list | bulleted-list | json)");return}if(!n||n.length===0){e.push("Chat render requires a 'field' path into the output object");return}return{template:t,field:n,message:s}}function kt(r,e){if(!(!r||r.trim().length===0))try{return JSON.parse(r)}catch(t){e.push(`Apply Params is not valid JSON: ${t.message}`);return}}function ye(r,e,t){if(r===null||typeof r!="object"||Array.isArray(r)){t.push(`Schema at ${e} must be an object`);return}let n=r,s=n.type;if(typeof s!="string"||!Rt(s)){t.push(`Schema at ${e} missing or invalid type`);return}let i={type:s,description:typeof n.description=="string"?n.description:void 0,enum:Array.isArray(n.enum)?n.enum:void 0};switch(s){case"string":return i;case"number":return i;case"boolean":return i;case"array":{if(!n.items||typeof n.items!="object"||Array.isArray(n.items)){t.push(`Schema at ${e} array missing items`);return}let o=ye(n.items,`${e}.items`,t);return o?{...i,items:o}:void 0}case"object":{let o={};if(n.properties&&typeof n.properties=="object"&&!Array.isArray(n.properties)){let c=n.properties;for(let[a,p]of Object.entries(c)){let u=ye(p,`${e}.${a}`,t);if(!u)return;o[a]=u}}let l=Array.isArray(n.required)?n.required.filter(c=>typeof c=="string"):void 0;return{...i,properties:o,required:l}}}}function Rt(r){return["string","number","boolean","array","object"].includes(r)}function je(r){let e=[],t=r.split(`
`).map(s=>s.replace(/\r$/,"")),n=[];for(let s of t)if(s.startsWith("- "))n.length>0&&e.push(n.join(`
`).trim()),n=[s.slice(2).trim()];else{if(s.trim().length===0)continue;n.length>0&&n.push(s)}return n.length>0&&e.push(n.join(`
`).trim()),e}function b(r,e){let t=r.split(`
`).map(n=>n.replace(/\r$/,""));for(let n=0;n<t.length;n++){let s=t[n],i=s.indexOf(":");if(i===-1||s.slice(0,i).trim()!==e)continue;let l=s.slice(i+1).trim();if(l.startsWith("|")){let c=[],a=n+1;for(;a<t.length&&(t[a].startsWith("  ")||t[a].startsWith("	"));)c.push(t[a].replace(/^[ \t]+/,"")),a++;return c.join(`
`).trim()}return l}}async function De(r){let e=await r.listRecipes(),t=[],n=[];for(let s of e)if(s.endsWith(".md"))try{let i=await r.readRecipe(s),o=Le(i,s);if(!o.ok){n.push(`Recipe ${s}: ${o.errors.join("; ")}`);continue}t.push({...o.recipe,sourcePath:s})}catch(i){n.push(`Recipe ${s}: read failed \u2014 ${i.message}`)}return{ok:n.length===0,recipes:t,errors:n}}var Ie=[{fileName:"tag-assignment.md",content:`---
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
You are a tag assistant. Given a vault note, propose up to two tags.
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
- tags: an array of one or two proposed tag strings
- reason: one sentence explaining the proposal
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["tags", "reason", "confidence"],
  "properties": {
    "tags": { "type": "array", "items": { "type": "string" } },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-frontmatter-array

# Apply Params
{
  "key": "tags",
  "valuePath": "tags"
}

# Validation
- primitive: frontmatter-not-contains
  path: /tags
  description: Proposed tags already in the target note's frontmatter are dropped, and only the remaining tags are proposed.
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
`}];var _="Agents/Huginn/SKILLS";async function ve(r,e={}){let t={installed:0,skipped:0,overwritten:0,errors:[]};if(!r.getAbstractFileByPath(_))try{await r.createFolder(_)}catch(s){return t.errors.push(`Failed to create ${_}: ${s.message}`),t}for(let s of Ie){let i=`${_}/${s.fileName}`,o=r.getAbstractFileByPath(i);if(o&&!e.force){t.skipped++;continue}try{o?(await r.modify(o,s.content),t.overwritten++):(await r.create(i,s.content),t.installed++)}catch(l){t.errors.push(`Failed to write ${i}: ${l.message}`)}}return t}var S=require("obsidian");var K=class extends S.Modal{recipes;chosen=null;targetPath="";onConfirm;constructor(e,t,n,s){super(e),this.recipes=t,this.targetPath=n,this.onConfirm=s,t.length>0&&(this.chosen=t[0])}onOpen(){let{contentEl:e}=this;if(e.empty(),e.createEl("h2",{text:"Huginn: Run skill"}),this.recipes.length===0){e.createEl("p",{text:"No recipes found."});return}new S.Setting(e).setName("Recipe").setDesc("Choose the skill recipe to run.").addDropdown(t=>{for(let n of this.recipes)t.addOption(n.sourcePath,n.metadata.name);t.setValue(this.chosen?.sourcePath??""),t.onChange(n=>{this.chosen=this.recipes.find(s=>s.sourcePath===n)??null})}),new S.Setting(e).setName("Target note path").setDesc("Vault path of the note to run the skill against.").addText(t=>{t.setPlaceholder("notes/gamma.md"),t.setValue(this.targetPath),t.onChange(n=>{this.targetPath=n})}),new S.Setting(e).addButton(t=>{t.setButtonText("Run"),t.setCta(),t.onClick(()=>{if(this.chosen===null){new S.Notice("Please select a recipe.");return}let n=P(this.targetPath);if(n.length===0){new S.Notice("Please enter a target note path.");return}this.close(),this.onConfirm({recipe:this.chosen,targetPath:n})})})}onClose(){this.chosen===null&&this.onConfirm(null);let{contentEl:e}=this;e.empty()}};var Q=class{opts;constructor(e){this.opts=e}async createSession(){let{path:e,content:t}=await this.readActiveNote(),n=await this.buildSystemPrompt(e,t);return{messages:n?[{role:"system",content:n}]:[],activeNotePath:e,activeNoteContent:t}}async sendMessage(e,t,n){let s=[...e.messages,{role:"user",content:t}],i=await this.opts.llmClient.chat(s,n);if(i===null)return{response:null,updatedSession:e};let o={role:"assistant",content:i};return{response:i,updatedSession:{...e,messages:[...s,o]}}}async summarizeChat(e,t){let n=e.map(i=>`${i.role==="user"?"User":"Huginn"}: ${i.content}`).join(`

`),s=[{role:"system",content:"You are a concise conversation summarizer. You will be given a transcript of a user/assistant chat. Produce a short paragraph summary of facts, decisions, and context the user would want to recall in future chats. Return only the summary, with no preamble, role labels, or markdown fences."},{role:"user",content:`Summarize this conversation:

${n}`}];return this.opts.llmClient.chat(s,t)}async readActiveNote(){let e=this.opts.app.workspace.getActiveFile();if(!e||typeof e!="object"||!("path"in e))return{path:null,content:null};try{let t=await this.opts.app.vault.cachedRead(e);return{path:e.path,content:t}}catch(t){return console.warn("[Huginn] failed to read active note:",t.message),{path:e.path,content:null}}}async buildSystemPrompt(e,t){let n=["You are Huginn, an AI assistant embedded in Obsidian as a vault-aware chat companion.","","Your job is to help the user with their notes and general knowledge. Be concise but useful."];if(this.opts.getUserMemoryContext){let s=await this.opts.getUserMemoryContext();s.length>0&&n.push("","CRITICAL \u2014 you MUST follow these user preferences and facts. They override any default guideline below:",s)}if(this.opts.getChatSummaryContext){let s=await this.opts.getChatSummaryContext();s.length>0&&n.push("","CRITICAL \u2014 remember these summaries of earlier conversations:",s)}return n.push("","Guidelines:","- The user is looking at an Obsidian note. Use the note content below when the question is about it.","- If the question is not about the active note, answer from general knowledge rather than inventing a connection.","- Prefer short, actionable answers. Use markdown formatting (headings, lists, code fences) when it improves readability.","- Do not claim the note says something it does not. If the note lacks the answer, say so.","- You cannot rename, move, delete, or otherwise modify files unless the user explicitly asks you to run a skill."),e&&t?n.push("",`Active note path: ${e}`,"","Note content:","---",t,"---"):n.push("","No active note is currently open. Answer from general knowledge."),n.join(`
`)}};var X=class{constructor(e){this.opts=e}opts;async dispatch(e,t,n){let s=await this.buildDispatchMessages(e,t),i=await this.opts.llmClient.chat(s,n);return i===null?{intent:null,raw:null}:{intent:this.parseDispatch(i),raw:i}}async buildDispatchMessages(e,t){let n=this.opts.getRecipes().map(o=>`- ${o.metadata.name}: ${o.trigger.description}`).join(`
`),s=this.opts.corrections?await this.opts.corrections.getContext(void 0,5):{text:""};return[{role:"system",content:["You are Huginn, a dispatcher inside Obsidian. The user has typed a request in a chat panel.","Your job is to choose the best matching skill from the list below, and to identify which vault note the skill should target.","","Available skills:",n,"","Rules:","- Return ONLY a raw JSON object with three fields: recipeName, targetPath, reason.","- recipeName must exactly match one of the available skill names.",`- targetPath should be a vault-relative note path ending in .md. If the user does not name a note, use "${t??"no active note"}" as the fallback target path.`,"- reason should be one sentence explaining why you chose this skill.",'- If no skill matches the request, return {"recipeName":"", "targetPath":"", "reason":"No matching skill."}.',"- Do not return markdown, commentary, or code fences.",s.text.length>0?`
${s.text}`:""].join(`
`)},{role:"user",content:e}]}parseDispatch(e){let t=e.trim(),n=t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);n&&(t=n[1].trim());try{let s=JSON.parse(t);return typeof s.recipeName!="string"||typeof s.targetPath!="string"||typeof s.reason!="string"||s.recipeName.length===0||!this.opts.getRecipes().find(o=>o.metadata.name===s.recipeName)?null:{recipeName:s.recipeName,targetPath:s.targetPath,reason:s.reason}}catch{return null}}};var te=require("obsidian");function Z(){return{messages:[],activeNotePath:null,activeNoteContent:null}}function bt(r){if(r===null||typeof r!="object")return!1;let e=r;return(e.role==="system"||e.role==="user"||e.role==="assistant")&&typeof e.content=="string"}function Ve(r){if(r===null||typeof r!="object")return null;let e=r,t=Z();return typeof e.activeNotePath=="string"&&(t.activeNotePath=e.activeNotePath),(typeof e.activeNoteContent=="string"||e.activeNoteContent===null)&&(t.activeNoteContent=e.activeNoteContent),Array.isArray(e.messages)&&(t.messages=e.messages.filter(bt)),t}var Ct=[{type:"remember",regex:/^\s*remember\b\s*(?:that\s*)?(.+)$/is}];function Fe(r){let e=r.trim();if(e.length===0)return null;for(let{type:t,regex:n}of Ct){let s=e.match(n);if(s&&s[1]){let i=s[1].trim().replace(/\.$/,""),o=i.slice(0,120);return{type:t,key:o,note:i}}}return null}var U="huginn-chat",ee=class extends te.ItemView{services;session;container=null;messagesContainer=null;inputEl=null;sendButton=null;contextEl=null;isLoading=!1;abortController=null;activeLeafChangeRef=null;get verbosity(){return this.services.getSettings().reportBackVerbosity}constructor(e,t){super(e),this.services=t,this.session=Z()}get harness(){return this.services.getHarness()}getViewType(){return U}getDisplayText(){return"Huginn Chat"}getIcon(){return"message-square"}async onOpen(){this.container=this.contentEl.createDiv({cls:"huginn-chat-view"}),this.render(),await this.refreshContext(),this.activeLeafChangeRef=this.app.workspace.on("active-leaf-change",()=>{this.refreshContext(!1)})}async onClose(){this.activeLeafChangeRef&&(this.app.workspace.offref(this.activeLeafChangeRef),this.activeLeafChangeRef=null),this.container?.empty()}getState(){return{messages:[],activeNotePath:null,activeNoteContent:null}}async setState(e,t){Ve(e)!==null&&(this.session=Z(),this.applySessionToDom(),window.setTimeout(()=>{this.refreshContext()},0))}render(){if(!this.container)return;this.container.empty();let e=this.container.createEl("div",{cls:"huginn-chat-header"});this.contextEl=e.createEl("div",{cls:"huginn-chat-context"}),e.createEl("button",{cls:"huginn-chat-refresh",text:"Refresh context"}).addEventListener("click",()=>{this.refreshContext(!1)}),e.createEl("button",{cls:"huginn-chat-remember",text:"Remember chat"}).addEventListener("click",()=>{this.rememberChat()}),e.createEl("button",{cls:"huginn-chat-reset",text:"New chat"}).addEventListener("click",()=>{this.resetChat()}),this.messagesContainer=this.container.createEl("div",{cls:"huginn-chat-messages"});let i=this.container.createEl("div",{cls:"huginn-chat-input-container"});this.inputEl=i.createEl("textarea",{cls:"huginn-chat-input",placeholder:"Ask about the active note..."}),this.inputEl.addEventListener("keydown",o=>{o.key==="Enter"&&!o.shiftKey&&(o.preventDefault(),this.handleSend())}),this.sendButton=i.createEl("button",{text:"Send",cls:"mod-cta huginn-chat-send"}),this.sendButton.addEventListener("click",()=>{this.handleSend()}),this.applySessionToDom(),this.inputEl.focus()}async refreshContext(e=!0){let t=await this.services.controller.createSession();if(e)this.session=t;else{let n=this.session.messages.filter(s=>s.role!=="system");this.session={...t,messages:[...t.messages,...n]}}this.applySessionToDom()}applySessionToDom(){if(!(!this.contextEl||!this.messagesContainer)){this.contextEl.empty(),this.session.activeNotePath?this.contextEl.createEl("small",{text:`Active note: ${this.session.activeNotePath}`}):this.contextEl.createEl("small",{text:"No active note open."}),this.messagesContainer.empty();for(let e of this.session.messages)e.role!=="system"&&this.renderMessage(e.role,e.content)}}async handleSend(){if(!this.inputEl)return;let e=this.inputEl.value.trim();if(e.length===0)return;if(this.abortController){console.log("[Huginn chat] Stop clicked; aborting in-flight request."),this.abortController.abort(),O.closeActive();return}if(this.isLoading){this.setLoading(!1);return}let t=Fe(e);if(t){let n=this.services.getMemory?.().user??null;n?(await n.append(t),this.appendMessage("assistant",`Memory saved: ${t.type} \u2014 ${t.note}`)):this.appendMessage("assistant","Memory storage is not available yet."),this.inputEl.value="";return}this.abortController=new AbortController,this.setLoading(!0),this.renderMessage("user",e),this.inputEl.value="";try{let n=await this.services.dispatcher.dispatch(e,this.session.activeNotePath,this.abortController.signal);if(this.abortController.signal.aborted)return;let s=n.intent,i=s?this.services.getRecipes().find(o=>o.metadata.name===s.recipeName)??null:null;if(s&&i){if(this.abortController.signal.aborted)return;await this.runSkillFromChat(e,s,i,n)}else await this.runPlainChat(e)}finally{this.abortController=null,this.setLoading(!1),this.scrollToBottom()}}async runPlainChat(e){let t=await this.services.controller.sendMessage(this.session,e,this.abortController?.signal);this.session=t.updatedSession,t.response===null?this.renderMessage("assistant","[No response from model]"):this.renderMessage("assistant",t.response)}async runSkillFromChat(e,t,n,s){let i=this.harness;if(!i){this.appendMessage("assistant","Huginn harness is not ready yet. Is Muninn installed and enabled?");return}this.session.messages.push({role:"user",content:e}),this.verbosity!=="minimal"&&this.appendMessage("assistant",`Running ${n.metadata.name} on ${t.targetPath}...`);let o=P(t.targetPath),l=await i.run(n,{targetPath:o,titleQuery:n.metadata.name,verbosity:this.verbosity},{},this.abortController?.signal);if(this.abortController?.signal.aborted){this.appendMessage("assistant","[Interrupted]");return}if(!l.schemaValid){let c=l.schemaErrors.map(a=>a.message).join("; ");this.appendMessage("assistant",`Skill failed: ${c}`);return}if(!l.groundTruthValid){let c=l.groundTruthErrors.map(a=>a.message).join("; ");this.appendMessage("assistant",`The suggestion from ${n.metadata.name} is already reflected in the vault (${c}). No change needed.`);return}await this.renderRunResult(n,l)}async renderRunResult(e,t){if(e.applyMethod==="noop"){this.renderReadOnlyResult(e,t);return}if(t.applyResult?.applied)this.appendMessage("assistant",t.applyResult.message);else if(t.applyResult){let n=this.verbosity==="minimal"?"Skill could not be applied.":`Skill could not be applied: ${t.applyResult.message}`;this.appendMessage("assistant",n)}else t.approved===!1?this.appendMessage("assistant","Skill suggestion was rejected."):this.appendMessage("assistant","```json\n"+JSON.stringify(t.parsedOutput.json,null,2)+"\n```")}resetChat(){this.session={...this.session,messages:this.session.messages.filter(e=>e.role==="system")},this.applySessionToDom()}async rememberChat(){let e=this.services.getMemory?.().summary??null;if(e===null){this.renderMessage("assistant","Memory storage is not available yet.");return}let t=this.session.messages.filter(n=>n.role!=="system");if(t.length===0){this.appendMessage("assistant","Nothing to remember yet.");return}if(this.abortController){this.abortController.abort();return}if(this.isLoading){this.setLoading(!1);return}this.abortController=new AbortController,this.setLoading(!0),this.appendMessage("assistant","Saving chat summary...");try{let n=await this.services.controller.summarizeChat(t,this.abortController.signal);if(n===null||n.trim().length===0){this.appendMessage("assistant","Could not generate a chat summary.");return}await e.append({key:this.session.activeNotePath??"general chat",note:n.trim()}),this.appendMessage("assistant","Chat summary saved.")}catch(n){console.warn("[Huginn chat] Remember chat failed:",n.message),this.appendMessage("assistant",`Could not save chat summary: ${n.message}`)}finally{this.abortController=null,this.setLoading(!1),this.scrollToBottom()}}renderReadOnlyResult(e,t){let n=t.parsedOutput.json,s=e.chatRender;if(!s){this.appendMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```");return}let i=N(n,s.field);if(s.template==="paragraph"&&typeof i=="string"){this.appendMessage("assistant",i);return}if((s.template==="numbered-list"||s.template==="bulleted-list")&&Array.isArray(i)){let o=i;if(o.length===0){this.appendMessage("assistant",s.message??"No items found.");return}let l=s.template==="numbered-list"?c=>`${c+1}. `:()=>"- ";this.appendMessage("assistant",o.map((c,a)=>`${l(a)}${c}`).join(`
`));return}if(s.template==="json"){this.appendMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```");return}this.appendMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```")}renderMessage(e,t){if(!this.messagesContainer)return;let n=this.messagesContainer.createEl("div",{cls:`huginn-chat-message huginn-chat-message-${e}`});n.createEl("div",{cls:"huginn-chat-message-role",text:e==="user"?"You":"Huginn"});let s=n.createEl("div",{cls:"huginn-chat-message-body"});e==="assistant"?te.MarkdownRenderer.render(this.app,t,s,this.session.activeNotePath??"",this):s.innerText=t}appendMessage(e,t){this.session.messages.push({role:e,content:t}),this.renderMessage(e,t)}setLoading(e){this.isLoading=e,this.sendButton&&(this.sendButton.textContent=this.abortController?"Stop":"Send")}scrollToBottom(){this.messagesContainer&&(this.messagesContainer.scrollTop=this.messagesContainer.scrollHeight)}};var xt="muninn",ne="Agents/Huginn/SKILLS",Pt=500,St=3e4,re=class extends h.Plugin{settings={...z};muninnApi=null;harness=null;chatClient=null;recipes=[];correctionsMemory=null;userMemory=null;chatSummaryMemory=null;async onload(){try{let e=await this.loadData();this.settings=ke(e)}catch(e){console.warn("[Huginn] failed to load settings, using defaults:",e),this.settings={...z}}this.addSettingTab(new we(this.app,this)),this.addCommand({id:"run-skill",name:"Run Huginn skill",callback:()=>{this.runSkill()}}),this.addCommand({id:"open-chat",name:"Open Huginn chat",callback:()=>{this.openChat()}}),this.addCommand({id:"install-default-recipes",name:"Install default Huginn skills",callback:()=>{this.installDefaultRecipes(!1)}}),this.addCommand({id:"reset-default-recipes",name:"Reset default Huginn skills",callback:()=>{this.installDefaultRecipes(!0)}}),this.registerView(U,e=>new ee(e,this.createChatViewServices())),this.addRibbonIcon("message-square","Huginn chat",()=>{this.openChat()}),this.app.workspace.onLayoutReady(()=>{this.awaitMuninnReady().then(async e=>{if(e===null){new h.Notice("Huginn requires Muninn to be installed and enabled.");return}this.muninnApi=e,this.chatClient=new $({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs});let t=new G(this.app.vault);this.correctionsMemory=new J(t),this.userMemory=new B(t),this.chatSummaryMemory=new q(t),this.harness=new D({llmClient:this.chatClient,inputGatherer:new F({api:e,app:this.app}),approvalGate:new V(this.app),applyRegistry:he(He(this.app)),groundTruthValidator:new j(le(),new H(this.app)),corrections:this.correctionsMemory});let n=await ve(this.app.vault,{force:!1});n.installed>0&&new h.Notice(`Huginn installed ${n.installed} default skill recipe(s) in ${ne}`),n.errors.length>0&&console.warn("[Huginn] recipe seed errors:",n.errors),await this.loadRecipes(),this.registerRecipeFolderWatcher(),console.log("[Huginn] harness initialized against Muninn API"),this.settings.warmupOnFocus&&this.warmupChatModel()})})}registerRecipeFolderWatcher(){let e=`${ne}`;this.registerEvent(this.app.vault.on("create",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("modify",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("delete",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("rename",(t,n)=>{(t.path.startsWith(e)||n.startsWith(e))&&this.loadRecipes()}))}async awaitMuninnReady(){let e=Date.now(),t=e+St,n=!1;for(;Date.now()<t;){let i=this.discoverMuninnApi();if(i!==null)return i;!n&&Date.now()>e+5e3&&(console.log("[Huginn] still waiting for Muninn to become ready..."),n=!0),await new Promise(o=>window.setTimeout(o,Pt))}let s=this.discoverMuninnApi();return s===null&&console.warn("[Huginn] Muninn did not become ready within 30s. Is it installed and enabled?"),s}async warmupChatModel(){if(this.harness!==null){console.log("[Huginn] warming up chat model...");try{await this.harness.warmup(),console.log("[Huginn] chat model warmup complete")}catch(e){console.warn("[Huginn] chat model warmup failed:",e.message)}}}discoverMuninnApi(){let t=this.app.plugins?.plugins?.[xt];return!t||typeof t.getMuninnApi!="function"?null:t.getMuninnApi()}async runSkill(){if(this.harness===null||this.muninnApi===null){let t=this.discoverMuninnApi();if(t===null){new h.Notice("Huginn harness is not ready. Is Muninn installed and enabled?");return}this.muninnApi=t;let n=new G(this.app.vault),s=this.correctionsMemory??new J(n);this.correctionsMemory=s,this.userMemory=this.userMemory??new B(n),this.chatSummaryMemory=this.chatSummaryMemory??new q(n),this.harness=new D({llmClient:new $({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs}),inputGatherer:new F({api:t,app:this.app}),approvalGate:new V(this.app),applyRegistry:he(He(this.app)),groundTruthValidator:new j(le(),new H(this.app)),corrections:s})}let e=await this.loadRecipes();if(e.length===0){new h.Notice(`No recipes found in ${ne}`);return}new K(this.app,e,this.settings.defaultTargetPath,t=>{t!==null&&this.runChosenRecipe(t.recipe,t.targetPath)}).open()}async loadRecipes(){let e=new Y(this.app.vault,ne),t=await De(e);return t.errors.length>0&&console.warn("[Huginn] recipe load errors:",t.errors),this.recipes=t.recipes,this.recipes}async runChosenRecipe(e,t){console.log("[Huginn] running recipe:",e.metadata.name,"target:",t);let n=await this.harness.run(e,{targetPath:t,titleQuery:e.metadata.name},{});console.log("[Huginn] recipe result:",n)}openChat(){this.openChatView()}createChatViewServices(){let e=this.chatClient??new $({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs}),t=()=>this.recipes,n=()=>this.harness,s=()=>this.settings,i=()=>({corrections:this.correctionsMemory,user:this.userMemory,summary:this.chatSummaryMemory});return{controller:new Q({app:this.app,llmClient:e,getUserMemoryContext:async()=>(await this.userMemory?.getContext(5))?.text??"",getChatSummaryContext:async()=>(await this.chatSummaryMemory?.getContext(5))?.text??""}),dispatcher:new X({llmClient:e,getRecipes:t,corrections:this.correctionsMemory??void 0}),getHarness:n,getRecipes:t,getSettings:s,getMemory:i}}async openChatView(){let e=this.app.workspace.getLeavesOfType(U)[0]??null;if(e!==null){this.app.workspace.revealLeaf(e);return}let t=this.app.workspace.getRightLeaf(!1);t!==null&&(await t.setViewState({type:U,active:!0}),this.app.workspace.revealLeaf(t))}async installDefaultRecipes(e){let t=await ve(this.app.vault,{force:e}),n=[];t.installed>0&&n.push(`${t.installed} installed`),t.skipped>0&&n.push(`${t.skipped} skipped (already present)`),t.overwritten>0&&n.push(`${t.overwritten} overwritten`),t.errors.length>0&&n.push(`${t.errors.length} errors`),new h.Notice(`Huginn default skills: ${n.join(", ")||"no changes"}`),t.errors.length>0&&console.warn("[Huginn] install default recipes errors:",t.errors),await this.loadRecipes()}};function He(r){return{resolveFile(e){let t=r.vault.getAbstractFileByPath(e);return t instanceof h.TFile?t:null},async readFile(e){if(!(e instanceof h.TFile))throw new Error("Invalid file");return r.vault.read(e)},async writeFile(e,t){if(!(e instanceof h.TFile))throw new Error("Invalid file");await r.vault.modify(e,t)},async processFrontMatter(e,t){if(!(e instanceof h.TFile))throw new Error("Invalid file");await r.fileManager.processFrontMatter(e,t)}}}var we=class extends h.PluginSettingTab{plugin;constructor(e,t){super(e,t),this.plugin=t}display(){let{containerEl:e}=this;e.empty(),e.createEl("h2",{text:"Huginn Settings"}),new h.Setting(e).setName("Ollama base URL").setDesc("Base URL for the Ollama API, without trailing slash.").addText(t=>t.setPlaceholder("http://localhost:11434").setValue(this.plugin.settings.ollamaUrl).onChange(async n=>{this.plugin.settings.ollamaUrl=n.replace(/\/$/,""),await this.plugin.saveData(this.plugin.settings)})),new h.Setting(e).setName("Chat model").setDesc("Ollama model used for skill chat completions. Must be a chat-capable model, not an embedding model.").addText(t=>t.setPlaceholder("qwen3.5:4b").setValue(this.plugin.settings.ollamaChatModel).onChange(async n=>{this.plugin.settings.ollamaChatModel=n,await this.plugin.saveData(this.plugin.settings)})),new h.Setting(e).setName("Chat timeout (ms)").setDesc("Abort chat completion requests after this many milliseconds.").addText(t=>t.setPlaceholder("120000").setValue(String(this.plugin.settings.chatTimeoutMs)).onChange(async n=>{let s=Number(n);Number.isFinite(s)&&s>0&&(this.plugin.settings.chatTimeoutMs=s,await this.plugin.saveData(this.plugin.settings))})),new h.Setting(e).setName("Report-back verbosity").setDesc("How much status feedback the chat sidebar shows when running skills. Verbose is useful while testing; Minimal keeps the chat cleaner.").addDropdown(t=>t.addOption("minimal","Minimal").addOption("normal","Normal").addOption("verbose","Verbose").setValue(this.plugin.settings.reportBackVerbosity).onChange(async n=>{let s=n;(s==="minimal"||s==="normal"||s==="verbose")&&(this.plugin.settings.reportBackVerbosity=s,await this.plugin.saveData(this.plugin.settings))})),new h.Setting(e).setName("Warm up chat model on load").setDesc("Send a trivial chat request when Huginn initializes so the model is already loaded in memory. Increases VRAM/RAM use.").addToggle(t=>t.setValue(this.plugin.settings.warmupOnFocus).onChange(async n=>{this.plugin.settings.warmupOnFocus=n,await this.plugin.saveData(this.plugin.settings)})),new h.Setting(e).setName("Default target note path").setDesc("Default vault path used by the Run Huginn skill chooser.").addText(t=>t.setPlaceholder("notes/gamma.md").setValue(this.plugin.settings.defaultTargetPath).onChange(async n=>{this.plugin.settings.defaultTargetPath=n,await this.plugin.saveData(this.plugin.settings)}))}};
