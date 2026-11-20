import {NextResponse} from 'next/server';import {isAuthenticated} from '@/lib/auth';import {smtpReady} from '@/lib/mailer';
export async function GET(){if(!(await isAuthenticated()))return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json({configured:smtpReady(),sender:process.env.SMTP_USER||null,host:process.env.SMTP_HOST||null});}
