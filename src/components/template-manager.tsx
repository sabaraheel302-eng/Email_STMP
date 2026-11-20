'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowLeft,Copy,Eye,LoaderCircle,Mail,Monitor,Plus,Save,Smartphone,Trash2,Upload} from 'lucide-react';
import {defaultTemplate} from '@/lib/template-defaults';
import {applyTemplateVariables,renderEmailTemplate,templatePlainText} from '@/lib/email-template';
import type {EmailTemplate,TemplateAsset,TemplateDraft} from '@/types/template';

type TextField={key:keyof TemplateDraft;label:string;area?:boolean};
const fields:TextField[]=[
  {key:'name',label:'Template name'},{key:'companyName',label:'Organization name'},
  {key:'englishName',label:'English header name'},{key:'arabicName',label:'Arabic header name'},
  {key:'logoAlt',label:'Logo alt text'},{key:'subject',label:'Subject'},
  {key:'englishBody',label:'English message',area:true},{key:'arabicBody',label:'Arabic message (RTL)',area:true},
  {key:'appHeading',label:'App section heading'},{key:'appEnglish',label:'App description (English)',area:true},
  {key:'appArabic',label:'App description (Arabic)',area:true},{key:'verificationExpiry',label:'Default verification expiry'},
  {key:'visionEnglish',label:'Vision statement (English)',area:true},{key:'visionArabic',label:'Vision statement (Arabic)',area:true},
  {key:'disclaimer',label:'Legal disclaimer',area:true},{key:'address',label:'Organization address'},
  {key:'phone',label:'Telephone'},{key:'fax',label:'Fax'},
  {key:'website',label:'Website (HTTPS URL)'},{key:'privacyUrl',label:'Privacy policy (HTTPS URL)'}
];
const httpsValue=(value:string)=>value.trim().replace(/^http:\/\//i,'https://');

function AssetPicker({label,asset,onUpload,onRemove,progress,maxSize,disabled}:{label:string;asset:TemplateAsset|null|undefined;onUpload:(file:File)=>void;onRemove:()=>void;progress:number|null;maxSize:string;disabled:boolean}){
  return <div className="rounded-lg border p-3">
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{label}</span><label className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium hover:bg-slate-50"><Upload size={14} className="mr-1 inline"/>{asset?'Replace image':'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={e=>{const f=e.target.files?.[0];if(f)onUpload(f);e.currentTarget.value=''}} className="hidden"/></label></div>
    <p className="mt-1 text-[11px] text-slate-500">PNG, JPG or WebP · up to {maxSize}</p>
    {progress!==null&&<div className="mt-3 flex items-center gap-2 text-xs text-indigo-700"><LoaderCircle size={14} className="animate-spin"/>Uploading {progress}%<progress className="h-2 flex-1" max={100} value={progress}/></div>}
    {asset&&<div className="mt-3 flex items-center gap-3"><div className="flex h-16 w-32 shrink-0 items-center justify-center rounded bg-slate-50 p-1"><img src={asset.url} alt={asset.alt} className="max-h-full max-w-full object-contain"/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium" title={asset.filename}>{asset.filename||asset.alt||'Uploaded image'}</p><p className="mt-1 truncate text-[10px] text-slate-400">Stored image preview</p></div><button type="button" onClick={onRemove} disabled={disabled} className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">Remove</button></div>}
  </div>
}

export default function TemplateManager(){
  const search=useSearchParams();
  const [list,setList]=useState<EmailTemplate[]>([]);
  const [form,setForm]=useState<TemplateDraft>(defaultTemplate);
  const [id,setId]=useState('');
  const [sender,setSender]=useState('');
  const [mode,setMode]=useState<'desktop'|'mobile'>('desktop');
  const [busy,setBusy]=useState(false);
  const [uploading,setUploading]=useState('');
  const [progress,setProgress]=useState(0);
  const [note,setNote]=useState('');
  const [error,setError]=useState('');

  const load=async()=>{const r=await fetch('/api/templates');if(r.status===401){location.href='/login';return}const j=await r.json();if(r.ok)setList(j.templates||[]);else setError(j.error||'Could not load templates.')};
  useEffect(()=>{void load();fetch('/api/smtp/status').then(r=>r.json()).then(j=>setSender(j.sender||'')).catch(()=>{})},[]);
  useEffect(()=>{const target=search.get('edit');if(target&&list.length){const selected=list.find(t=>t.id===target);if(selected&&id!==target)start(selected)}},[search,list]);

  function start(t?:EmailTemplate){
    if(t){const {id:templateId,createdAt,updatedAt,...data}=t;void templateId;void createdAt;void updatedAt;setForm({...defaultTemplate,...data,logoAsset:data.logoAsset||null,appStoreBadge:data.appStoreBadge||null,playStoreBadge:data.playStoreBadge||null,galleryBadge:data.galleryBadge||null,banners:(data.banners||[]).map(a=>({...a})),socials:(data.socials||[]).map(s=>({...s,icon:s.icon||null}))});setId(t.id)}
    else{setForm({...defaultTemplate,banners:[],socials:defaultTemplate.socials.map(x=>({...x,icon:null}))});setId('')}
    setNote('');setError('');
  }
  function set<K extends keyof TemplateDraft>(key:K,value:TemplateDraft[K]){setForm(prev=>({...prev,[key]:value}))}

  async function upload(file:File,slot:string,alt:string,purpose:'logo'|'banner'|'badge'|'icon'){
    const max=purpose==='banner'?4_000_000:2_000_000;
    if(file.size>max||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError(`${file.name}: choose PNG, JPG or WebP under ${max/1_000_000} MB.`);return null}
    setUploading(slot);setProgress(0);setError('');
    try{const payload=new FormData();payload.append('file',file,file.name);payload.append('alt',alt||file.name);payload.append('purpose',purpose);
      const asset=await new Promise<TemplateAsset>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('POST','/api/template-assets');xhr.withCredentials=true;xhr.upload.onprogress=e=>{if(e.lengthComputable)setProgress(Math.round(e.loaded/e.total*100))};xhr.onerror=()=>reject(new Error('Image upload failed. Check your connection.'));xhr.onload=()=>{let result:{asset?:TemplateAsset;error?:string};try{result=JSON.parse(xhr.responseText)}catch{reject(new Error('Invalid upload response.'));return}if(xhr.status<200||xhr.status>=300||!result.asset){reject(new Error(result.error||'Image upload failed.'));return}resolve(result.asset)};xhr.send(payload)});return {...asset,filename:asset.filename||file.name};
    }catch(e){setError(e instanceof Error?e.message:'Image upload failed.');return null}finally{setUploading('');setProgress(0)}
  }

  async function save(){
    setBusy(true);setError('');setNote('');
    const payload:TemplateDraft={...form,logoUrl:form.logoAsset?.url||httpsValue(form.logoUrl||''),website:httpsValue(form.website||''),privacyUrl:httpsValue(form.privacyUrl||''),appStoreUrl:httpsValue(form.appStoreUrl||''),playStoreUrl:httpsValue(form.playStoreUrl||''),galleryUrl:httpsValue(form.galleryUrl||''),banners:form.banners.map(a=>({...a,url:httpsValue(a.url),href:httpsValue(a.href||'')})),socials:form.socials.map(s=>({...s,url:httpsValue(s.url||''),icon:s.icon||null}))};
    try{const r=await fetch(id?`/api/templates/${id}`:'/api/templates',{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not save template.');setForm(payload);setNote('Template saved.');await load();if(j.template)setId(j.template.id)}catch(e){setError(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}
  }
  async function remove(){if(!id||!confirm('Delete this saved template?'))return;const r=await fetch('/api/templates/'+id,{method:'DELETE'});if(r.ok){start();await load()}else setError('Could not delete template.')}
  function duplicate(){setForm({...form,name:`${form.name} copy`,banners:form.banners.map(x=>({...x})),socials:form.socials.map(x=>({...x,icon:x.icon?{...x.icon}:null}))});setId('');setNote('Copy ready. Save it as a new template.');setError('')}

  const html=useMemo(()=>renderEmailTemplate({...form,id:id||'preview',createdAt:'',updatedAt:''},{user_name:'Alex Morgan',recipient_email:sender||'alex@example.com',verification_code:'482 193',support_email:sender||'support@example.com',support_phone:form.phone,company_name:form.companyName,company_website:form.website,company_address:form.address,verification_expiry:form.verificationExpiry||'10 minutes',current_year:String(new Date().getFullYear())}),[form,id,sender]);

  async function testEmail(){if(!sender){setError('Configure SMTP_USER before sending a test email.');return}if(!confirm(`Send this test template to ${sender}?`))return;setBusy(true);setError('');try{const r=await fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:[sender],cc:[],bcc:[],subject:`[Test] ${applyTemplateVariables(form.subject,{user_name:'Test recipient',recipient_email:sender,verification_code:'123 456',verification_expiry:form.verificationExpiry||'10 minutes',company_name:form.companyName})}`,text:templatePlainText({...form,id:id||'preview',createdAt:'',updatedAt:''},{user_name:'Test recipient',recipient_email:sender,verification_code:'123 456',verification_expiry:form.verificationExpiry||'10 minutes'}),html,attachments:[],templateId:id||undefined,templateName:form.name})});const j=await r.json();if(!r.ok)throw new Error(j.error);setNote(j.message)}catch(e){setError(e instanceof Error?e.message:'Test send failed')}finally{setBusy(false)}}

  const textInput=(f:TextField)=><label key={f.key} className={`text-xs font-medium text-slate-600 ${f.area?'sm:col-span-2':''}`}>{f.label}{f.area?<textarea dir={f.key==='arabicBody'||f.key==='appArabic'||f.key==='visionArabic'?'rtl':'auto'} value={String(form[f.key]??'')} onChange={e=>set(f.key,e.target.value as never)} rows={f.key==='englishBody'||f.key==='arabicBody'||f.key==='disclaimer'?4:2} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm leading-6"/>:<input value={String(form[f.key]??'')} onChange={e=>set(f.key,e.target.value as never)} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm"/>}</label>;
  const assetField=(label:string,asset:TemplateAsset|null|undefined,slot:string,onChange:(asset:TemplateAsset|null)=>void,purpose:'logo'|'banner'|'badge'|'icon',alt:string)=><AssetPicker label={label} asset={asset} disabled={busy||Boolean(uploading)} progress={uploading===slot?progress:null} maxSize={purpose==='banner'?'4 MB':'2 MB'} onRemove={()=>onChange(null)} onUpload={file=>void upload(file,slot,alt,purpose).then(value=>{if(value)onChange(value)})}/>;

  return <div className="mx-auto max-w-[1440px] p-5 md:p-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={15}/> Dashboard</Link><h1 className="text-2xl font-semibold">Email templates</h1><p className="mt-1 text-sm text-slate-500">Create responsive bilingual email layouts and reuse them when composing.</p></div><button onClick={()=>start()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/> New template</button></div>
    {(error||note)&&<div role={error?'alert':'status'} className={`mb-5 rounded-xl p-3 text-sm ${error?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>{error||note}<button onClick={()=>{setError('');setNote('')}} className="float-right">×</button></div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)]">
      <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Template editor</h2><div className="flex gap-2"><button onClick={duplicate} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><Copy size={14}/> Duplicate</button>{id&&<button onClick={remove} className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700"><Trash2 size={14}/> Delete</button>}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="grid gap-3 sm:grid-cols-2">{fields.slice(0,5).map(textInput)}</div><div className="mt-4">{assetField('Organization logo',form.logoAsset||null,'logo',a=>set('logoAsset',a),'logo',form.logoAlt||form.name)}</div></div>
        <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">{fields.slice(5).map(textInput)}</div>
        <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">App download badges</h3><p className="mt-1 text-xs text-slate-500">Enter the store destination link and upload its badge image. The image itself is never entered as a URL.</p><div className="mt-3 grid gap-3">{([
          ['App Store','appStoreUrl','appStoreBadge','appstore'],['Google Play','playStoreUrl','playStoreBadge','googleplay'],['Huawei AppGallery','galleryUrl','galleryBadge','appgallery']
        ] as const).map(([label,urlKey,assetKey,slot])=><div key={slot} className="grid gap-3 rounded-lg border p-3 md:grid-cols-2"><label className="text-xs font-medium text-slate-600">{label} destination HTTPS URL<input value={form[urlKey]} onChange={e=>set(urlKey,e.target.value)} className="mt-1 w-full rounded border px-2 py-2 text-sm" placeholder="https://…"/></label>{assetField(`${label} badge`,form[assetKey]||null,slot,a=>set(assetKey,a),'badge',label)}</div>)}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Promotional banners ({form.banners.length}/4)</h3><button disabled={form.banners.length>=4} onClick={()=>set('banners',[...form.banners,{id:crypto.randomUUID(),url:'',alt:'',href:''}])} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"><Plus size={14} className="mr-1 inline"/> Add banner slot</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{form.banners.map((b,i)=><div key={b.id} className="space-y-2 rounded-lg border p-3">{assetField(`Promotional banner ${i+1}`,b,`banner-${i}`,a=>set('banners',form.banners.map((x,j)=>i===j?(a?{...a,href:x.href}:({id:x.id,url:'',alt:x.alt,href:x.href})):x)),'banner',b.alt||`Banner ${i+1}`)}<label className="block text-xs text-slate-500">Clickable destination HTTPS URL<input value={b.href} onChange={e=>set('banners',form.banners.map((x,j)=>i===j?{...x,href:e.target.value}:x))} placeholder="Optional https://…" className="mt-1 w-full rounded border px-2 py-2"/></label><label className="block text-xs text-slate-500">Alt text<input value={b.alt} onChange={e=>set('banners',form.banners.map((x,j)=>i===j?{...x,alt:e.target.value}:x))} className="mt-1 w-full rounded border px-2 py-2"/></label><button onClick={()=>set('banners',form.banners.filter((_,j)=>j!==i))} className="text-xs text-rose-600">Remove banner</button></div>)}</div></div>
        <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">Social links and icons</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{form.socials.map((s,i)=><div key={s.network} className="space-y-2 rounded-lg border p-3"><label className="block text-xs text-slate-600">{s.network} profile HTTPS URL<input value={s.url} onChange={e=>set('socials',form.socials.map((x,j)=>i===j?{...x,url:e.target.value}:x))} placeholder="https://…" className="mt-1 w-full rounded border px-2 py-2"/></label>{assetField(`${s.network} icon`,s.icon||null,`social-${s.network}`,a=>set('socials',form.socials.map((x,j)=>i===j?{...x,icon:a}:x)),'icon',`${s.network} icon`)}</div>)}</div></div>
        <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">Layout style</h3><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs">Accent color<input type="color" value={form.primaryColor} onChange={e=>set('primaryColor',e.target.value)} className="mt-1 block h-9 w-full"/></label><label className="text-xs">Background color<input type="color" value={form.backgroundColor} onChange={e=>set('backgroundColor',e.target.value)} className="mt-1 block h-9 w-full"/></label><label className="text-xs">Email width (px)<input type="number" min={480} max={680} value={form.containerWidth} onChange={e=>set('containerWidth',Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2"/></label><label className="text-xs">Image spacing (px)<input type="number" min={4} max={32} value={form.spacing} onChange={e=>set('spacing',Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2"/></label><label className="text-xs">Text color<input type="color" value={form.textColor} onChange={e=>set('textColor',e.target.value)} className="mt-1 block h-9 w-full"/></label><label className="text-xs">Font family<select value={form.fontFamily} onChange={e=>set('fontFamily',e.target.value as TemplateDraft['fontFamily'])} className="mt-1 w-full rounded border px-2 py-2"><option>Arial</option><option>Verdana</option><option>Georgia</option></select></label><label className="text-xs">Body text size (px)<input type="number" min={12} max={16} value={form.fontSize} onChange={e=>set('fontSize',Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-2"/></label></div></div>
        <div className="flex flex-wrap gap-2"><button onClick={save} disabled={busy||Boolean(uploading)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?<LoaderCircle size={16} className="animate-spin"/>:<Save size={16}/>} Save template</button><button onClick={testEmail} disabled={busy||Boolean(uploading)} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold"><Mail size={16}/> Send test to {sender||'SMTP sender'}</button></div>
      </section>
      <section className="xl:sticky xl:top-24 xl:self-start"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Live preview</h2><div className="flex rounded-lg border bg-white p-1"><button onClick={()=>setMode('desktop')} className={`rounded px-2 py-1 ${mode==='desktop'?'bg-indigo-50 text-indigo-700':''}`}><Monitor size={16}/></button><button onClick={()=>setMode('mobile')} className={`rounded px-2 py-1 ${mode==='mobile'?'bg-indigo-50 text-indigo-700':''}`}><Smartphone size={16}/></button></div></div><div className="overflow-auto rounded-xl border bg-slate-100 p-3"><iframe title="Email template preview" sandbox="allow-same-origin" srcDoc={html} className="mx-auto h-[720px] border-0 bg-white" style={{width:mode==='mobile'?390:'100%',minWidth:mode==='mobile'?390:undefined}} /></div><p className="mt-2 text-xs text-slate-400"><Eye size={13} className="mr-1 inline"/>Preview uses sample values. Email clients may render small details differently.</p></section>
    </div>
    <section className="mt-8"><h2 className="mb-3 font-semibold">Saved templates</h2>{list.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map(t=><button key={t.id} onClick={()=>start(t)} className={`rounded-xl border bg-white p-4 text-left hover:border-indigo-300 ${id===t.id?'border-indigo-400 ring-2 ring-indigo-50':''}`}><div className="font-semibold">{t.name}</div><div className="mt-1 text-xs text-slate-500">{t.companyName} · {t.subject}</div><div className="mt-3 text-xs text-slate-400">Updated {new Date(t.updatedAt).toLocaleDateString()}</div></button>)}</div>:<div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No saved templates yet. Start with the bilingual service notice.</div>}</section>
  </div>
}
