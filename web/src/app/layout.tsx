import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./performance.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ClientOnly } from "@/components/client-only";
import { NavigationProgress } from "@/components/navigation-progress";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

import { Orbitron } from "next/font/google";
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillSync - AI-Powered Job Portal",
  description: "Accelerate your career with AI-driven job matching and recruitment solutions.",
};

import { ReactQueryProvider } from "./react-query-provider";
import { AuthSync } from "@/components/auth/auth-sync";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

async function getServerUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) return { user: null, token: null };

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!res.ok) return { user: null, token: null };
    const data = await res.json();
    return { user: data.data || data, token };
  } catch (err) {
    console.error('[RootLayout] Server-side profile fetch failed:', err);
    return { user: null, token: null };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const { user, token } = await getServerUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${orbitron.variable}`} suppressHydrationWarning>
        <ReactQueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <LanguageProvider>
              <NavigationProgress />
              <AuthSync user={user} token={token}>
                <ClientOnly>
                  {children}
                </ClientOnly>
              </AuthSync>
            </LanguageProvider>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
