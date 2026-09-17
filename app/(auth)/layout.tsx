export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-muted/40 p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-30%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)] dark:bg-[radial-gradient(ellipse_80%_55%_at_50%_-25%,color-mix(in_oklch,var(--primary)_28%,transparent),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 size-[min(55vw,22rem)] rounded-full bg-chart-2/15 blur-3xl dark:bg-chart-4/20"
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
