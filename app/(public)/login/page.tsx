"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Eye, EyeOff, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth, AuthRole } from "@/lib/AuthContext";
import { motion } from "motion/react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { t } = useLanguage();
  const { signIn, signUp, isAuthenticated, loading } = useAuth();
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
  const [signUpSuccess, setSignUpSuccess] = useState(false);


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
        const result = await signUp(email, password, name, "owner");
        if (result.error) {
          setError(result.error);
        } else if (result.needsVerification) {
          setSignUpSuccess(true);
          setIsSignUp(false);
          setName("");
          setEmail("");
          setPassword("");
        } else {
          router.replace("/dashboard");
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          router.replace("/dashboard");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  const isOwner = activeTab === "owner";

  return (
    <motion.div
      className="min-h-screen grid lg:grid-cols-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Left — Branded Panel */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`hidden lg:flex items-center justify-center p-12 transition-colors duration-500 ${
        isOwner
          ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800"
          : "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800"
      }`}>
        <div className="w-full max-w-md text-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
            isOwner ? "bg-white/15 backdrop-blur-sm" : "bg-white/15 backdrop-blur-sm"
          }`}>
            {isOwner
              ? <Building2 size={36} className="text-white" />
              : <User size={36} className="text-white" />
            }
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            {isOwner ? "PG Owner Portal" : "Tenant Portal"}
          </h2>
          <p className={`text-sm leading-relaxed ${isOwner ? "text-blue-100" : "text-emerald-100"}`}>
            {isOwner
              ? "Manage your properties, tenants, rent collection, and more — all from one dashboard."
              : "View your room, pay rent, raise complaints, and stay updated with PG announcements."
            }
          </p>
          <div className={`mt-8 grid grid-cols-3 gap-4 p-5 rounded-2xl ${
            isOwner ? "bg-white/10" : "bg-white/10"
          }`}>
            {isOwner ? (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">100%</p>
                  <p className="text-[11px] text-blue-200 mt-1">Digital</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">24/7</p>
                  <p className="text-[11px] text-blue-200 mt-1">Access</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">One‑Time</p>
                  <p className="text-[11px] text-blue-200 mt-1">Subscription</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">Easy</p>
                  <p className="text-[11px] text-emerald-200 mt-1">Payments</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">Quick</p>
                  <p className="text-[11px] text-emerald-200 mt-1">Complaints</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">Live</p>
                  <p className="text-[11px] text-emerald-200 mt-1">Updates</p>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Right — Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-white"
      >
        <div className="w-full max-w-md">
          {/* Logo */}

          {isSignUp && isOwner ? (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Create Owner Account</h1>
              <p className="mt-1 text-sm text-slate-500">Set up your PG management account</p>
            </>
          ) : isOwner ? (
            <>
              <div className="flex flex-col items-center mb-2">
                <svg viewBox="0 0 200 160" className="w-48 h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Lotus flower */}
                  <g stroke="#1e293b" strokeWidth="1.5" fill="none">
                    {/* Center petal */}
                    <path d="M100 20 C100 20, 92 35, 92 45 C92 55, 100 60, 100 60 C100 60, 108 55, 108 45 C108 35, 100 20, 100 20Z" fill="#1e293b" opacity="0.15"/>
                    {/* Left petals */}
                    <path d="M100 60 C95 50, 82 38, 78 35 C74 32, 76 42, 80 50 C84 58, 95 62, 100 60Z" fill="#1e293b" opacity="0.1"/>
                    <path d="M100 60 C92 52, 74 44, 68 43 C62 42, 66 50, 72 56 C78 62, 94 63, 100 60Z" fill="#1e293b" opacity="0.08"/>
                    {/* Right petals */}
                    <path d="M100 60 C105 50, 118 38, 122 35 C126 32, 124 42, 120 50 C116 58, 105 62, 100 60Z" fill="#1e293b" opacity="0.1"/>
                    <path d="M100 60 C108 52, 126 44, 132 43 C138 42, 134 50, 128 56 C122 62, 106 63, 100 60Z" fill="#1e293b" opacity="0.08"/>
                    {/* Petal outlines */}
                    <path d="M100 20 C100 20, 91 36, 91 46 C91 56, 100 62, 100 62"/>
                    <path d="M100 20 C100 20, 109 36, 109 46 C109 56, 100 62, 100 62"/>
                    <path d="M100 62 C94 52, 80 38, 76 35"/>
                    <path d="M100 62 C84 58, 76 50, 76 35"/>
                    <path d="M100 62 C106 52, 120 38, 124 35"/>
                    <path d="M100 62 C116 58, 124 50, 124 35"/>
                    <path d="M100 62 C90 54, 72 46, 66 45"/>
                    <path d="M100 62 C78 60, 68 52, 66 45"/>
                    <path d="M100 62 C110 54, 128 46, 134 45"/>
                    <path d="M100 62 C122 60, 132 52, 134 45"/>
                  </g>
                  {/* Top decorative swirl */}
                  <path d="M40 80 C50 80, 55 75, 60 78 C65 81, 60 85, 55 84 C50 83, 52 78, 60 78 L80 78 C90 78, 95 75, 100 75 C105 75, 110 78, 120 78 L140 78 C148 78, 150 83, 145 84 C140 85, 135 81, 140 78 C145 75, 150 80, 160 80" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  {/* Namaste text */}
                  <text x="100" y="120" textAnchor="middle" style={{ fontFamily: "var(--font-playfair)", fontSize: "34px", fontStyle: "italic", fontWeight: 900 }} fill="#1e293b">namaste</text>
                  {/* Bottom decorative swirl */}
                  <path d="M40 135 C50 135, 55 130, 60 133 C65 136, 60 140, 55 139 C50 138, 52 133, 60 133 L80 133 C90 133, 95 130, 100 130 C105 130, 110 133, 120 133 L140 133 C148 133, 150 138, 145 139 C140 140, 135 136, 140 133 C145 130, 150 135, 160 135" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Tenant Login</h1>
              <p className="mt-1 text-sm text-slate-500">Use the credentials sent by your PG owner</p>
            </>
          )}

          {/* Role Tabs — only show if no role was pre-selected */}
          {!searchParams.get("role") && (
            <div className="mt-6 flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => { setActiveTab("owner"); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  isOwner
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Building2 size={14} />
                {t("login.ownerTab")}
              </button>
              <button
                onClick={() => { setActiveTab("tenant"); setIsSignUp(false); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  !isOwner
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <User size={14} />
                {t("login.tenantTab")}
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp && isOwner && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                    isOwner ? "focus:ring-blue-500/20 focus:border-blue-500" : "focus:ring-emerald-500/20 focus:border-emerald-500"
                  }`}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t("login.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                  isOwner ? "focus:ring-blue-500/20 focus:border-blue-500" : "focus:ring-emerald-500/20 focus:border-emerald-500"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t("login.password")}
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Min 6 characters" : "Enter your password"}
                  className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all pr-10 ${
                    isOwner ? "focus:ring-blue-500/20 focus:border-blue-500" : "focus:ring-emerald-500/20 focus:border-emerald-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isSignUp && isOwner && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className={`w-4 h-4 rounded border-slate-300 ${isOwner ? "text-blue-600 focus:ring-blue-500" : "text-emerald-600 focus:ring-emerald-500"}`} />
                  <span className="text-sm text-slate-600">{t("login.remember")}</span>
                </label>
                <button type="button" className={`text-sm font-medium ${isOwner ? "text-blue-600 hover:text-blue-700" : "text-emerald-600 hover:text-emerald-700"}`}>
                  {t("login.forgot")}
                </button>
              </div>
            )}

            {signUpSuccess && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="font-medium">Account created successfully!</p>
                <p className="mt-1 text-emerald-600">Check your email for a verification link, then sign in below.</p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-all shadow-lg ${
                isOwner
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25"
              }`}
            >
              {submitting ? "Please wait..." : isSignUp && isOwner ? "Create Account" : t("login.submit")}
            </button>
          </form>

          {isOwner && (
            <p className="mt-6 text-center text-sm text-slate-500">
              {isSignUp ? "Already have an account?" : t("login.noAccount")}{" "}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(""); setSignUpSuccess(false); }}
                className="text-blue-600 font-medium hover:text-blue-700"
              >
                {isSignUp ? "Sign In" : t("login.signUp")}
              </button>
            </p>
          )}
          {!isOwner && (
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                Don't have credentials? Ask your PG owner to add you as a tenant.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                They'll send your login details to your email.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
