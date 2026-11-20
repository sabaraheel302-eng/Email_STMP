import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
const cookieName = 'postmark_session';
function secret() { const value = process.env.AUTH_SECRET; if (!value || value.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters'); return new TextEncoder().encode(value); }
export async function makeSession() { return new SignJWT({ role: 'owner' }).setProtectedHeader({alg:'HS256'}).setSubject('owner').setIssuedAt().setExpirationTime('7d').sign(secret()); }
export async function isAuthenticated() { try { const token = cookies().get(cookieName)?.value; if (!token) return false; await jwtVerify(token,secret()); return true; } catch { return false; } }
export async function requireAuth() { if (!(await isAuthenticated())) return NextResponse.json({error:'Unauthorized'},{status:401}); return null; }
export function sessionCookie(token: string) { return {name:cookieName,value:token,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*7}; }
export async function apiAuth(request: NextRequest) { try { const token=request.cookies.get(cookieName)?.value; if (!token) return false; await jwtVerify(token,secret()); return true; } catch { return false; } }
export function originAllowed(request: NextRequest) { const origin=request.headers.get('origin'); if (!origin) return true; try { return new URL(origin).host===request.headers.get('host'); } catch { return false; } }
