import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
    title: "Dupay CMS",
    description: "Dupay Payment Orchestrator Dashboard",
};

export const viewport: Viewport = {
    themeColor: "#f6f7f9",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id" className={`${geist.variable} ${geistMono.variable}`}>
            <body className="font-sans antialiased" suppressHydrationWarning={true}>
                {children}
            </body>
        </html>
    );
}
