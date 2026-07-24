"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth, AuthRole } from "@/lib/AuthContext";
import ImagePlaceholder from "@/components/ImagePlaceholder";

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

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    if (isSignUp && !name) {
      setError("Please enter your name");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp(email, password, name, activeTab);
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

  if (loading) return null;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — Image */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-12">
        <div className="w-full max-w-lg">
          <ImagePlaceholder
            height="h-96"
            label="Property Showcase"
            rounded="rounded-2xl"
            className="shadow-2xl"
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop"
          />
          <div className="mt-8 text-center text-white">
            <h2 className="text-2xl font-bold">ProManage</h2>
            <p className="mt-2 text-blue-100 text-sm">
              {t("landing.heroSub")}
            </p>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ProManage</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {isSignUp ? "Create Account" : t("login.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignUp ? "Set up your PG management account" : t("login.subtitle")}
          </p>

          {/* Role Tabs */}
          <div className="mt-6 flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => { setActiveTab("owner"); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "owner"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("login.ownerTab")}
            </button>
            <button
              onClick={() => { setActiveTab("tenant"); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                activeTab === "tenant"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("login.tenantTab")}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-10"
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

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-600">{t("login.remember")}</span>
                </label>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  {t("login.forgot")}
                </button>
              </div>
            )}

            {signUpSuccess && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <p className="font-medium">Account created successfully!</p>
                <p className="mt-1 text-emerald-600">Check your email for a verification link, then sign in below.</p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Please wait..." : isSignUp ? "Create Account" : t("login.submit")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isSignUp ? "Already have an account?" : t("login.noAccount")}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setSignUpSuccess(false); }}
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              {isSignUp ? "Sign In" : t("login.signUp")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
