"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

function ResetPasswordContent() {
  const { updatePassword, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) {
          setReady(!error);
          setChecking(false);
          router.replace("/reset-password");
        }
        return;
      }

      if (typeof window !== "undefined" && window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!cancelled) {
            setReady(!error);
            setChecking(false);
            window.history.replaceState(null, "", "/reset-password");
          }
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setReady(!!data.session);
        setChecking(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setChecking(false);
      }
    });

    void bootstrap();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      await signOut();
      setTimeout(() => router.replace("/login?role=owner"), 1500);
    } catch {
      setError("Unable to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]/70 focus:border-[var(--teal)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]/15";

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--teal)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] p-6 sm:p-8">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-[var(--forest)]">
          <Lock size={18} className="text-white" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-[var(--ink)]">Set a new password</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Choose a new password for your ProManage account.
        </p>

        {!ready ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This reset link is invalid or has expired. Request a new one from the login page.
            </p>
            <Link
              href="/login?role=owner"
              className="inline-flex text-sm font-medium text-[var(--teal)] hover:text-[var(--teal-deep)]"
            >
              Back to login
            </Link>
          </div>
        ) : success ? (
          <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Password updated. Redirecting to login…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">New password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">Confirm password</label>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[var(--teal)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)] disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--teal)] border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
