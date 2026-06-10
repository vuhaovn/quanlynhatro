import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Quản Lý Nhà Trọ",
  description: "Phần mềm quản lý nhà trọ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="antialiased">
        <NextTopLoader showSpinner={false} />
        {children}
      </body>
    </html>
  );
}
