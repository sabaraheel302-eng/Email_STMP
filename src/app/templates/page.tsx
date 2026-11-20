import TemplateManager from '@/components/template-manager';import {isAuthenticated} from '@/lib/auth';import {redirect} from 'next/navigation';
export default async function Templates(){if(!(await isAuthenticated()))redirect('/login');return <TemplateManager/>}
