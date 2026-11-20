import {NextRequest,NextResponse} from 'next/server'; import {originAllowed} from '@/lib/auth';
export async function POST(req:NextRequest){if(!originAllowed(req))return NextResponse.json({error:'Invalid origin'},{status:403});const res=NextResponse.json({ok:true});res.cookies.set('postmark_session','',{httpOnly:true,path:'/',maxAge:0});return res;}
