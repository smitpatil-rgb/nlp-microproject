import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaFlow · Translate naturally",
  description: "A careful, context-aware translation workspace for English, Hindi, French, and Spanish.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
