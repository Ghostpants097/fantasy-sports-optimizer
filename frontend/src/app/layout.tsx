import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fantasy Sports Optimizer",
  description: "AI-Driven Daily Fantasy Sports Lineup Optimization Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#0f172a] text-slate-100 antialiased`}>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
