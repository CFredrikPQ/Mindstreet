import type { Metadata } from "next";
import { Lato, Prompt } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
});

const prompt = Prompt({
  subsets: ["latin"],
  weight: ["300"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "Mindstreet",
  description:
    "Vi kan bank och finans. Erfarna, kompetenta konsulter som kliver in och får saker gjorda.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${lato.variable} ${prompt.variable}`}>
      <body>{children}</body>
    </html>
  );
}
