"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LayoutGrid,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { motion } from "motion/react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=2000&q=80";

const WORKSPACE_IMAGE =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80";

const STEPS = [
  {
    n: "01",
    title: "Set up your PG",
    body: "Floors, rooms, beds, and rent—entered once, structured for you.",
    icon: LayoutGrid,
  },
  {
    n: "02",
    title: "Get verified",
    body: "A short admin check unlocks tenant onboarding and collections.",
    icon: ShieldCheck,
  },
  {
    n: "03",
    title: "Run day to day",
    body: "Occupancy, dues, reminders, and complaints in one place.",
    icon: CheckCircle2,
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <header className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="/" className="font-display text-2xl font-semibold tracking-tight text-white">
            ProManage
          </a>
          <button
            onClick={() => router.push("/login?role=owner")}
            className="rounded-md bg-white/12 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Bright, lived-in PG room with natural light"
          className="hero-drift absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/55 to-[var(--ink)]/25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(31,111,97,0.35),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 sm:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <p className="font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
              ProManage
            </p>
            <h1 className="mt-5 max-w-xl text-2xl font-medium leading-snug text-white/95 sm:text-3xl">
              The quiet operating system for Indian PGs.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
              Rooms, tenants, and rent—without the spreadsheet chaos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/login?role=owner")}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--teal)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)]"
              >
                I manage a PG
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => router.push("/login?demo=choose")}
                className="inline-flex items-center gap-2 rounded-md border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/18"
              >
                Try live demo
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => router.push("/login?role=tenant")}
                className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/8 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/16"
              >
                I live in a PG
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works — visual + steps */}
      <section className="relative overflow-hidden bg-[var(--surface)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[var(--mist)]/60 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55 }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">
                How it works
              </p>
              <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                From empty building to running house.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
                Three steps. No consulting deck. Built for how PG hosts actually work.
              </p>

              <div className="mt-10 space-y-0">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.n}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.45, delay: i * 0.07 }}
                      className="relative flex gap-4 pb-8 last:pb-0"
                    >
                      {i < STEPS.length - 1 && (
                        <span className="absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-px bg-[var(--line)]" />
                      )}
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--forest)] text-white shadow-sm">
                        <Icon size={18} />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">
                          Step {step.n}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">
                          {step.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                          {step.body}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="overflow-hidden rounded-xl bg-[var(--ink)] shadow-[0_24px_60px_-28px_rgba(20,32,28,0.55)]">
                <img
                  src={WORKSPACE_IMAGE}
                  alt="Well-kept PG interior ready for tenants"
                  className="aspect-[4/5] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/85 via-[var(--ink)]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--mist)]">
                    Built for hosts
                  </p>
                  <p className="font-display mt-2 max-w-xs text-2xl font-semibold text-white">
                    One workspace for the whole house.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Role entry — solid panels */}
      <section>
        <div className="grid lg:grid-cols-2">
          <button
            onClick={() => router.push("/login?role=owner")}
            className="group flex min-h-[380px] flex-col justify-end bg-[var(--forest)] px-8 py-12 text-left transition hover:bg-[#1f4a40] sm:min-h-[420px] sm:px-12 sm:py-14"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/12 text-white">
              <Building2 size={20} />
            </span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mist)]">
              For owners
            </p>
            <h2 className="font-display mt-2 text-3xl font-semibold text-white sm:text-4xl">
              Run the house.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
              Occupancy, dues, UPI reminders, and checkout—built for how PGs actually operate.
            </p>
            <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition group-hover:bg-[var(--mist)]">
              Owner login
              <ArrowRight size={16} />
            </span>
          </button>

          <button
            onClick={() => router.push("/login?role=tenant")}
            className="group flex min-h-[380px] flex-col justify-end bg-[var(--ink)] px-8 py-12 text-left transition hover:bg-[#1a2924] sm:min-h-[420px] sm:px-12 sm:py-14"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/12 text-white">
              <UserRound size={20} />
            </span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mist)]">
              For tenants
            </p>
            <h2 className="font-display mt-2 text-3xl font-semibold text-white sm:text-4xl">
              Know your room.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
              See dues, raise issues, and request checkout without chasing WhatsApp threads.
            </p>
            <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-md bg-[var(--teal)] px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-[var(--teal-deep)]">
              Tenant login
              <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[var(--ink)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-display text-lg font-semibold text-white">ProManage</p>
          <p className="text-sm text-white/50">
            Built for PG hosts and tenants across India.
          </p>
        </div>
      </footer>
    </div>
  );
}
