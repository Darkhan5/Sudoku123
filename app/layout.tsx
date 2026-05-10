import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sudoku-league.vercel.app"),
  title: "Қазақ Судоку",
  description: "Ежедневное судоку с ИИ-подсказками, Diamond, локальным профилем и общим рейтингом.",
  openGraph: {
    title: "Қазақ Судоку",
    description: "Задача дня, ИИ-подсказки, рейтинг Казахстана и общий рейтинг.",
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
