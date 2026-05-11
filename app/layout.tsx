import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sudoku-league.vercel.app"),
  title: "Судоку",
  description: "Соревновательное судоку с ИИ-подсказками, прогрессией, косметикой, рейтингом и ареной с саботажами.",
  openGraph: {
    title: "Судоку",
    description: "Платформа судоку с ИИ-подсказками, прогрессией, косметикой и ареной для друзей.",
    images: ["/og.svg"]
  },
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="standard">
      <body>
        <AppProviders>
          <Navigation />
          <div className="app-content">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
