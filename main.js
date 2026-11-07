"use strict";var ee=Object.defineProperty;var Ie=Object.getOwnPropertyDescriptor;var Fe=Object.getOwnPropertyNames;var De=Object.prototype.hasOwnProperty;var He=(s,e)=>{for(var t in e)ee(s,t,{get:e[t],enumerable:!0})},Ge=(s,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of Fe(e))!De.call(s,r)&&r!==t&&ee(s,r,{get:()=>e[r],enumerable:!(n=Ie(e,r))||n.enumerable});return s};var Je=s=>Ge(ee({},"__esModule",{value:!0}),s);var wt={};He(wt,{default:()=>Z});module.exports=Je(wt);var m=require("obsidian");var H={ollamaUrl:"http://localhost:11434",ollamaChatModel:"qwen3.5:4b",chatTimeoutMs:12e4,warmupOnFocus:!1,defaultTargetPath:"notes/gamma.md",reportBackVerbosity:"verbose"};function fe(s){let e={...H};if(s===null||typeof s!="object")return e;let t=s;if(typeof t.ollamaUrl=="string"&&t.ollamaUrl.length>0&&(e.ollamaUrl=t.ollamaUrl.replace(/\/$/,"")),typeof t.ollamaChatModel=="string"&&t.ollamaChatModel.length>0&&(e.ollamaChatModel=t.ollamaChatModel),typeof t.chatTimeoutMs=="number"&&Number.isFinite(t.chatTimeoutMs)&&t.chatTimeoutMs>0)e.chatTimeoutMs=t.chatTimeoutMs;else if(typeof t.chatTimeoutMs=="string"){let n=Number(t.chatTimeoutMs);Number.isFinite(n)&&n>0&&(e.chatTimeoutMs=n)}return typeof t.warmupOnFocus=="boolean"&&(e.warmupOnFocus=t.warmupOnFocus),typeof t.defaultTargetPath=="string"&&(e.defaultTargetPath=t.defaultTargetPath),(t.reportBackVerbosity==="minimal"||t.reportBackVerbosity==="normal"||t.reportBackVerbosity==="verbose")&&(e.reportBackVerbosity=t.reportBackVerbosity),e}var x=class{constructor(e){this.opts=e}opts;async complete(e){let t=[...this.opts.systemPrompt?[{role:"system",content:this.opts.systemPrompt}]:[],{role:"user",content:e}];return this.chat(t)}async chat(e,t){let n=new AbortController,r=setTimeout(()=>n.abort(),this.opts.timeoutMs??6e4),i=()=>n.abort();t?.addEventListener("abort",i);try{let a=await fetch(`${this.opts.baseUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.opts.model,messages:e,stream:!0}),signal:n.signal});if(!a.ok){let o="";try{o=await a.text()}catch{}return console.warn("[Huginn] Ollama chat HTTP",a.status,o.slice(0,1e3)),null}return await this.readStreamingResponse(a,t)}catch(a){if(a.name==="AbortError"){if(t?.aborted)return null;console.warn("[Huginn] Ollama chat timed out")}else console.warn("[Huginn] Ollama chat failed:",a.message);return null}finally{t?.removeEventListener("abort",i),clearTimeout(r)}}async readStreamingResponse(e,t){if(!e.body)return null;let n=e.body.getReader(),r=new TextDecoder,i="";try{for(;;){if(t?.aborted)return await n.cancel(),null;let{done:a,value:o}=await n.read();if(a)break;let c=r.decode(o,{stream:!0});for(let l of c.split(`
`)){let u=l.trim();if(u)try{let p=JSON.parse(u);if(p.message?.content&&(i+=p.message.content),p.done)break}catch{}}}}finally{n.releaseLock()}return Be(i.trim())}};function Be(s){let e=s.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);return e?e[1].trim():s.trim()}function ve(s,e){return{recipe:s,inputs:e}}function we(s,e=""){let{recipe:t,inputs:n}=s,r=new Map;for(let a of n)r.set(a.key,qe(a.value));let i=ye(t.instructions,r);return e.length>0&&(i+=`

Previous mistakes to avoid for this skill:
${e}`),{prompt:i,outputSchemaText:ye(JSON.stringify(t.outputSchema,null,2),r)}}function qe(s){return s==null?"":typeof s=="string"?s:JSON.stringify(s,null,2)}function ye(s,e){let t=s;for(let[n,r]of e)t=t.split(`{{${n}}}`).join(r);return t}function Re(s,e,t=""){let n=[];return te(s,e,t,n),{ok:n.length===0,errors:n}}function te(s,e,t,n){if(e.enum!==void 0&&!e.enum.some(r=>r===s)){n.push({path:t,message:`value not in enum ${JSON.stringify(e.enum)}`});return}switch(e.type){case"string":typeof s!="string"&&n.push({path:t,message:`expected string, got ${typeof s}`});break;case"number":(typeof s!="number"||Number.isNaN(s))&&n.push({path:t,message:`expected number, got ${typeof s}`});break;case"boolean":typeof s!="boolean"&&n.push({path:t,message:`expected boolean, got ${typeof s}`});break;case"array":if(!Array.isArray(s)){n.push({path:t,message:`expected array, got ${typeof s}`});return}for(let r=0;r<s.length;r++)te(s[r],e.items,`${t}[${r}]`,n);break;case"object":if(s===null||typeof s!="object"||Array.isArray(s)){n.push({path:t,message:`expected object, got ${s===null?"null":typeof s}`});return}Ue(s,e,t,n);break}}function Ue(s,e,t,n){if(e.type!=="object")return;let r=e.required??[];for(let i of r)i in s||n.push({path:`${t}.${i}`,message:"missing required property"});if(e.properties)for(let[i,a]of Object.entries(e.properties))i in s&&te(s[i],a,t?`${t}.${i}`:i,n)}function be(s,e){let t=[];return Ce("",s,e,t),{changes:t}}function Ce(s,e,t,n){if(ne(e,t))return;let r=ke(e),i=ke(t);if(r!==i||r!=="object"){n.push({path:s||".",oldValue:e,newValue:t});return}let a=e,o=t,c=new Set([...Object.keys(a),...Object.keys(o)]);for(let l of c){let u=s?`${s}.${l}`:l;l in a?l in o?Ce(u,a[l],o[l],n):n.push({path:u,oldValue:a[l],newValue:void 0}):n.push({path:u,oldValue:void 0,newValue:o[l]})}}function ke(s){return s===null?"null":Array.isArray(s)?"array":typeof s}function ne(s,e){if(s===e)return!0;if(s===null||e===null||typeof s!=typeof e||typeof s!="object"||Array.isArray(s)!==Array.isArray(e))return!1;if(Array.isArray(s)){let a=s,o=e;if(a.length!==o.length)return!1;for(let c=0;c<a.length;c++)if(!ne(a[c],o[c]))return!1;return!0}let t=s,n=e,r=Object.keys(t),i=Object.keys(n);if(r.length!==i.length)return!1;for(let a of r)if(!Object.prototype.hasOwnProperty.call(n,a)||!ne(t[a],n[a]))return!1;return!0}function Pe(s){if(s.changes.length===0)return"No changes.";let e=[];for(let t of s.changes)e.push(`--- ${t.path}`),e.push(`old: ${JSON.stringify(t.oldValue)}`),e.push(`new: ${JSON.stringify(t.newValue)}`);return e.join(`
`)}var A=class{constructor(e){this.opts=e}opts;async run(e,t,n,r){let i=await this.opts.inputGatherer.gather(e,t),a=this.opts.corrections?await this.opts.corrections.getContext(e.metadata.name,5):{text:""},o=we(ve(e,i),a.text),c=await this.opts.llmClient.complete(o.prompt,r),l={raw:c??"",json:void 0},u=!1,p=[],h=!0,d=[];if(c===null)p.push({path:"",message:"LLM client returned null"});else{try{l.json=JSON.parse(c)}catch(y){p.push({path:"",message:`Output is not valid JSON: ${y.message}`})}if(l.json!==void 0){let y=Re(l.json,e.outputSchema);if(u=y.ok,p.push(...y.errors),u&&this.opts.groundTruthValidator){let D=await this.opts.groundTruthValidator.validate(e,i,l.json);h=D.ok,d.push(...D.errors)}}}let v=l.json,g=be(n??{},v??{}),f=null,w=null,C=We(i);if(u&&h)if(e.applyMethod==="noop")f=null,w=null;else if(f=await this.opts.approvalGate.approve({diffText:JSON.stringify(g),output:v??{},recipeName:e.metadata.name,targetPath:C}),f===!0){let y=this.opts.applyRegistry.get(e.applyMethod);y?w=await y({recipe:e,output:v??{},inputs:i}):w={applied:!1,message:`Unknown apply method: ${e.applyMethod}`}}else f===!1&&(w={applied:!1,message:"Rejected by approval gate."});return this.opts.corrections&&(u?h?w?.applied===!1&&await this.opts.corrections.append({recipe:e.metadata.name,type:"apply-failed",key:w.message.slice(0,120),note:`Apply failed: ${w.message}. Output was: ${JSON.stringify(l.json??null).slice(0,400)}`}):await this.opts.corrections.append({recipe:e.metadata.name,type:"ground-truth",key:d.map(y=>y.message).join("; ").slice(0,120),note:`Ground-truth check failed: ${d.map(y=>y.message).join("; ")}`}):await this.opts.corrections.append({recipe:e.metadata.name,type:"schema-error",key:p.map(y=>y.message).join("; ").slice(0,120),note:`Schema validation failed: ${p.map(y=>y.message).join("; ")}. Output was: ${JSON.stringify(l.json??null).slice(0,400)}`})),{recipeName:e.metadata.name,renderedPrompt:o.prompt,parsedOutput:l,schemaValid:u,schemaErrors:p,groundTruthValid:h,groundTruthErrors:d,diff:g,approved:f,applyResult:w}}async warmup(){await this.opts.llmClient.complete('Say "ok". Return only the word ok.')}};function We(s){let e=s.find(t=>t.key==="targetPath");return typeof e?.value=="string"?e.value:void 0}var J=require("obsidian");var G=class extends J.Modal{request;onConfirm;constructor(e,t,n){super(e),this.request=t,this.onConfirm=n}onOpen(){let{contentEl:e}=this;e.empty(),e.createEl("h2",{text:`Huginn: Approve ${this.request.recipeName}`}),this.request.targetPath&&e.createEl("p",{text:`Target: ${this.request.targetPath}`}),this.request.reason&&e.createEl("p",{text:this.request.reason});let t=Pe(this.request.diff);e.createEl("pre",{cls:"huginn-diff",attr:{style:"white-space: pre-wrap; background: var(--background-secondary); padding: 1em; border-radius: 6px;"}}).setText(t);let r=e.createDiv({cls:"huginn-approval-buttons"});r.style.display="flex",r.style.gap="1em",r.style.marginTop="1em",new J.Setting(r).addButton(i=>{i.setButtonText("Reject"),i.onClick(()=>{this.close(),this.onConfirm(!1)})}).addButton(i=>{i.setButtonText("Approve"),i.setCta(),i.onClick(()=>{this.close(),this.onConfirm(!0)})})}onClose(){let{contentEl:e}=this;e.empty()}};var $=class{constructor(e){this.app=e}app;async approve(e){let t;try{t=JSON.parse(e.diffText)}catch{t={changes:[]}}return new Promise(n=>{new G(this.app,{recipeName:e.recipeName,targetPath:e.targetPath??"",diff:t,reason:this.describeOutput(e.output)},i=>{n(i)}).open()})}describeOutput(e){if(e===null||typeof e!="object")return;let t=e,n=[];if(typeof t.tag=="string"&&n.push(`Proposed tag: ${t.tag}`),typeof t.reason=="string"&&n.push(`Reason: ${t.reason}`),n.length!==0)return n.join(`
`)}};var O=class{constructor(e){this.opts=e}opts;async gather(e,t){let n={},r=[];for(let i of e.inputs){let a=await this.resolveInput(i,t??{},n);n[i.key]=a,r.push({key:i.key,value:a})}return r}async resolveInput(e,t,n){switch(e.source){case"recipe-param":return t[e.key]??this.opts.defaultTargetPath??null;case"content":{let r=String(n.targetPath??t.targetPath??this.opts.defaultTargetPath??"");return this.gatherContent(r)}case"vocabulary":return this.gatherVocabulary();case"query":{let r=e.queryKey??e.key,i=String(n[r]??t[r]??"");return this.gatherQuery(i)}case"path":{let r=String(t[e.key]??this.opts.defaultTargetPath??"");return this.gatherRelatedChunks(r)}case"constant":return t[e.key]??null;default:return null}}gatherVocabulary(){return this.opts.api.tagVocabulary()}gatherQuery(e){if(!e||e.length<2)return null;let t=this.opts.api.searchText(e);return t===null?null:{hits:t.hits.slice(0,20)}}gatherRelatedChunks(e){return!e||e.length===0?null:this.opts.api.relatedChunks(e,10)}async gatherContent(e){if(!e||e.length===0)return null;let t=this.opts.app.vault.getAbstractFileByPath(e);return!t||!ze(t)?null:this.opts.app.vault.cachedRead(t)}};function ze(s){return typeof s=="object"&&s!==null&&"path"in s&&"extension"in s}function M(s,e){if(e===""||e==="/")return s;let t=e.replace(/^\//,"").split("."),n=s;for(let r of t){if(n===null||typeof n!="object"||Array.isArray(n))return;n=n[r]}return n}function _e(){let s=new Map;function e(n,r){s.set(n,r)}function t(n){return s.get(n)}return{register:e,get:t}}function oe(s){let{resolveFile:e,readFile:t,writeFile:n,processFrontMatter:r}=s,i=_e();return i.register("noop",async a=>({applied:!1,message:`no-op apply for ${a.recipe.metadata.name}: ${JSON.stringify(a.output).slice(0,200)}`})),i.register("append-frontmatter-array",async a=>{let o=a.recipe.applyParams??{},c=S(o,"key","tags"),l=S(o,"valuePath","value"),u=Ke(o,"unique",!0),p=M(a.output,l);if(!p||typeof p!="string"&&typeof p!="number")return{applied:!1,message:`No ${l} provided; nothing to apply.`};let h=String(p),d=re(a.inputs),v=d?e(d):null;if(!d||!se(v))return{applied:!1,message:`Target note not found: ${d??"unknown"}`};try{if(r)await r(v,g=>{let f=xe(g[c]);(!u||!f.includes(h))&&f.push(h),g[c]=f});else{let g=await t(v),{frontmatter:f,body:w}=ie(g),C=xe(f[c]);(!u||!C.includes(h))&&C.push(h),f[c]=C,await n(v,ae(f,w))}return{applied:!0,message:`Added '${h}' to frontmatter ${c} of ${d}.`}}catch(g){return{applied:!1,message:`Failed to write ${c} '${h}' to ${d}: ${g.message}`}}}),i.register("set-first-heading",async a=>{let o=a.recipe.applyParams??{},c=S(o,"valuePath","title"),l=M(a.output,c);if(!l||typeof l!="string"||l.length===0)return{applied:!1,message:`No ${c} provided; nothing to apply.`};let u=re(a.inputs),p=u?e(u):null;if(!u||!se(p))return{applied:!1,message:`Target note not found: ${u??"unknown"}`};try{let h=await t(p),{frontmatter:d,body:v}=ie(h);d.title=l;let g=v.trimStart(),f=g.startsWith("# ")?`# ${l}
${g.slice(g.indexOf(`
`)+1)}`:`# ${l}

${v}`;return await n(p,ae(d,f)),{applied:!0,message:`Set first heading to '${l}' in ${u}.`}}catch(h){return{applied:!1,message:`Failed to write title '${l}' to ${u}: ${h.message}`}}}),i.register("append-section",async a=>{let o=a.recipe.applyParams??{},c=S(o,"heading","Related"),l=S(o,"valuePath","items"),u=S(o,"itemTemplate","- {{value}}"),p=M(a.output,l),h=Array.isArray(p)?p.filter(g=>typeof g=="string"&&g.length>0):[];if(h.length===0)return{applied:!1,message:`No ${l} provided; nothing to apply.`};let d=re(a.inputs),v=d?e(d):null;if(!d||!se(v))return{applied:!1,message:`Target note not found: ${d??"unknown"}`};try{let g=await t(v),{frontmatter:f,body:w}=ie(g),C=h.map(Ve=>u.replace(/\{\{value\}\}/g,Ye(Ve))).join(`
`),y=w.length>0&&!w.endsWith(`

`)?`

`:"",D=`${w}${y}## ${c}
${C}
`;return await n(v,ae(f,D)),{applied:!0,message:`Added ${h.length} item(s) to ${d}: ${h.join(", ")}`}}catch(g){return{applied:!1,message:`Failed to write ${l} to ${d}: ${g.message}`}}}),i}function re(s){let e=s.find(t=>t.key==="targetPath");return typeof e?.value=="string"?e.value:void 0}function se(s){return typeof s=="object"&&s!==null&&"path"in s&&"extension"in s}function Ye(s){return s.replace(/\.md$/i,"")}function ie(s){if(!s.startsWith(`---
`))return{frontmatter:{},body:s};let e=s.indexOf(`
---`,4);if(e===-1)return{frontmatter:{},body:s};let t=s.slice(4,e),n=s.slice(e+4);return{frontmatter:Qe(t),body:n}}function ae(s,e){let t=Object.keys(s);if(t.length===0)return e;let n=["---"];for(let r of t){let i=s[r];if(Array.isArray(i)){n.push(`${r}:`);for(let a of i)n.push(`  - ${String(a)}`)}else(typeof i=="string"||typeof i=="number"||typeof i=="boolean")&&n.push(`${r}: ${String(i)}`)}return n.push("---"),`${n.join(`
`)}${e.startsWith(`
`)?"":`
`}${e}`}function xe(s){return Array.isArray(s)?s.filter(e=>typeof e=="string"):typeof s=="string"?s.split(",").map(e=>e.trim()).filter(Boolean):[]}function S(s,e,t){let n=s[e];return typeof n=="string"?n:t}function Ke(s,e,t){let n=s[e];return typeof n=="boolean"?n:t}function Qe(s){let e={},t=s.split(`
`),n=null;for(let r of t){let i=r.trim();if(i.length===0||i.startsWith("#"))continue;if(i.startsWith("- ")){let l=i.slice(2);n&&e[n].push(l);continue}let a=i.indexOf(": ");if(a===-1)continue;let o=i.slice(0,a),c=i.slice(a+2);c===""?(e[o]=[],n=o):(e[o]=Xe(c),n=null)}return e}function Xe(s){return/^-?\d+(\.\d+)?$/.test(s)?Number(s):s}var le=class{primitives=new Map;register(e){return this.primitives.set(e.name,e),this}get(e){return this.primitives.get(e)}};function ce(){return new le().register(Ze).register(et).register(tt).register(nt)}var N=class{constructor(e,t){this.registry=e;this.vault=t}registry;vault;async validate(e,t,n){let r=[];for(let i of e.validation)await this.validateRule(e,i,t,n,r);return{ok:r.length===0,errors:r}}async validateRule(e,t,n,r,i){let a=rt(r,t.path);if(a===void 0){i.push({path:t.path,message:"output value missing for ground-truth check"});return}let o=this.registry.get(t.primitive);if(!o){i.push({path:t.path,message:`unsupported ground-truth primitive: ${t.primitive}`});return}let c={recipe:e,output:a,inputs:n,vault:this.vault};i.push(...await o.validate(c,t.params??{}))}},Ze={name:"file-exists",async validate({vault:s,output:e},t){let n=String(e);return s.getFileFrontmatter(n)!==null?[]:[{path:String(t.path??"/"),message:`file does not exist: ${n}`}]}},et={name:"file-not-exists",async validate({vault:s,output:e},t){let n=String(e);return s.getFileFrontmatter(n)!==null?[{path:String(t.path??"/"),message:`file already exists: ${n}`}]:[]}},tt={name:"frontmatter-contains",async validate({vault:s,output:e,inputs:t},n){let r=Me(t,String(n.targetPathInput??"targetPath"));if(!r)return[{path:String(n.path??"/"),message:"missing targetPath input for frontmatter check"}];let i=s.getFileFrontmatter(r);if(i===null)return[{path:String(n.path??"/"),message:`target file not found: ${r}`}];let a=String(n.key??"tags"),o=i[a];return Se(o,e)?[]:[{path:String(n.path??"/"),message:`value does not match frontmatter key '${a}'`}]}},nt={name:"frontmatter-not-contains",async validate({vault:s,output:e,inputs:t},n){let r=Me(t,String(n.targetPathInput??"targetPath"));if(!r)return[{path:String(n.path??"/"),message:"missing targetPath input for frontmatter check"}];let i=s.getFileFrontmatter(r);if(i===null)return[{path:String(n.path??"/"),message:`target file not found: ${r}`}];let a=String(n.key??"tags"),o=i[a];return Se(o,e)?[{path:String(n.path??"/"),message:`value already present in frontmatter key '${a}'`}]:[]}};function Me(s,e){let n=s.find(r=>r.key===e)?.value;return typeof n=="string"?n:void 0}function rt(s,e){if(e===""||e==="/")return s;let t=e.replace(/^\//,"").split("/"),n=s;for(let r of t){if(n===null||typeof n!="object"||Array.isArray(n))return;n=n[r]}return n}function Se(s,e){return s==null?!1:Array.isArray(s)?s.some(t=>t===e):s===e}var ue=require("obsidian"),E=class{constructor(e){this.app=e}app;getFileFrontmatter(e){let t=this.app.vault.getAbstractFileByPath(e);return!t||!(t instanceof ue.TFile)?null:this.app.metadataCache.getFileCache(t)?.frontmatter??{}}async readFile(e){let t=this.app.vault.getAbstractFileByPath(e);if(!t||!(t instanceof ue.TFile))return null;try{return await this.app.vault.cachedRead(t)}catch{return null}}};var k=require("obsidian"),L=class{constructor(e){this.vault=e}vault;async read(e){let t=(0,k.normalizePath)(e),n=this.vault.getAbstractFileByPath(t);if(!n||!(n instanceof k.TFile))throw new Error(`Memory file not found: ${e}`);return this.vault.cachedRead(n)}async write(e,t){let n=(0,k.normalizePath)(e);await this.ensureFolder(n);let r=this.vault.getAbstractFileByPath(n);r&&r instanceof k.TFile?await this.vault.modify(r,t):await this.vault.create(n,t)}async exists(e){let t=(0,k.normalizePath)(e);return this.vault.getAbstractFileByPath(t)instanceof k.TFile}async ensureFolder(e){let t=e.split("/");t.pop();let n="";for(let r of t){n=n?`${n}/${r}`:r;let i=this.vault.getAbstractFileByPath((0,k.normalizePath)(n));(!i||!(i instanceof k.TFolder))&&await this.vault.createFolder((0,k.normalizePath)(n))}}};var T=class{constructor(e,t){this.storage=e;this.basePath=t}storage;basePath;async append(e,t){let n=this.resolvePath(e),r=this.formatEntry(t),i=await this.readRaw(n);i.length>0&&!i.endsWith(`
`)&&(i+=`
`),i.length>0&&(i+=`
---

`),i+=r,await this.storage.write(n,i)}async readContext(e,t={}){let n=this.resolvePath(e),r=await this.readRaw(n);if(r.trim().length===0)return"";let a=this.parseEntries(r);t.recipe&&(a=a.filter(l=>l.recipe===t.recipe));let o=t.limit??10,c=a.slice(-o);return c.length===0?"":c.map(l=>`- ${l.type}${l.recipe?` (${l.recipe})`:""}: ${l.note}`).join(`
`)+`
`}async summarizeRecurrence(e,t=4){let n=this.resolvePath(e),r=await this.readRaw(n);if(r.trim().length===0)return[];let i=this.parseEntries(r),a=new Map;for(let l of i){let u=this.recurrenceKey(l);a.set(u,(a.get(u)??0)+1)}let o=new Set,c=[];for(let l=i.length-1;l>=0;l--){let u=i[l],p=this.recurrenceKey(u),h=a.get(p)??0;h>=t&&!o.has(p)&&(o.add(p),c.unshift({...u,recurrence:h}))}return c}resolvePath(e){return`${this.basePath.replace(/\/$/,"")}/${e.replace(/^\//,"")}`}async readRaw(e){return await this.storage.exists(e)?this.storage.read(e):""}formatEntry(e){let t=["---"];return t.push(`date: ${e.date}`),t.push(`type: ${e.type}`),e.recipe&&t.push(`recipe: ${e.recipe}`),t.push(`key: ${e.key}`),e.recurrence!==void 0&&t.push(`recurrence: ${e.recurrence}`),t.push("---"),t.push(e.note.trim()),t.join(`
`)}parseEntries(e){let t=[],n=e.replace(/\r\n?/g,`
`),r=0;for(;r<n.length;){let i=n.indexOf(`---
`,r);if(i===-1)break;let a=i+4,o=n.indexOf(`
---`,a);if(o===-1)break;let c=n.slice(a,o).trim(),l=o+4,u=n.indexOf(`
---
`,l);u===-1&&(u=n.length);let p=n.slice(l,u).trim(),h=this.parseFrontmatter(c);r=u===n.length?u:u+5,!(!h.type||!h.key)&&t.push({date:typeof h.date=="string"?h.date:new Date().toISOString(),type:String(h.type),recipe:typeof h.recipe=="string"?h.recipe:void 0,key:String(h.key),note:p,recurrence:typeof h.recurrence=="number"?h.recurrence:void 0})}return t}parseFrontmatter(e){let t={};for(let n of e.split(`
`)){let r=n.replace(/\r$/,"").trim();if(r.length===0)continue;let i=r.indexOf(": ");if(i===-1)continue;let a=r.slice(0,i).trim(),o=r.slice(i+2).trim();o==="true"?t[a]=!0:o==="false"?t[a]=!1:/^-?\d+$/.test(o)?t[a]=Number(o):t[a]=o}return t}recurrenceKey(e){return[e.type,e.recipe??"_none_",e.key].join("|")}};var pe="Agents/Huginn/MEMORY";function he(){return new Date().toISOString()}var j=class{store;constructor(e){this.store=new T(e,pe)}async append(e){let t={date:he(),type:e.type,recipe:e.recipe,key:e.key,note:e.note};await this.store.append("corrections.md",t)}async getContext(e,t){let n=await this.store.readContext("corrections.md",{recipe:e,limit:t});return n.length===0?{text:""}:{text:`Previous mistakes to avoid:
${n}`}}async promoted(e=4){return this.store.summarizeRecurrence("corrections.md",e)}},V=class{store;constructor(e){this.store=new T(e,pe)}async append(e){let t={date:he(),type:e.type,key:e.key,note:e.note};await this.store.append("user.md",t)}async getContext(e){let t=await this.store.readContext("user.md",{limit:e});return t.length===0?{text:""}:{text:`Things the user has told you:
${t}`}}},I=class{store;constructor(e){this.store=new T(e,pe)}async append(e){let t={date:he(),type:"chat-summary",key:e.key,note:e.note};await this.store.append("chat-summaries.md",t)}async getContext(e){let t=await this.store.readContext("chat-summaries.md",{limit:e});return t.length===0?{text:""}:{text:`Summaries of earlier conversations:
${t}`}}};var P=require("obsidian"),B=class{constructor(e,t){this.vault=e;this.dir=t}vault;dir;async listRecipes(){let e=(0,P.normalizePath)(this.dir),t=this.vault.getAbstractFileByPath(e);return t===null||!(t instanceof P.TFolder)?(console.warn("[Huginn] recipe folder not found in vault index:",e),[]):t.children.filter(n=>n instanceof P.TFile).filter(n=>n.extension==="md").map(n=>n.path).sort()}async readRecipe(e){let t=(0,P.normalizePath)(e),n=this.vault.getAbstractFileByPath(t);if(n===null)throw new Error(`Recipe not found: ${e}`);return this.vault.cachedRead(n)}};function Ae(s,e){let t=[],n=st(s);if(n===void 0)return t.push("Missing YAML frontmatter block"),{ok:!1,errors:t};let r=it(n,t),i=at(s),a=ot(i.get("trigger"),t),o=lt(i.get("inputs"),t),c=Te(i.get("instructions"),"Instructions",t),l=ct(i.get("output contract"),t),u=Te(i.get("apply method"),"Apply Method",t),p=ht(i.get("apply params"),t),h=ut(i.get("validation"),t),d=pt(i.get("chat render"),t);return t.length>0?{ok:!1,errors:t}:{ok:!0,recipe:{metadata:r,trigger:a,inputs:o,instructions:c,outputSchema:l,applyMethod:u,applyParams:p,validation:h,chatRender:d},errors:t}}function st(s){let e=s.trim();if(!e.startsWith("---"))return;let t=e.indexOf("---",3);if(t!==-1)return e.slice(3,t).trim()}function it(s,e){let t=s.split(`
`).map(r=>r.replace(/\r$/,"")),n={};for(let r of t){let i=r.indexOf(":");if(i===-1)continue;let a=r.slice(0,i).trim(),o=r.slice(i+1).trim();a==="name"?n.name=o:a==="version"?n.version=o:a==="modelTier"?n.modelTier=o:a==="riskClass"&&(n.riskClass=o)}if((!n.name||n.name.length===0)&&e.push("Metadata missing name"),(!n.version||n.version.length===0)&&e.push("Metadata missing version"),(!n.modelTier||!["fast","capable"].includes(n.modelTier))&&e.push("Metadata missing or invalid modelTier (fast | capable)"),(!n.riskClass||!["read-only","suggest"].includes(n.riskClass))&&e.push("Metadata missing or invalid riskClass (read-only | suggest)"),!(e.length>0))return n}function at(s){let e=new Map,t=s.replace(/^---[\s\S]*?---\n?/,""),n=/^#\s+(.+)$/m,r=null,i=[];function a(){r!==null&&(e.set(r.toLowerCase().trim(),i.join(`
`).trim()),i.length=0)}for(let o of t.split(`
`)){let c=o.replace(/\r$/,""),l=n.exec(c);if(l){a(),r=l[1].trim();continue}r!==null&&i.push(c)}return a(),e}function ot(s,e){if(!s||s.length===0){e.push("Missing # Trigger section");return}return{description:s}}function lt(s,e){if(!s||s.length===0)return[];let t=[],n=$e(s);for(let r of n){let i=R(r,"key"),a=R(r,"description"),o=R(r,"source"),c=R(r,"queryKey");if(!i||!a){e.push(`Invalid input entry (missing key or description): ${r.slice(0,40)}`);continue}if(!o||!["query","path","vocabulary","constant","recipe-param","content"].includes(o)){e.push(`Invalid input source for ${i}: ${o}`);continue}let l={key:i,description:a,source:o};o==="query"&&c&&(l.queryKey=c),t.push(l)}return t}function Te(s,e,t){if(!s||s.trim().length===0){t.push(`Missing or empty # ${e} section`);return}return s.trim()}function ct(s,e){if(!s||s.length===0){e.push("Missing # Output Contract section");return}let t;try{t=JSON.parse(s)}catch(r){e.push(`Output Contract is not valid JSON: ${r.message}`);return}let n=de(t,"outputSchema",e);if(!n||n.type!=="object"){e.push("Output Contract root must be an object schema");return}return n}function ut(s,e){if(!s||s.length===0)return[];let t=[],n=$e(s);for(let r of n){let i=R(r,"primitive"),a=R(r,"path"),o=R(r,"description");if(R(r,"source")||R(r,"check")){e.push(`Validation uses deprecated 'source'/'check' fields; use 'primitive' instead: ${r.slice(0,60)}`);continue}if(!i||!a){e.push(`Invalid validation entry (missing primitive or path): ${r.slice(0,60)}`);continue}let c=R(r,"params"),l={};if(c)try{l=JSON.parse(c)}catch(p){e.push(`Invalid validation params for ${a}: ${p.message}`);continue}let u={primitive:i,path:a};o&&(u.description=o),Object.keys(l).length>0&&(u.params=l),t.push(u)}return t}function pt(s,e){if(!s||s.trim().length===0)return;let t=R(s,"template"),n=R(s,"field"),r=R(s,"message");if(!t||!["paragraph","numbered-list","bulleted-list","json"].includes(t)){e.push("Invalid or missing chat render template (paragraph | numbered-list | bulleted-list | json)");return}if(!n||n.length===0){e.push("Chat render requires a 'field' path into the output object");return}return{template:t,field:n,message:r}}function ht(s,e){if(!(!s||s.trim().length===0))try{return JSON.parse(s)}catch(t){e.push(`Apply Params is not valid JSON: ${t.message}`);return}}function de(s,e,t){if(s===null||typeof s!="object"||Array.isArray(s)){t.push(`Schema at ${e} must be an object`);return}let n=s,r=n.type;if(typeof r!="string"||!dt(r)){t.push(`Schema at ${e} missing or invalid type`);return}let i={type:r,description:typeof n.description=="string"?n.description:void 0,enum:Array.isArray(n.enum)?n.enum:void 0};switch(r){case"string":return i;case"number":return i;case"boolean":return i;case"array":{if(!n.items||typeof n.items!="object"||Array.isArray(n.items)){t.push(`Schema at ${e} array missing items`);return}let a=de(n.items,`${e}.items`,t);return a?{...i,items:a}:void 0}case"object":{let a={};if(n.properties&&typeof n.properties=="object"&&!Array.isArray(n.properties)){let c=n.properties;for(let[l,u]of Object.entries(c)){let p=de(u,`${e}.${l}`,t);if(!p)return;a[l]=p}}let o=Array.isArray(n.required)?n.required.filter(c=>typeof c=="string"):void 0;return{...i,properties:a,required:o}}}}function dt(s){return["string","number","boolean","array","object"].includes(s)}function $e(s){let e=[],t=s.split(`
`).map(r=>r.replace(/\r$/,"")),n=[];for(let r of t)if(r.startsWith("- "))n.length>0&&e.push(n.join(`
`).trim()),n=[r.slice(2).trim()];else{if(r.trim().length===0)continue;n.length>0&&n.push(r)}return n.length>0&&e.push(n.join(`
`).trim()),e}function R(s,e){let t=s.split(`
`).map(n=>n.replace(/\r$/,""));for(let n=0;n<t.length;n++){let r=t[n],i=r.indexOf(":");if(i===-1||r.slice(0,i).trim()!==e)continue;let o=r.slice(i+1).trim();if(o.startsWith("|")){let c=[],l=n+1;for(;l<t.length&&(t[l].startsWith("  ")||t[l].startsWith("	"));)c.push(t[l].replace(/^[ \t]+/,"")),l++;return c.join(`
`).trim()}return o}}async function Oe(s){let e=await s.listRecipes(),t=[],n=[];for(let r of e)if(r.endsWith(".md"))try{let i=await s.readRecipe(r),a=Ae(i,r);if(!a.ok){n.push(`Recipe ${r}: ${a.errors.join("; ")}`);continue}t.push({...a.recipe,sourcePath:r})}catch(i){n.push(`Recipe ${r}: read failed \u2014 ${i.message}`)}return{ok:n.length===0,recipes:t,errors:n}}var Ne=[{fileName:"tag-assignment.md",content:`---
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
  description: Path of the note to rename
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

# Instructions
You are a task assistant. Read the note below and generate a list of *implied*
actionable TODOs. These are not existing Obsidian task lines; they are actions a
reader would infer from the prose. Keep each TODO concise and phrased as a task.

Target note path: {{targetPath}}

Note content:
{{content}}

Return a JSON object with one field:
- todos: an array of short TODO strings

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["todos"],
  "properties": {
    "todos": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}

# Apply Method
noop

# Chat Render
template: numbered-list
field: todos
message: No actionable TODOs found.

# Validation
`}];var q="Agents/Huginn/SKILLS";async function me(s,e={}){let t={installed:0,skipped:0,overwritten:0,errors:[]};if(!s.getAbstractFileByPath(q))try{await s.createFolder(q)}catch(r){return t.errors.push(`Failed to create ${q}: ${r.message}`),t}for(let r of Ne){let i=`${q}/${r.fileName}`,a=s.getAbstractFileByPath(i);if(a&&!e.force){t.skipped++;continue}try{a?(await s.modify(a,r.content),t.overwritten++):(await s.create(i,r.content),t.installed++)}catch(o){t.errors.push(`Failed to write ${i}: ${o.message}`)}}return t}var b=require("obsidian");function U(s){let e=s.trim();return!e||e.length===0||e.endsWith(".md")||/[?#\[]/.test(e)?e:`${e}.md`}var W=class extends b.Modal{recipes;chosen=null;targetPath="";onConfirm;constructor(e,t,n,r){super(e),this.recipes=t,this.targetPath=n,this.onConfirm=r,t.length>0&&(this.chosen=t[0])}onOpen(){let{contentEl:e}=this;if(e.empty(),e.createEl("h2",{text:"Huginn: Run skill"}),this.recipes.length===0){e.createEl("p",{text:"No recipes found."});return}new b.Setting(e).setName("Recipe").setDesc("Choose the skill recipe to run.").addDropdown(t=>{for(let n of this.recipes)t.addOption(n.sourcePath,n.metadata.name);t.setValue(this.chosen?.sourcePath??""),t.onChange(n=>{this.chosen=this.recipes.find(r=>r.sourcePath===n)??null})}),new b.Setting(e).setName("Target note path").setDesc("Vault path of the note to run the skill against.").addText(t=>{t.setPlaceholder("notes/gamma.md"),t.setValue(this.targetPath),t.onChange(n=>{this.targetPath=n})}),new b.Setting(e).addButton(t=>{t.setButtonText("Run"),t.setCta(),t.onClick(()=>{if(this.chosen===null){new b.Notice("Please select a recipe.");return}let n=U(this.targetPath);if(n.length===0){new b.Notice("Please enter a target note path.");return}this.close(),this.onConfirm({recipe:this.chosen,targetPath:n})})})}onClose(){this.chosen===null&&this.onConfirm(null);let{contentEl:e}=this;e.empty()}};var z=class{opts;constructor(e){this.opts=e}async createSession(){let{path:e,content:t}=await this.readActiveNote(),n=await this.buildSystemPrompt(e,t);return{messages:n?[{role:"system",content:n}]:[],activeNotePath:e,activeNoteContent:t}}async sendMessage(e,t,n){let r=[...e.messages,{role:"user",content:t}],i=await this.opts.llmClient.chat(r,n);if(i===null)return{response:null,updatedSession:e};let a={role:"assistant",content:i};return{response:i,updatedSession:{...e,messages:[...r,a]}}}async summarizeChat(e,t){let n=e.map(i=>`${i.role==="user"?"User":"Huginn"}: ${i.content}`).join(`

`),r=[{role:"system",content:"You are a concise conversation summarizer. You will be given a transcript of a user/assistant chat. Produce a short paragraph summary of facts, decisions, and context the user would want to recall in future chats. Return only the summary, with no preamble, role labels, or markdown fences."},{role:"user",content:`Summarize this conversation:

${n}`}];return this.opts.llmClient.chat(r,t)}async readActiveNote(){let e=this.opts.app.workspace.getActiveFile();if(!e||typeof e!="object"||!("path"in e))return{path:null,content:null};try{let t=await this.opts.app.vault.cachedRead(e);return{path:e.path,content:t}}catch(t){return console.warn("[Huginn] failed to read active note:",t.message),{path:e.path,content:null}}}async buildSystemPrompt(e,t){let n=["You are Huginn, an AI assistant embedded in Obsidian as a vault-aware chat companion.","","Your job is to help the user with their notes and general knowledge. Be concise but useful.","","Guidelines:","- The user is looking at an Obsidian note. Use the note content below when the question is about it.","- If the question is not about the active note, answer from general knowledge rather than inventing a connection.","- Prefer short, actionable answers. Use markdown formatting (headings, lists, code fences) when it improves readability.","- Do not claim the note says something it does not. If the note lacks the answer, say so.","- You cannot rename, move, delete, or otherwise modify files unless the user explicitly asks you to run a skill."];if(this.opts.getUserMemoryContext){let r=await this.opts.getUserMemoryContext();r.length>0&&n.push("",r)}if(this.opts.getChatSummaryContext){let r=await this.opts.getChatSummaryContext();r.length>0&&n.push("",r)}return e&&t?n.push("",`Active note path: ${e}`,"","Note content:","---",t,"---"):n.push("","No active note is currently open. Answer from general knowledge."),n.join(`
`)}};var _=class{constructor(e){this.opts=e}opts;async dispatch(e,t,n){let r=await this.buildDispatchMessages(e,t),i=await this.opts.llmClient.chat(r,n);return i===null?{intent:null,raw:null}:{intent:this.parseDispatch(i),raw:i}}async buildDispatchMessages(e,t){let n=this.opts.getRecipes().map(a=>`- ${a.metadata.name}: ${a.trigger.description}`).join(`
`),r=this.opts.corrections?await this.opts.corrections.getContext(void 0,5):{text:""};return[{role:"system",content:["You are Huginn, a dispatcher inside Obsidian. The user has typed a request in a chat panel.","Your job is to choose the best matching skill from the list below, and to identify which vault note the skill should target.","","Available skills:",n,"","Rules:","- Return ONLY a raw JSON object with three fields: recipeName, targetPath, reason.","- recipeName must exactly match one of the available skill names.",`- targetPath should be a vault-relative note path ending in .md. If the user does not name a note, use "${t??"no active note"}" as the fallback target path.`,"- reason should be one sentence explaining why you chose this skill.",'- If no skill matches the request, return {"recipeName":"", "targetPath":"", "reason":"No matching skill."}.',"- Do not return markdown, commentary, or code fences.",r.text.length>0?`
${r.text}`:""].join(`
`)},{role:"user",content:e}]}parseDispatch(e){let t=e.trim(),n=t.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);n&&(t=n[1].trim());try{let r=JSON.parse(t);return typeof r.recipeName!="string"||typeof r.targetPath!="string"||typeof r.reason!="string"||r.recipeName.length===0||!this.opts.getRecipes().find(a=>a.metadata.name===r.recipeName)?null:{recipeName:r.recipeName,targetPath:r.targetPath,reason:r.reason}}catch{return null}}};var Q=require("obsidian");function Y(){return{messages:[],activeNotePath:null,activeNoteContent:null}}function mt(s){if(s===null||typeof s!="object")return!1;let e=s;return(e.role==="system"||e.role==="user"||e.role==="assistant")&&typeof e.content=="string"}function Ee(s){if(s===null||typeof s!="object")return null;let e=s,t=Y();return typeof e.activeNotePath=="string"&&(t.activeNotePath=e.activeNotePath),(typeof e.activeNoteContent=="string"||e.activeNoteContent===null)&&(t.activeNoteContent=e.activeNoteContent),Array.isArray(e.messages)&&(t.messages=e.messages.filter(mt)),t}var gt=[{type:"remember",regex:/^\s*(?:remember|note|add a memory|memorize)\s*(?:that\s*)?(.+)$/is},{type:"avoid",regex:/^\s*(?:don't|do not|avoid|never)\s*(?:you\s*)?(.+)$/is},{type:"preference",regex:/^\s*(?:i prefer|my preference is|use)\s*(?:that\s*)?(.+)$/is},{type:"fact",regex:/^\s*(?:for context|fyi|just so you know)\s*(?:that\s*)?(.+)$/is}];function Le(s){let e=s.trim();if(e.length===0)return null;for(let{type:t,regex:n}of gt){let r=e.match(n);if(r&&r[1]){let i=r[1].trim().replace(/\.$/,""),a=i.slice(0,120);return{type:t,key:a,note:i}}}return null}var F="huginn-chat",K=class extends Q.ItemView{services;session;container=null;messagesContainer=null;inputEl=null;sendButton=null;contextEl=null;isLoading=!1;abortController=null;activeLeafChangeRef=null;get verbosity(){return this.services.getSettings().reportBackVerbosity}constructor(e,t){super(e),this.services=t,this.session=Y()}get harness(){return this.services.getHarness()}getViewType(){return F}getDisplayText(){return"Huginn Chat"}getIcon(){return"message-square"}async onOpen(){this.container=this.contentEl.createDiv({cls:"huginn-chat-view"}),this.render(),await this.refreshContext(),this.activeLeafChangeRef=this.app.workspace.on("active-leaf-change",()=>{this.refreshContext(!1)})}async onClose(){this.activeLeafChangeRef&&(this.app.workspace.offref(this.activeLeafChangeRef),this.activeLeafChangeRef=null),this.container?.empty()}getState(){return{messages:[],activeNotePath:null,activeNoteContent:null}}async setState(e,t){Ee(e)!==null&&(this.session=Y(),this.applySessionToDom(),window.setTimeout(()=>{this.refreshContext()},0))}render(){if(!this.container)return;this.container.empty();let e=this.container.createEl("div",{cls:"huginn-chat-header"});this.contextEl=e.createEl("div",{cls:"huginn-chat-context"}),e.createEl("button",{cls:"huginn-chat-refresh",text:"Refresh context"}).addEventListener("click",()=>{this.refreshContext(!1)}),e.createEl("button",{cls:"huginn-chat-remember",text:"Remember chat"}).addEventListener("click",()=>{this.rememberChat()}),this.messagesContainer=this.container.createEl("div",{cls:"huginn-chat-messages"});let r=this.container.createEl("div",{cls:"huginn-chat-input-container"});this.inputEl=r.createEl("textarea",{cls:"huginn-chat-input",placeholder:"Ask about the active note..."}),this.inputEl.addEventListener("keydown",i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),this.handleSend())}),this.sendButton=r.createEl("button",{text:"Send",cls:"mod-cta huginn-chat-send"}),this.sendButton.addEventListener("click",()=>{this.handleSend()}),this.applySessionToDom(),this.inputEl.focus()}async refreshContext(e=!0){let t=await this.services.controller.createSession();if(e)this.session=t;else{let n=this.session.messages.filter(r=>r.role!=="system");this.session={...t,messages:[...t.messages,...n]}}this.applySessionToDom()}applySessionToDom(){if(!(!this.contextEl||!this.messagesContainer)){this.contextEl.empty(),this.session.activeNotePath?this.contextEl.createEl("small",{text:`Active note: ${this.session.activeNotePath}`}):this.contextEl.createEl("small",{text:"No active note open."}),this.messagesContainer.empty();for(let e of this.session.messages)e.role!=="system"&&this.renderMessage(e.role,e.content)}}async handleSend(){if(!this.inputEl)return;let e=this.inputEl.value.trim();if(e.length===0)return;if(this.abortController){this.abortController.abort();return}if(this.isLoading){this.setLoading(!1);return}let t=Le(e);if(t){let n=this.services.getMemory?.().user??null;n?(await n.append(t),this.renderMessage("assistant",`Memory saved: ${t.type} \u2014 ${t.note}`)):this.renderMessage("assistant","Memory storage is not available yet."),this.inputEl.value="";return}this.abortController=new AbortController,this.setLoading(!0),this.renderMessage("user",e),this.inputEl.value="";try{let n=await this.services.dispatcher.dispatch(e,this.session.activeNotePath,this.abortController.signal);if(this.abortController.signal.aborted)return;let r=n.intent,i=r?this.services.getRecipes().find(a=>a.metadata.name===r.recipeName)??null:null;r&&i?await this.runSkillFromChat(r,i,n):await this.runPlainChat(e)}finally{this.abortController=null,this.setLoading(!1),this.scrollToBottom()}}async runPlainChat(e){let t=await this.services.controller.sendMessage(this.session,e,this.abortController?.signal);this.session=t.updatedSession,t.response===null?this.renderMessage("assistant","[No response from model]"):this.renderMessage("assistant",t.response)}async runSkillFromChat(e,t,n){let r=this.harness;if(!r){this.renderMessage("assistant","Huginn harness is not ready yet. Is Muninn installed and enabled?");return}this.verbosity!=="minimal"&&this.renderMessage("assistant",`Running ${t.metadata.name} on ${e.targetPath}...`);let i=U(e.targetPath),a=await r.run(t,{targetPath:i,titleQuery:t.metadata.name},{},this.abortController?.signal);if(!a.schemaValid){let o=a.schemaErrors.map(c=>c.message).join("; ");this.renderMessage("assistant",`Skill failed: ${o}`);return}if(!a.groundTruthValid){let o=a.groundTruthErrors.map(u=>u.message).join("; "),c=this.services.getMemory?.().corrections??null;c&&await c.append({recipe:t.metadata.name,type:"ground-truth",key:o.slice(0,120),note:`Ground-truth check failed: ${o}`}),this.renderMessage("assistant",`First suggestion failed a vault check (${o}). Trying again...`);let l=await r.run(t,{targetPath:i,titleQuery:t.metadata.name},{},this.abortController?.signal);if(!l.groundTruthValid){let u=l.groundTruthErrors.map(p=>p.message).join("; ");this.renderMessage("assistant",`I had to try again, but the second attempt also failed a vault check: ${u}`);return}await this.renderRunResult(t,l);return}await this.renderRunResult(t,a)}async renderRunResult(e,t){if(t.approved===!1&&t.applyResult===null){let n=this.services.getMemory?.().corrections??null;n&&await n.append({recipe:e.metadata.name,type:"refusal",key:"user rejected suggestion",note:"User rejected the suggested change via the approval gate."}),this.renderMessage("assistant","Skill suggestion was rejected.");return}if(e.applyMethod==="noop"){this.renderReadOnlyResult(e,t);return}if(t.applyResult?.applied)this.renderMessage("assistant",t.applyResult.message);else if(t.applyResult){let n=this.verbosity==="minimal"?"Skill could not be applied.":`Skill could not be applied: ${t.applyResult.message}`;this.renderMessage("assistant",n)}else t.approved===!1?this.renderMessage("assistant","Skill suggestion was rejected."):this.renderMessage("assistant","```json\n"+JSON.stringify(t.parsedOutput.json,null,2)+"\n```")}async rememberChat(){let e=this.services.getMemory?.().summary??null;if(e===null){this.renderMessage("assistant","Memory storage is not available yet.");return}let t=this.session.messages.filter(n=>n.role!=="system");if(t.length===0){this.renderMessage("assistant","Nothing to remember yet.");return}if(this.abortController){this.abortController.abort();return}if(this.isLoading){this.setLoading(!1);return}this.abortController=new AbortController,this.setLoading(!0);try{let n=await this.services.controller.summarizeChat(t,this.abortController.signal);if(n===null||n.trim().length===0){this.renderMessage("assistant","Could not generate a chat summary.");return}await e.append({key:this.session.activeNotePath??"general chat",note:n.trim()}),this.renderMessage("assistant","Chat summary saved.")}finally{this.abortController=null,this.setLoading(!1),this.scrollToBottom()}}renderReadOnlyResult(e,t){let n=t.parsedOutput.json,r=e.chatRender;if(!r){this.renderMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```");return}let i=M(n,r.field);if(r.template==="paragraph"&&typeof i=="string"){this.renderMessage("assistant",i);return}if((r.template==="numbered-list"||r.template==="bulleted-list")&&Array.isArray(i)){let a=i;if(a.length===0){this.renderMessage("assistant",r.message??"No items found.");return}let o=r.template==="numbered-list"?c=>`${c+1}. `:()=>"- ";this.renderMessage("assistant",a.map((c,l)=>`${o(l)}${c}`).join(`
`));return}if(r.template==="json"){this.renderMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```");return}this.renderMessage("assistant","```json\n"+JSON.stringify(n,null,2)+"\n```")}renderMessage(e,t){if(!this.messagesContainer)return;let n=this.messagesContainer.createEl("div",{cls:`huginn-chat-message huginn-chat-message-${e}`});n.createEl("div",{cls:"huginn-chat-message-role",text:e==="user"?"You":"Huginn"});let r=n.createEl("div",{cls:"huginn-chat-message-body"});e==="assistant"?Q.MarkdownRenderer.render(this.app,t,r,this.session.activeNotePath??"",this):r.innerText=t}setLoading(e){this.isLoading=e,this.sendButton&&(this.sendButton.textContent=this.abortController?"Stop":"Send")}scrollToBottom(){this.messagesContainer&&(this.messagesContainer.scrollTop=this.messagesContainer.scrollHeight)}};var ft="muninn",X="Agents/Huginn/SKILLS",yt=500,vt=3e4,Z=class extends m.Plugin{settings={...H};muninnApi=null;harness=null;chatClient=null;recipes=[];correctionsMemory=null;userMemory=null;chatSummaryMemory=null;async onload(){try{let e=await this.loadData();this.settings=fe(e)}catch(e){console.warn("[Huginn] failed to load settings, using defaults:",e),this.settings={...H}}this.addSettingTab(new ge(this.app,this)),this.addCommand({id:"run-skill",name:"Run Huginn skill",callback:()=>{this.runSkill()}}),this.addCommand({id:"open-chat",name:"Open Huginn chat",callback:()=>{this.openChat()}}),this.addCommand({id:"install-default-recipes",name:"Install default Huginn skills",callback:()=>{this.installDefaultRecipes(!1)}}),this.registerView(F,e=>new K(e,this.createChatViewServices())),this.addRibbonIcon("message-square","Huginn chat",()=>{this.openChat()}),this.app.workspace.onLayoutReady(()=>{this.awaitMuninnReady().then(async e=>{if(e===null){new m.Notice("Huginn requires Muninn to be installed and enabled.");return}this.muninnApi=e,this.chatClient=new x({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs});let t=new L(this.app.vault);this.correctionsMemory=new j(t),this.userMemory=new V(t),this.chatSummaryMemory=new I(t),this.harness=new A({llmClient:this.chatClient,inputGatherer:new O({api:e,app:this.app}),approvalGate:new $(this.app),applyRegistry:oe(je(this.app)),groundTruthValidator:new N(ce(),new E(this.app)),corrections:this.correctionsMemory});let n=await me(this.app.vault,{force:!1});n.installed>0&&new m.Notice(`Huginn installed ${n.installed} default skill recipe(s) in ${X}`),n.errors.length>0&&console.warn("[Huginn] recipe seed errors:",n.errors),await this.loadRecipes(),this.registerRecipeFolderWatcher(),console.log("[Huginn] harness initialized against Muninn API"),this.settings.warmupOnFocus&&this.warmupChatModel()})})}registerRecipeFolderWatcher(){let e=`${X}`;this.registerEvent(this.app.vault.on("create",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("modify",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("delete",t=>{t.path.startsWith(e)&&this.loadRecipes()})),this.registerEvent(this.app.vault.on("rename",(t,n)=>{(t.path.startsWith(e)||n.startsWith(e))&&this.loadRecipes()}))}async awaitMuninnReady(){let e=Date.now(),t=e+vt,n=!1;for(;Date.now()<t;){let i=this.discoverMuninnApi();if(i!==null)return i;!n&&Date.now()>e+5e3&&(console.log("[Huginn] still waiting for Muninn to become ready..."),n=!0),await new Promise(a=>window.setTimeout(a,yt))}let r=this.discoverMuninnApi();return r===null&&console.warn("[Huginn] Muninn did not become ready within 30s. Is it installed and enabled?"),r}async warmupChatModel(){if(this.harness!==null){console.log("[Huginn] warming up chat model...");try{await this.harness.warmup(),console.log("[Huginn] chat model warmup complete")}catch(e){console.warn("[Huginn] chat model warmup failed:",e.message)}}}discoverMuninnApi(){let t=this.app.plugins?.plugins?.[ft];return!t||typeof t.getMuninnApi!="function"?null:t.getMuninnApi()}async runSkill(){if(this.harness===null||this.muninnApi===null){let t=this.discoverMuninnApi();if(t===null){new m.Notice("Huginn harness is not ready. Is Muninn installed and enabled?");return}this.muninnApi=t;let n=new L(this.app.vault),r=this.correctionsMemory??new j(n);this.correctionsMemory=r,this.userMemory=this.userMemory??new V(n),this.chatSummaryMemory=this.chatSummaryMemory??new I(n),this.harness=new A({llmClient:new x({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs}),inputGatherer:new O({api:t,app:this.app}),approvalGate:new $(this.app),applyRegistry:oe(je(this.app)),groundTruthValidator:new N(ce(),new E(this.app)),corrections:r})}let e=await this.loadRecipes();if(e.length===0){new m.Notice(`No recipes found in ${X}`);return}new W(this.app,e,this.settings.defaultTargetPath,t=>{t!==null&&this.runChosenRecipe(t.recipe,t.targetPath)}).open()}async loadRecipes(){let e=new B(this.app.vault,X),t=await Oe(e);return t.errors.length>0&&console.warn("[Huginn] recipe load errors:",t.errors),this.recipes=t.recipes,this.recipes}async runChosenRecipe(e,t){console.log("[Huginn] running recipe:",e.metadata.name,"target:",t);let n=await this.harness.run(e,{targetPath:t,titleQuery:e.metadata.name},{});console.log("[Huginn] recipe result:",n)}openChat(){this.openChatView()}createChatViewServices(){let e=this.chatClient??new x({baseUrl:this.settings.ollamaUrl,model:this.settings.ollamaChatModel,timeoutMs:this.settings.chatTimeoutMs}),t=()=>this.recipes,n=()=>this.harness,r=()=>this.settings,i=()=>({corrections:this.correctionsMemory,user:this.userMemory,summary:this.chatSummaryMemory});return{controller:new z({app:this.app,llmClient:e,getUserMemoryContext:async()=>(await this.userMemory?.getContext(5))?.text??"",getChatSummaryContext:async()=>(await this.chatSummaryMemory?.getContext(5))?.text??""}),dispatcher:new _({llmClient:e,getRecipes:t,corrections:this.correctionsMemory??void 0}),getHarness:n,getRecipes:t,getSettings:r,getMemory:i}}async openChatView(){let e=this.app.workspace.getLeavesOfType(F)[0]??null;if(e!==null){this.app.workspace.revealLeaf(e);return}let t=this.app.workspace.getRightLeaf(!1);t!==null&&(await t.setViewState({type:F,active:!0}),this.app.workspace.revealLeaf(t))}async installDefaultRecipes(e){let t=await me(this.app.vault,{force:e}),n=[];t.installed>0&&n.push(`${t.installed} installed`),t.skipped>0&&n.push(`${t.skipped} skipped (already present)`),t.overwritten>0&&n.push(`${t.overwritten} overwritten`),t.errors.length>0&&n.push(`${t.errors.length} errors`),new m.Notice(`Huginn default skills: ${n.join(", ")||"no changes"}`),t.errors.length>0&&console.warn("[Huginn] install default recipes errors:",t.errors),await this.loadRecipes()}};function je(s){return{resolveFile(e){let t=s.vault.getAbstractFileByPath(e);return t instanceof m.TFile?t:null},async readFile(e){if(!(e instanceof m.TFile))throw new Error("Invalid file");return s.vault.read(e)},async writeFile(e,t){if(!(e instanceof m.TFile))throw new Error("Invalid file");await s.vault.modify(e,t)},async processFrontMatter(e,t){if(!(e instanceof m.TFile))throw new Error("Invalid file");await s.fileManager.processFrontMatter(e,t)}}}var ge=class extends m.PluginSettingTab{plugin;constructor(e,t){super(e,t),this.plugin=t}display(){let{containerEl:e}=this;e.empty(),e.createEl("h2",{text:"Huginn Settings"}),new m.Setting(e).setName("Ollama base URL").setDesc("Base URL for the Ollama API, without trailing slash.").addText(t=>t.setPlaceholder("http://localhost:11434").setValue(this.plugin.settings.ollamaUrl).onChange(async n=>{this.plugin.settings.ollamaUrl=n.replace(/\/$/,""),await this.plugin.saveData(this.plugin.settings)})),new m.Setting(e).setName("Chat model").setDesc("Ollama model used for skill chat completions. Must be a chat-capable model, not an embedding model.").addText(t=>t.setPlaceholder("qwen3.5:4b").setValue(this.plugin.settings.ollamaChatModel).onChange(async n=>{this.plugin.settings.ollamaChatModel=n,await this.plugin.saveData(this.plugin.settings)})),new m.Setting(e).setName("Chat timeout (ms)").setDesc("Abort chat completion requests after this many milliseconds.").addText(t=>t.setPlaceholder("120000").setValue(String(this.plugin.settings.chatTimeoutMs)).onChange(async n=>{let r=Number(n);Number.isFinite(r)&&r>0&&(this.plugin.settings.chatTimeoutMs=r,await this.plugin.saveData(this.plugin.settings))})),new m.Setting(e).setName("Report-back verbosity").setDesc("How much status feedback the chat sidebar shows when running skills. Verbose is useful while testing; Minimal keeps the chat cleaner.").addDropdown(t=>t.addOption("minimal","Minimal").addOption("normal","Normal").addOption("verbose","Verbose").setValue(this.plugin.settings.reportBackVerbosity).onChange(async n=>{let r=n;(r==="minimal"||r==="normal"||r==="verbose")&&(this.plugin.settings.reportBackVerbosity=r,await this.plugin.saveData(this.plugin.settings))})),new m.Setting(e).setName("Warm up chat model on load").setDesc("Send a trivial chat request when Huginn initializes so the model is already loaded in memory. Increases VRAM/RAM use.").addToggle(t=>t.setValue(this.plugin.settings.warmupOnFocus).onChange(async n=>{this.plugin.settings.warmupOnFocus=n,await this.plugin.saveData(this.plugin.settings)})),new m.Setting(e).setName("Default target note path").setDesc("Default vault path used by the Run Huginn skill chooser.").addText(t=>t.setPlaceholder("notes/gamma.md").setValue(this.plugin.settings.defaultTargetPath).onChange(async n=>{this.plugin.settings.defaultTargetPath=n,await this.plugin.saveData(this.plugin.settings)}))}};
