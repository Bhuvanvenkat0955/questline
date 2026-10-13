import type { Metadata } from "next";
import { JetBrains_Mono, Silkscreen } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Questline",
  description: "Turn a big goal into daily quests and level up every day.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${silkscreen.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Pop-up messages like "+35 XP" and "Level up!", drawn in the pixel style. */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex w-full items-center gap-3 border-[3px] border-ink bg-yellow px-4 py-3 text-ink shadow-pixel [--shadow-color:var(--yellow-deep)]",
              title: "font-display text-sm uppercase",
              description: "text-xs",
              success: "bg-green [--shadow-color:var(--green-deep)]",
              error: "bg-red text-cream [--shadow-color:var(--red-deep)]",
            },
          }}
        />
      </body>
    </html>
  );
}
