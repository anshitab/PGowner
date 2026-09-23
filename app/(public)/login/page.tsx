"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Eye, EyeOff, User, MailCheck, ArrowLeft, UserRound } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth, AuthRole } from "@/lib/AuthContext";
import {
  DEMO_OWNER,
  DEMO_TENANT,
  isDemoAccountsEnabled,
  getDemoCredentials,
} from "@/lib/demo-accounts";
import { motion } from "motion/react";

const PANEL_IMAGE =
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--teal)] border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { t } = useLanguage();
  const { signIn, resetPassword, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRole = (searchParams.get("role") as AuthRole) || "owner";
  const [activeTab, setActiveTab] = useState<AuthRole>(initialRole);
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const signInDemo = useCallback(
    async (role: "owner" | "tenant") => {
      const creds = getDemoCredentials(role);
      setActiveTab(role);
      setIsSignUp(false);
      setForgotMode(false);
      setError("");
      setSubmitting(true);
      try {
        const result = await signIn(creds.email, creds.password);
        if (result.error) {
          setError(
            "Demo sign-in failed. Run npm run demo:setup once (or paste supabase/apply-all.sql in Supabase), then try again."
          );
          return;
        }
        router.replace("/dashboard");
      } finally {
        setSubmitting(false);
      }
    },
    [signIn, router]
  );

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

  const sendOwnerOtp = async () => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to send verification code");
    }
    setChallengeToken(data.challengeToken);
    setOtp("");
    setOtpStep(true);
    setResendCooldown(30);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setSubmitting(true);
    try {
      const result = await resetPassword(email.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setForgotSent(true);
    } catch {
      setError("Unable to send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    if (isSignUp && activeTab === "owner" && !name) {
      setError("Please enter your name");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp && activeTab === "owner") {
        if (!otpStep) {
          await sendOwnerOtp();
        } else {
          if (!/^\d{6}$/.test(otp.trim())) {
            setError("Enter the 6-digit code sent to your email");
            return;
          }
          const verifyRes = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim(),
              password,
              otp: otp.trim(),
              challengeToken,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setError(verifyData.error || "Verification failed");
            return;
          }

          const result = await signIn(email.trim(), password);
          if (result.error) {
            setError(result.error);
            return;
          }
          router.replace("/setup");
        }
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) {
          const msg = result.error.toLowerCase();
          setError(
            msg.includes("invalid") || msg.includes("credentials")
              ? "Incorrect email or password"
              : result.error
          );
        } else if (result.role === "tenant") {
          router.replace("/dashboard");
        } else {
          router.replace("/dashboard");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await sendOwnerOtp();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--teal)] border-t-transparent" />
      </div>
    );
  }

  const isOwner = activeTab === "owner";
  const demoChooseMode =
    isDemoAccountsEnabled() &&
    searchParams.get("demo") === "choose" &&
    !forgotMode &&
    !isSignUp &&
    !otpStep;
  const showDemoLogin =
    isDemoAccountsEnabled() && !demoChooseMode && !forgotMode && !isSignUp && !otpStep;

  const fillDemoCredentials = (role: AuthRole) => {
    setActiveTab(role);
    setIsSignUp(false);
    setError("");
    setOtpStep(false);
    if (role === "owner") {
      setEmail(DEMO_OWNER.email);
      setPassword(DEMO_OWNER.password);
      setName(DEMO_OWNER.name);
    } else {
      setEmail(DEMO_TENANT.email);
      setPassword(DEMO_TENANT.password);
      setName("");
    }
  };
  const inputClass =
    "w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]/70 focus:border-[var(--teal)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]/15";

  return (
    <motion.div
      className="grid min-h-screen lg:grid-cols-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Left — photo + brand */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="relative hidden overflow-hidden lg:block"
      >
        <img
          src={PANEL_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[var(--ink)]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--forest)] via-transparent to-[var(--ink)]/40" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="font-display text-2xl font-semibold text-white">
            ProManage
          </Link>
          <div className="max-w-sm">
            <p className="font-display text-3xl font-semibold leading-snug text-white">
              {isOwner ? "Run the house with less noise." : "Your room, dues, and requests—clear."}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {isOwner
                ? "Occupancy, rent, and checkout in one calm workspace."
                : "Use the login your PG owner sent you."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Right — form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="flex items-center justify-center bg-[var(--surface)] px-5 py-10 sm:px-8 lg:p-12"
      >
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="font-display mb-8 block text-xl font-semibold text-[var(--ink)] lg:hidden"
          >
            ProManage
          </Link>

          {demoChooseMode ? (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
                  Try the live demo
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Choose whether you want to explore as a PG owner or as a tenant. Sample data is already loaded.
                </p>
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
                  {error}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => signInDemo("owner")}
                  className="flex flex-col items-start rounded-xl border-2 border-[var(--teal)]/30 bg-[var(--teal)]/5 p-5 text-left transition hover:border-[var(--teal)] hover:bg-[var(--teal)]/10 disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal)] text-white">
                    <Building2 size={18} />
                  </span>
                  <span className="mt-4 font-display text-lg font-semibold text-[var(--ink)]">PG owner</span>
                  <span className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    Dashboard, tenants, rent, notifications, and complaint approval.
                  </span>
                  <span className="mt-4 text-xs font-semibold text-[var(--teal-deep)]">
                    {submitting ? "Signing in…" : "Enter owner demo →"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => signInDemo("tenant")}
                  className="flex flex-col items-start rounded-xl border-2 border-[var(--line)] bg-[var(--surface)] p-5 text-left transition hover:border-[var(--teal)]/40 hover:shadow-sm disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ink)] text-white">
                    <UserRound size={18} />
                  </span>
                  <span className="mt-4 font-display text-lg font-semibold text-[var(--ink)]">Tenant</span>
                  <span className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    My room, complaints, food menu, and messages from your PG.
                  </span>
                  <span className="mt-4 text-xs font-semibold text-[var(--teal-deep)]">
                    {submitting ? "Signing in…" : "Enter tenant demo →"}
                  </span>
                </button>
              </div>

              <p className="text-center text-sm text-[var(--muted)]">
                <Link href="/login" className="font-medium text-[var(--teal)] hover:text-[var(--teal-deep)]">
                  Sign in with your own account
                </Link>
              </p>
            </div>
          ) : (
            <>
          {forgotMode ? (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
                Reset password
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Enter your account email and we’ll send a reset link.
              </p>
            </>
          ) : isSignUp && isOwner && otpStep ? (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
                Check your email
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-[var(--ink)]">{email}</span>
              </p>
            </>
          ) : isSignUp && isOwner ? (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
                Create owner account
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                We’ll verify your email before PG setup.
              </p>
            </>
          ) : isOwner ? (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
                Owner sign in
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Welcome back. Pick up where you left off.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
                Tenant sign in
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Use the credentials sent by your PG owner.
              </p>
            </>
          )}

          {!searchParams.get("role") && !forgotMode && (
            <div className="mt-6 flex rounded-md border border-[var(--line)] bg-[var(--background)] p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("owner");
                  setError("");
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded py-2.5 text-sm font-medium transition ${
                  isOwner
                    ? "bg-[var(--surface-raised)] text-[var(--teal)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <Building2 size={14} />
                {t("login.ownerTab")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("tenant");
                  setIsSignUp(false);
                  setError("");
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded py-2.5 text-sm font-medium transition ${
                  !isOwner
                    ? "bg-[var(--surface-raised)] text-[var(--teal)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <User size={14} />
                {t("login.tenantTab")}
              </button>
            </div>
          )}

          <form
            onSubmit={forgotMode ? handleForgotPassword : handleSubmit}
            className="mt-8 space-y-4"
          >
            {forgotMode ? (
              <>
                {forgotSent ? (
                  <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    If an account exists for <span className="font-medium">{email.trim()}</span>, a
                    reset link has been sent. Check your inbox and spam folder.
                  </p>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      {t("login.email")}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>
                )}
              </>
            ) : isSignUp && isOwner && otpStep ? (
              <>
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[var(--mist)]">
                    <MailCheck className="text-[var(--teal)]" size={26} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className={`${inputClass} text-center text-2xl font-semibold tracking-[0.4em]`}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setOtp("");
                      setChallengeToken("");
                      setError("");
                    }}
                    className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || submitting}
                    className="font-medium text-[var(--teal)] hover:text-[var(--teal-deep)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {isSignUp && isOwner && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                    {t("login.email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                    {t("login.password")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? "Min 6 characters" : "Enter your password"}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)]"
                      />
                      <span className="text-sm text-[var(--muted)]">{t("login.remember")}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setForgotSent(false);
                        setError("");
                        setIsSignUp(false);
                      }}
                      className="text-sm font-medium text-[var(--teal)] hover:text-[var(--teal-deep)]"
                    >
                      {t("login.forgot")}
                    </button>
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}

            {showDemoLogin && (
              <div className="rounded-md border border-dashed border-[var(--teal)]/40 bg-[var(--teal)]/5 px-3 py-3">
                <p className="text-xs font-medium text-[var(--ink)]">Try the live demo</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Explore with sample data—pick owner or tenant.
                </p>
                <Link
                  href="/login?demo=choose"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-[var(--teal)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--teal-deep)]"
                >
                  Choose demo role
                </Link>
              </div>
            )}

            {!(forgotMode && forgotSent) && (
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-[var(--teal)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)] disabled:opacity-50"
              >
                {submitting
                  ? "Please wait..."
                  : forgotMode
                    ? "Send reset link"
                    : isSignUp && isOwner && otpStep
                      ? "Verify & continue"
                      : isSignUp && isOwner
                        ? "Send verification code"
                        : t("login.submit")}
              </button>
            )}
          </form>

          {forgotMode ? (
            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setForgotSent(false);
                  setError("");
                }}
                className="inline-flex items-center gap-1 font-medium text-[var(--teal)] hover:text-[var(--teal-deep)]"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </button>
            </p>
          ) : isOwner && !otpStep ? (
            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              {isSignUp ? "Already have an account?" : t("login.noAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setOtpStep(false);
                  setOtp("");
                  setChallengeToken("");
                }}
                className="font-medium text-[var(--teal)] hover:text-[var(--teal-deep)]"
              >
                {isSignUp ? "Sign in" : t("login.signUp")}
              </button>
            </p>
          ) : null}
          {!isOwner && !forgotMode && (
            <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)]">
              No login yet? Ask your PG owner to add you—they’ll email your credentials.
            </p>
          )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
