"use client";

// The sidebar's page links. A client component because it reads the current
// URL (usePathname) to highlight the page you're on.

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLine, Checkbox, Clock, Map, Plus, SlidersHorizontal } from "pixelarticons/react";

const links = [
  { href: "/", label: "Today", icon: <Checkbox /> },
  { href: "/roadmap", label: "Roadmap", icon: <Map /> },
  { href: "/progress", label: "Progress", icon: <ChartLine /> },
  { href: "/time", label: "Time", icon: <Clock /> },
  { href: "/goals/new", label: "New goal", icon: <Plus /> },
  { href: "/settings", label: "Settings", icon: <SlidersHorizontal /> },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex gap-2 md:flex-col">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex h-11 items-center gap-3 border-2 px-3 font-display text-sm uppercase [&_svg]:size-5",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow",
              active
                ? "border-ink bg-yellow text-ink shadow-pixel [--shadow-color:var(--yellow-deep)]"
                : "border-transparent text-text-dim hover:border-line hover:text-text",
            )}
          >
            {link.icon}
            {/* Icon-only on very narrow windows; screen readers still hear the label. */}
            <span className="sr-only sm:not-sr-only">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
