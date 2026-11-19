import { Spinner } from "@/components/ui/Spinner";

/** Shown while the session is checked and restored, before the app appears. */
export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 text-text-secondary">
      <Spinner className="size-5" label="Restoring your session" />
      <p className="text-secondary">Signing you in…</p>
    </main>
  );
}
