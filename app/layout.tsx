import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/lib/queries/providers";
import { Toaster } from "sonner";
import "./tailwind.css";
import "./globals.scss";
import { Header } from "@/components/Header";
import { AuthButton } from "@/components/AuthButton";
import Ticker from "@/components/Ticker";
import styles from './layout.module.scss';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Super League Fantasy",
  description: "Fantasy frisbee league application",
};

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${styles.body}`}>
        <QueryProvider>
          <Ticker />
          <Header>
            <AuthButton />
          </Header>
          <main className={styles.main}>
            {children}
          </main>
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
