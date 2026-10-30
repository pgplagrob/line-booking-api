import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-xl border border-border bg-white px-4 text-base text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        "[color-scheme:light]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
