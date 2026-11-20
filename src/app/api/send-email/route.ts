import {NextRequest,NextResponse} from 'next/server';
import {apiAuth,originAllowed} from '@/lib/auth';
import {mailSchema} from '@/lib/validation';
import {getTemplateAsset,saveEmail} from '@/lib/database';
import {sendMail,safeHtml} from '@/lib/mailer';
import type {EmailRecord,MailAttachment} from '@/types/email';

const attempts=new Map<string,{n:number;at:number}>();
const assetUrl=/https:\/\/[^\s"'<>]+\/api\/template-assets\/([0-9a-f-]{36})(?:\?[^\s"'<>]*)?/gi;
function hasNonHttpsImage(html:string){return [...html.matchAll(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].some(match=>{const src=match[1]??match[2]??match[3]??'';try{return new URL(src).protocol!=='https:'}catch{return true}})}

async function inlineUploadedImages(html:string,attachments:MailAttachment[]){
  const refs=[...html.matchAll(assetUrl)].map(match=>({id:match[1],url:match[0]}));
  const unique=[...new Map(refs.map(ref=>[ref.id,ref])).values()];
  if(!unique.length)return {html,attachments};
  const inline:MailAttachment[]=[];
  let inlineBytes=0;
  for(const {id,url} of unique){
    const asset=await getTemplateAsset(id);
    if(!asset)continue;
    inlineBytes+=asset.data.length;
    if(inlineBytes>10_000_000)throw new Error('Uploaded template images exceed the 10 MB inline image limit.');
    const cid=`template-${id}@email-assets`;
    html=html.replaceAll(url,`cid:${cid}`);
    inline.push({filename:asset.filename||`image-${id}`,contentType:asset.content_type,content:asset.data.toString('base64'),size:asset.data.length,cid});
  }
  if(attachments.reduce((sum,a)=>sum+a.size,0)+inlineBytes>10_000_000)throw new Error('Attachments and uploaded template images exceed the 10 MB total limit.');
  return {html,attachments:[...attachments,...inline]};
}

export async function POST(req:NextRequest){
  if(!originAllowed(req))return NextResponse.json({error:'Invalid origin'},{status:403});
  if(!(await apiAuth(req)))return NextResponse.json({error:'Unauthorized'},{status:401});
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'local';
  const now=Date.now();
  const entry=attempts.get(ip);
  if(entry&&now-entry.at<60000&&entry.n>=8)return NextResponse.json({error:'Rate limit reached. Try again in a minute.'},{status:429});
  attempts.set(ip,!entry||now-entry.at>=60000?{n:1,at:now}:{n:entry.n+1,at:entry.at});
  const parsed=mailSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid email data'},{status:400});
  const data=parsed.data;
  if(data.attachments.some(a=>!['application/pdf','image/png','image/jpeg','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(a.contentType)))return NextResponse.json({error:'An attachment type is not allowed.'},{status:400});
  if(data.attachments.reduce((sum,a)=>sum+a.size,0)>10_000_000)return NextResponse.json({error:'Attachments exceed the 10 MB total limit.'},{status:400});
  if(hasNonHttpsImage(data.html))return NextResponse.json({error:'Email images need HTTPS image addresses.'},{status:400});
  let sendData={...data};
  try{
    const embedded=await inlineUploadedImages(data.html,data.attachments);
    sendData={...data,html:embedded.html,attachments:embedded.attachments};
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not prepare template images.'},{status:400});}
  const base:EmailRecord={id:crypto.randomUUID(),to:data.to,cc:data.cc,bcc:data.bcc,subject:data.subject,text:data.text,html:safeHtml(data.html),sender:process.env.SMTP_USER||'',createdAt:new Date().toISOString(),status:'failed',templateId:data.templateId,templateName:data.templateName,attachments:data.attachments.map(a=>a.filename)};
  try{
    const info=await sendMail(sendData);
    base.status='accepted';base.messageId=info.messageId;await saveEmail(base);
    return NextResponse.json({email:base,message:'Accepted by Gmail SMTP. This confirms handoff to Gmail, not recipient delivery.'});
  }catch(e){
    base.error=e instanceof Error?e.message:'SMTP send failed';
    try{await saveEmail(base)}catch{}
    return NextResponse.json({error:base.error,email:base},{status:502});
  }
}
