import {isAuthenticated} from '@/lib/auth';
import {redirect} from 'next/navigation';
import Workspace from '@/components/workspace';
export default async function ActionFormsPage(){if(!(await isAuthenticated()))redirect('/login');return <Workspace view="action-forms"/>}
