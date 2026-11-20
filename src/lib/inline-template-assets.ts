import {getTemplateAsset} from '@/lib/database';

type InlineImage={filename:string;content:Buffer;contentType:string;cid:string;contentDisposition:'inline'};
type PreparedHtml={html:string;attachments:InlineImage[]};

const assetPath=/^\/api\/template-assets\/([0-9a-f-]{36})\/?$/i;

function hasValidImageSignature(type:string,data:Buffer){
  if(type==='image/png')return data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(type==='image/jpeg')return data[0]===0xff&&data[1]===0xd8;
  if(type==='image/webp')return data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
  return false;
}

/**
 * Turn uploaded database assets into inline MIME parts. Vercel deployments may
 * require a browser login, which Gmail cannot provide when fetching HTTPS URLs.
 * CID images are delivered with the message and do not become regular attachments.
 */
export async function inlineTemplateAssets(html:string):Promise<PreparedHtml>{
  const matches=[...html.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)];
  const assets=new Map<string,{cid:string;attachment:InlineImage}>();
  let output=html;

  for(const match of matches){
    const source=match[2];
    let parsed:URL;
    try{parsed=new URL(source)}catch{continue}
    if(parsed.protocol!=='https:')continue;
    const assetMatch=assetPath.exec(parsed.pathname);
    if(!assetMatch)continue;
    const id=assetMatch[1].toLowerCase();
    let cached=assets.get(id);
    if(!cached){
      const asset=await getTemplateAsset(id);
      if(!asset)throw new Error('A template image is missing from storage. Re-upload it before sending.');
      const data=Buffer.isBuffer(asset.data)?asset.data:Buffer.from(asset.data);
      if(!hasValidImageSignature(asset.content_type,data))throw new Error('A template image in storage is damaged or has the wrong image type. Re-upload it before sending.');
      const ext=asset.content_type==='image/jpeg'?'jpg':asset.content_type==='image/webp'?'webp':'png';
      const cid=`template-${id}@email-workspace`;
      cached={cid,attachment:{filename:`template-image-${assets.size+1}.${ext}`,content:data,contentType:asset.content_type,cid,contentDisposition:'inline'}};
      assets.set(id,cached);
    }
    const tag=match[0];
    const replaced=tag.replace(/(\bsrc\s*=\s*)(["']).*?\2/i,`$1"cid:${cached.cid}"`);
    output=output.replace(tag,replaced);
  }

  return {html:output,attachments:[...assets.values()].map(x=>x.attachment)};
}
