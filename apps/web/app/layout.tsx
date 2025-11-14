import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { ProcessingStatus } from "@/components/processing-status";
import { inter, jetbrainsMono, poppins } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Smart Clip",
  description: "Smart clipboard manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${poppins.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <ProcessingStatus />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
