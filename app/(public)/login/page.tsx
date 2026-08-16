"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Eye, EyeOff, User, MailCheck, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth, AuthRole } from "@/lib/AuthContext";
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
  const { signIn, signOut, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRole = (searchParams.get("role") as AuthRole) || "owner";
  const [activeTab, setActiveTab] = useState<AuthRole>(initialRole);
  const [isSignUp, setIsSignUp] = useState(false);
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
          if (result.role === "super_admin") {
            await signOut();
            setError("Incorrect email or password");
            return;
          }
          router.replace("/setup");
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          const msg = result.error.toLowerCase();
          setError(
            msg.includes("invalid") || msg.includes("credentials")
              ? "Incorrect email or password"
              : result.error
          );
        } else if (result.role === "super_admin") {
          await signOut();
          setError("Incorrect email or password");
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

          {isSignUp && isOwner && otpStep ? (
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

          {!searchParams.get("role") && (
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

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isSignUp && isOwner && otpStep ? (
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

                {!isSignUp && isOwner && (
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[var(--teal)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)] disabled:opacity-50"
            >
              {submitting
                ? "Please wait..."
                : isSignUp && isOwner && otpStep
                  ? "Verify & continue"
                  : isSignUp && isOwner
                    ? "Send verification code"
                    : t("login.submit")}
            </button>
          </form>

          {isOwner && !otpStep && (
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
          )}
          {!isOwner && (
            <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)]">
              No login yet? Ask your PG owner to add you—they’ll email your credentials.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
