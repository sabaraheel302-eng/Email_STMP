import {NextRequest,NextResponse} from 'next/server';
import {apiAuth,originAllowed} from '@/lib/auth';
import {mailSchema} from '@/lib/validation';
import {getTemplate,saveEmail} from '@/lib/database';
import {sendMail,safeHtml} from '@/lib/mailer';
import {inlineTemplateAssets} from '@/lib/inline-template-assets';
import {renderActionRequest} from '@/lib/email-template';
import type {EmailRecord} from '@/types/email';

const attempts=new Map<string,{n:number;at:number}>();
function hasNonHttpsImage(html:string){return [...html.matchAll(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].some(match=>{const src=match[1]??match[2]??match[3]??'';try{return new URL(src).protocol!=='https:'}catch{return true}})}

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
  if(data.attachments.some(a=>!['application/pdf','image/png','image/jpeg','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip','application/x-zip-compressed'].includes(a.contentType)))return NextResponse.json({error:'An attachment type is not allowed.'},{status:400});
  if(data.attachments.reduce((sum,a)=>sum+a.size,0)>10_000_000)return NextResponse.json({error:'Attachments exceed the 10 MB total limit.'},{status:400});
  if(hasNonHttpsImage(data.html))return NextResponse.json({error:'Email images need HTTPS image addresses.'},{status:400});
  const smtpUser=process.env.SMTP_USER||'';
  if(data.senderEmail&&data.senderEmail.toLowerCase()!==smtpUser.toLowerCase())return NextResponse.json({error:'Sender email must match the configured SMTP_USER address.'},{status:400});
  const senderName=data.senderName?.trim()||'';
  const base:EmailRecord={id:crypto.randomUUID(),to:data.to,cc:data.cc,bcc:data.bcc,subject:data.subject,text:data.text,html:safeHtml(data.html),sender:senderName?`${senderName} <${smtpUser}>`:smtpUser,createdAt:new Date().toISOString(),status:'failed',templateId:data.templateId,templateName:data.templateName,attachments:data.attachments.map(a=>a.filename),actionRequest:data.actionRequest};
  try{
    const selectedTemplate=data.actionRequest?.enabled&&data.templateId?await getTemplate(data.templateId):undefined;
    const actionHtml=renderActionRequest(data.actionRequest,{},base.id,selectedTemplate?.primaryColor);
    const actionUrl=data.actionRequest?.enabled?(()=>{const url=new URL(data.actionRequest!.url);url.searchParams.set('campaign',base.id);return url.toString()})():'';
    const actionText=data.actionRequest?.enabled?`\n\n${[data.actionRequest.titleEn,data.actionRequest.descriptionEn,data.actionRequest.reasonEn,data.actionRequest.instructionsEn,data.actionRequest.buttonEn,actionUrl,data.actionRequest.deadline?`Deadline: ${data.actionRequest.deadline}`:'',data.actionRequest.reference?`Reference: ${data.actionRequest.reference}`:''].filter(Boolean).join('\n\n')}`:'';
    const contentHtml=data.html+actionHtml;
    if(hasNonHttpsImage(contentHtml))return NextResponse.json({error:'Email images need HTTPS image addresses.'},{status:400});
    base.html=safeHtml(contentHtml);base.text=data.text+actionText;
    const prepared=await inlineTemplateAssets(contentHtml);
    const info=await sendMail({...data,text:base.text,html:prepared.html},prepared.attachments);
    base.status='accepted';base.messageId=info.messageId;await saveEmail(base);
    return NextResponse.json({email:base,message:'Accepted by Gmail SMTP. This confirms handoff to Gmail, not recipient delivery.'});
  }catch(e){
    base.error=e instanceof Error?e.message:'SMTP send failed';
    try{await saveEmail(base)}catch{}
    return NextResponse.json({error:base.error,email:base},{status:502});
  }
}
