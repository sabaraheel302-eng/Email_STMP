import type { Config } from 'tailwindcss';
export default { content: ['./src/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#172b4d', muted: '#64748b', brand: '#4f46e5' }, boxShadow: { soft: '0 8px 30px rgba(15,23,42,.06)' } } }, plugins: [] } satisfies Config;
