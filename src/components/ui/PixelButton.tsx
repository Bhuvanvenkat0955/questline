import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { accentBg, accentOn, accentShadow } from "./accents";

// cva = "class variance authority". It maps props like color="red" size="lg"
// to the right Tailwind classes, and TypeScript knows which values are allowed.
const pixelButton = cva(
  [
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 select-none",
    "border-[3px] border-ink font-display uppercase tracking-wide",
    "shadow-pixel",
    // Press: the button sinks into its own shadow, like a physical arcade key.
    "transition-[translate,box-shadow,filter] duration-100 ease-out motion-reduce:transition-none",
    "active:translate-x-1 active:translate-y-1 active:shadow-none",
    "hover:brightness-110",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-yellow",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      color: {
        red: [accentBg.red, accentOn.red, accentShadow.red],
        cyan: [accentBg.cyan, accentOn.cyan, accentShadow.cyan],
        yellow: [accentBg.yellow, accentOn.yellow, accentShadow.yellow],
        green: [accentBg.green, accentOn.green, accentShadow.green],
        blue: [accentBg.blue, accentOn.blue, accentShadow.blue],
        purple: [accentBg.purple, accentOn.purple, accentShadow.purple],
        dark: "border-line bg-panel-raised text-text [--shadow-color:#000]",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-14 px-7 text-base",
      },
    },
    defaultVariants: { color: "red", size: "md" },
  },
);

type PixelButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> &
  VariantProps<typeof pixelButton>;

export function PixelButton({ color, size, className, type = "button", ...props }: PixelButtonProps) {
  return <button type={type} className={pixelButton({ color, size, className })} {...props} />;
}
