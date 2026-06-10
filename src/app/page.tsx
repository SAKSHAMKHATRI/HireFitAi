// This file is neutralized to resolve a parallel route conflict with src/app/(dashboard)/page.tsx.
// In Next.js, two files cannot resolve to the same path (/).
export const dynamic = 'force-static';
// No default export to prevent Next.js from treating this as a page.
