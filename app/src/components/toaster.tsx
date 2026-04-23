"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      theme="light"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border bg-card text-card-foreground shadow-xl font-[inherit]",
          title: "font-medium text-sm",
          description: "text-muted-foreground text-xs",
          actionButton: "bg-primary text-primary-foreground text-xs rounded-md px-2 py-1",
        },
      }}
    />
  );
}
