import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Society Pool | Better together",
  description: "Neighbourhood deals, pooled for better everyday prices.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
