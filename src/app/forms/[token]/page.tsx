import {getPublicHostedForm} from '@/lib/database';
import {notFound} from 'next/navigation';
import PublicForm from '@/components/public-form';
import type {Metadata} from 'next';
export const dynamic='force-dynamic';
export const metadata:Metadata={robots:{index:false,follow:false}};
export default async function HostedFormPage({params,searchParams}:{params:{token:string};searchParams:{campaign?:string}}){if(!/^[a-f0-9]{48}$/i.test(params.token))notFound();const form=await getPublicHostedForm(params.token).catch(()=>undefined);if(!form?.published)notFound();return <PublicForm form={form} token={params.token} campaign={searchParams.campaign||''}/>}
