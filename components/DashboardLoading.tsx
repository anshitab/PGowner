export default function DashboardLoading({ message = "Loading your workspace…" }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--teal)] border-t-transparent" />
        <p className="text-sm text-[var(--muted)]">{message}</p>
      </div>
    </div>
  );
}
