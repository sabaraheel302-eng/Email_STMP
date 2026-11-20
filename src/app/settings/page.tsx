import Workspace from '@/components/workspace';import {isAuthenticated} from '@/lib/auth';import {redirect} from 'next/navigation';
export default async function Settings(){if(!(await isAuthenticated()))redirect('/login');return <Workspace view="settings"/>}
