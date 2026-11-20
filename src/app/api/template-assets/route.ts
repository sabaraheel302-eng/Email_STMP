import {NextRequest,NextResponse}from'next/server';
import {apiAuth,originAllowed}from'@/lib/auth';
import {saveTemplateAsset}from'@/lib/database';
import {z}from'zod';

function publicAppUrl(){try{const url=new URL(process.env.NEXT_PUBLIC_APP_URL||'');const host=url.hostname.toLowerCase();if(url.protocol!=='https:'||!host||url.username||url.password||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||/^127\./.test(host)||host==='::1'||/^10\./.test(host)||/^192\.168\./.test(host)||/^172\.(1[6-9]|2\d|3[01])\./.test(host))return null;return url.origin}catch{return null}}

export async function POST(req:NextRequest){
  if(!originAllowed(req))return NextResponse.json({error:'Invalid origin'},{status:403});
  if(!(await apiAuth(req)))return NextResponse.json({error:'Unauthorized'},{status:401});
  const appUrl=publicAppUrl();
  if(!appUrl)return NextResponse.json({error:'Uploaded email images need a public HTTPS address. Set NEXT_PUBLIC_APP_URL to your HTTPS deployment before uploading images.'},{status:400});
  const form=await req.formData().catch(()=>null);
  if(!form)return NextResponse.json({error:'Invalid image upload.'},{status:400});
  const file=form.get('file');
  const fields=z.object({alt:z.string().max(2000).default(''),purpose:z.enum(['logo','banner','badge','icon']).default('logo')}).safeParse({alt:form.get('alt')||'',purpose:form.get('purpose')||'logo'});
  if(!(file instanceof File)||!fields.success)return NextResponse.json({error:'Choose a valid PNG, JPG or WebP image.'},{status:400});
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))return NextResponse.json({error:'Choose a PNG, JPG or WebP image.'},{status:400});
  const maxBytes=fields.data.purpose==='banner'?4_000_000:2_000_000;
  if(!file.size||file.size>maxBytes)return NextResponse.json({error:`${fields.data.purpose==='banner'?'Banners must be':'Images must be'} ${maxBytes/1_000_000} MB or smaller.`},{status:400});
  const data=Buffer.from(await file.arrayBuffer());
  const valid=file.type==='image/png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):file.type==='image/jpeg'?data[0]===255&&data[1]===216:data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
  if(!valid)return NextResponse.json({error:'Image contents do not match the selected format.'},{status:400});
  const filename=z.string().trim().min(1).max(180).safeParse(file.name||'uploaded-image');
  if(!filename.success)return NextResponse.json({error:'Image filename is too long.'},{status:400});
  const id=crypto.randomUUID();
  try{await saveTemplateAsset(id,file.type,filename.data,fields.data.alt||filename.data,data);return NextResponse.json({asset:{id,url:`${appUrl}/api/template-assets/${id}`,alt:fields.data.alt||filename.data,href:'',filename:filename.data}})}
  catch{return NextResponse.json({error:'Could not save image to the configured database.'},{status:503})}
}
