import * as React from "react";
import { cn } from "@/utils/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-line bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave/50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
