
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth/auth-provider"

export const metadata: Metadata = {
  title: 'HireFit AI | Intelligent Career Excellence',
  description: 'Intelligent Resume Evaluation, Recruiter Behavior Simulation, and AI Career Coaching.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
