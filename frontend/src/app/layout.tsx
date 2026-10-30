import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin Dashboard สำหรับดูคิวลูกค้าและจัดการช่วงเวลาจอง",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
