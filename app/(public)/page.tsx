"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  BedDouble,
  ArrowRight,
  CalendarCheck,
  User,
  Phone,
  MessageSquare,
  CheckCircle2,
  X,
  MapPin,
  Train,
  IndianRupee,
  Briefcase,
  Coffee,
  ShieldCheck,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { supabase } from "@/lib/supabase";

const LOCALITIES = [
  {
    name: "Koramangala",
    rent: "₹8,000 – ₹15,000",
    nearbyOffices: "Flipkart, Swiggy, Meesho",
    metro: "Upcoming (Yellow Line)",
    vibe: "Startup hub, cafes & nightlife",
    tag: "Most Popular",
    tagColor: "bg-amber-100 text-amber-700",
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=250&fit=crop",
  },
  {
    name: "Indiranagar",
    rent: "₹9,000 – ₹18,000",
    nearbyOffices: "Startups, agencies, co-works",
    metro: "Indiranagar Metro (Purple Line)",
    vibe: "Trendy, pubs, 100 Feet Road",
    tag: "Premium",
    tagColor: "bg-rose-100 text-rose-700",
    img: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop",
  },
  {
    name: "HSR Layout",
    rent: "₹7,500 – ₹14,000",
    nearbyOffices: "Many startups, freelancers",
    metro: "HSR Layout (upcoming)",
    vibe: "Peaceful, parks, good food",
    tag: "Best Value",
    tagColor: "bg-emerald-100 text-emerald-700",
    img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=250&fit=crop",
  },
  {
    name: "BTM Layout",
    rent: "₹6,000 – ₹11,000",
    nearbyOffices: "Close to Silk Board, ORR",
    metro: "Silk Board Metro (nearby)",
    vibe: "Budget-friendly, residential",
    tag: "Budget Pick",
    tagColor: "bg-blue-100 text-blue-700",
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=250&fit=crop",
  },
  {
    name: "Whitefield",
    rent: "₹7,000 – ₹13,000",
    nearbyOffices: "ITPL, SAP, Wipro",
    metro: "Whitefield Metro",
    vibe: "IT corridor, malls & dining",
    tag: "IT Hub",
    tagColor: "bg-purple-100 text-purple-700",
    img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=250&fit=crop",
  },
  {
    name: "Marathahalli",
    rent: "₹6,500 – ₹12,000",
    nearbyOffices: "ORR companies, Deloitte",
    metro: "Marathahalli (upcoming)",
    vibe: "Central, well-connected",
    tag: "Central",
    tagColor: "bg-indigo-100 text-indigo-700",
    img: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=250&fit=crop",
  },
  {
    name: "Electronic City",
    rent: "₹5,500 – ₹10,000",
    nearbyOffices: "Infosys, TCS, Wipro",
    metro: "Bus + E-City Elevated",
    vibe: "Affordable, tech parks",
    tag: "Affordable",
    tagColor: "bg-teal-100 text-teal-700",
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=250&fit=crop",
  },
];

const TIPS = [
  {
    icon: IndianRupee,
    title: "Deposit Norms",
    desc: "Expect 2–3 months rent as security deposit. Always get a written receipt and clarify refund terms before paying.",
  },
  {
    icon: ShieldCheck,
    title: "Check Before Moving In",
    desc: "Verify water supply schedule, WiFi speed, power backup, food quality (if included), and gate closing time.",
  },
  {
    icon: Coffee,
    title: "Food Costs",
    desc: "PG with meals: ₹3,000–5,000/month extra. Without meals, budget ₹4,000–6,000/month for outside food.",
  },
  {
    icon: Train,
    title: "Commute Tips",
    desc: "Namma Metro is expanding fast. Pick a PG near a metro station to save 30–45 min daily. BMTC buses are cheap but slow.",
  },
  {
    icon: AlertCircle,
    title: "Avoid These Mistakes",
    desc: "Don't pay deposit without visiting. Avoid PGs with no written agreement. Check Google reviews and talk to existing tenants.",
  },
  {
    icon: Lightbulb,
    title: "Best Time to Search",
    desc: "June–August is peak season (freshers). Rents are 10–15% lower in Oct–Dec. Start searching 2 weeks before move-in.",
  },
];

export default function LandingPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [showVisitModal, setShowVisitModal] = useState(false);
  const [pgFilter, setPgFilter] = useState<{ gender: string; area: string }>({ gender: "", area: "" });
  const [pgResults, setPgResults] = useState<{ id: string; name: string; address: string; type: string }[]>([]);
  const [loadingPgs, setLoadingPgs] = useState(false);
  const [visitForm, setVisitForm] = useState({
    name: "",
    phone: "",
    date: "",
    message: "",
    propertyId: "",
    propertyName: "",
    pgAddress: "",
  });
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitError, setVisitError] = useState("");

  useEffect(() => {
    if (!pgFilter.gender && !pgFilter.area) {
      setPgResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingPgs(true);
      let query = supabase.from("properties").select("id, name, address, type").eq("verification_status", "verified");
      if (pgFilter.gender) {
        if (pgFilter.gender === "Co-ed") {
          query = query.eq("type", "Co-ed PG");
        } else {
          query = query.in("type", [`${pgFilter.gender} PG`, "Co-ed PG"]);
        }
      }
      if (pgFilter.area.trim()) {
        query = query.ilike("address", `%${pgFilter.area.trim()}%`);
      }
      const { data } = await query.limit(20);
      setPgResults(data || []);
      setLoadingPgs(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [pgFilter.gender, pgFilter.area]);

  const handleSelectPg = (pg: { id: string; name: string; address: string }) => {
    setVisitForm({
      ...visitForm,
      propertyId: pg.id,
      propertyName: pg.name,
      pgAddress: pg.address || "",
    });
  };

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisitError("");
    if (!visitForm.propertyName) { setVisitError("Please select a PG"); return; }
    if (!visitForm.name.trim()) { setVisitError("Please enter your name"); return; }
    if (!visitForm.phone.trim()) { setVisitError("Please enter your phone number"); return; }
    if (!visitForm.date) { setVisitError("Please select a visit date"); return; }

    setVisitSubmitting(true);

    const { error } = await supabase.from("visitors").insert({
      property_id: visitForm.propertyId,
      tenant_id: null,
      name: visitForm.name.trim(),
      phone: visitForm.phone.trim(),
      purpose: "Looking for a room",
      message: visitForm.message.trim() || null,
      visit_date: visitForm.date,
      status: "pending",
    });

    if (error) {
      setVisitError("Something went wrong. Please try again.");
    } else {
      setVisitSubmitted(true);
    }
    setVisitSubmitting(false);
  };

  const resetVisitForm = () => {
    setVisitForm({ name: "", phone: "", date: "", message: "", propertyId: "", propertyName: "", pgAddress: "" });
    setPgFilter({ gender: "", area: "" });
    setPgResults([]);
    setVisitSubmitted(false);
    setVisitError("");
  };



  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">ProManage</span>
          </div>
          <button
            onClick={() => { resetVisitForm(); setShowVisitModal(true); }}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
          >
            <CalendarCheck size={14} />
            Book a Visit
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100/60 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Trusted by 500+ PGs across Bangalore
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                {t("landing.hero")}
              </h1>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                {t("landing.heroSub")}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => router.push("/login?role=owner")}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all text-center group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Building2 size={18} />
                    <span className="text-sm font-semibold">{t("landing.loginOwner")}</span>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs text-blue-200 mt-1">Manage your PG property</p>
                </button>
                <button
                  onClick={() => router.push("/login?role=tenant")}
                  className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-lg transition-all text-center group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <BedDouble size={18} className="text-blue-600" />
                    <span className="text-sm font-semibold">{t("landing.loginTenant")}</span>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-600" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Access your room & payments</p>
                </button>
              </div>
            </div>
            <div className="relative">
              <ImagePlaceholder
                height="h-72 md:h-96"
                label="Property Hero Image"
                rounded="rounded-2xl"
                className="shadow-2xl"
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop"
              />
              <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-white rounded-xl shadow-lg px-4 py-3 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">R</div>
                    <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">A</div>
                    <div className="w-7 h-7 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">S</div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">2,000+ Tenants</p>
                    <p className="text-[10px] text-slate-500">already feel at home</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="mt-16 text-center">
            <div className="inline-block bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl px-8 py-5 max-w-2xl">
              <p className="text-base md:text-lg text-slate-700 italic leading-relaxed">
                &ldquo;A new city becomes home when you find the right people and the right place to stay.&rdquo;
              </p>
              <p className="mt-2 text-sm text-blue-600 font-medium">
                — Welcome to your new beginning
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visit CTA Banner */}
      <section className="bg-gradient-to-r from-indigo-600 to-blue-600 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white">
            <h3 className="text-xl font-bold">Looking for a PG?</h3>
            <p className="text-sm text-blue-100 mt-1">Book a visit to any registered PG and schedule your tour today.</p>
          </div>
          <button
            onClick={() => { resetVisitForm(); setShowVisitModal(true); }}
            className="px-6 py-3 bg-white text-blue-600 font-semibold text-sm rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shrink-0"
          >
            <CalendarCheck size={16} />
            Book a Visit Now
          </button>
        </div>
      </section>


      {/* Bangalore Localities Guide */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
              <MapPin size={12} />
              Bangalore Guide
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              Popular Areas for PG Living
            </h2>
            <p className="mt-2 text-slate-600 max-w-2xl mx-auto">
              New to Bangalore? Here are the top localities for working professionals, with rent ranges, nearby offices, and connectivity info.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {LOCALITIES.map((loc) => (
              <div
                key={loc.name}
                className="relative bg-white border border-slate-100 rounded-2xl p-5 min-h-[220px] hover:shadow-lg transition-all duration-300 group overflow-hidden"
              >
                {/* Image overlay — hidden by default, spins up on hover */}
                <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0 rotate-3 group-hover:rotate-0 scale-95 group-hover:scale-100 transition-all duration-500 ease-out pointer-events-none">
                  <img
                    src={loc.img}
                    alt={loc.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent rounded-2xl" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white">{loc.name}</h3>
                    <p className="text-xs text-white/80 mt-0.5">{loc.vibe}</p>
                    <p className="text-sm font-semibold text-emerald-300 mt-1">{loc.rent}/mo</p>
                  </div>
                </div>

                {/* Default card content */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-bold text-slate-900">{loc.name}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${loc.tagColor}`}>
                    {loc.tag}
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <IndianRupee size={12} className="text-emerald-500 shrink-0" />
                    <p className="text-sm font-medium text-slate-800">{loc.rent}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase size={12} className="text-blue-500 shrink-0" />
                    <p className="text-xs text-slate-600">{loc.nearbyOffices}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Train size={12} className="text-purple-500 shrink-0" />
                    <p className="text-xs text-slate-600">{loc.metro}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coffee size={12} className="text-amber-500 shrink-0" />
                    <p className="text-xs text-slate-600">{loc.vibe}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New to Bangalore Tips */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-b from-blue-50 via-blue-100/50 to-white">
        {/* Floral top border */}
        <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none overflow-hidden">
          <svg className="w-full h-full text-blue-300/40" viewBox="0 0 1200 60" fill="none" stroke="currentColor" strokeWidth="1" preserveAspectRatio="none">
            <path d="M0 30 Q50 10 100 30 Q150 50 200 30 Q250 10 300 30 Q350 50 400 30 Q450 10 500 30 Q550 50 600 30 Q650 10 700 30 Q750 50 800 30 Q850 10 900 30 Q950 50 1000 30 Q1050 10 1100 30 Q1150 50 1200 30" />
          </svg>
          <svg className="absolute top-1 left-[8%] w-8 h-8 text-blue-300/50" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(72 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(144 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(216 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(288 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="3" fill="currentColor" opacity="0.8" />
          </svg>
          <svg className="absolute top-2 left-[22%] w-6 h-6 text-blue-400/40" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(60 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(120 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(180 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(240 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(300 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="2.5" opacity="0.8" />
          </svg>
          <svg className="absolute top-1 left-[40%] w-7 h-7 text-blue-300/45" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(72 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(144 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(216 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(288 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="3" opacity="0.8" />
          </svg>
          <svg className="absolute top-3 left-[58%] w-5 h-5 text-blue-400/35" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(72 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(144 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(216 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(288 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="3" opacity="0.8" />
          </svg>
          <svg className="absolute top-1 left-[75%] w-7 h-7 text-blue-300/50" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(60 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(120 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(180 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(240 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(300 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="2.5" opacity="0.8" />
          </svg>
          <svg className="absolute top-2 left-[90%] w-6 h-6 text-blue-400/40" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(72 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(144 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(216 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(288 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="3" opacity="0.8" />
          </svg>
        </div>
        {/* Floral bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none overflow-hidden">
          <svg className="w-full h-full text-blue-300/40" viewBox="0 0 1200 60" fill="none" stroke="currentColor" strokeWidth="1" preserveAspectRatio="none">
            <path d="M0 30 Q50 50 100 30 Q150 10 200 30 Q250 50 300 30 Q350 10 400 30 Q450 50 500 30 Q550 10 600 30 Q650 50 700 30 Q750 10 800 30 Q850 50 900 30 Q950 10 1000 30 Q1050 50 1100 30 Q1150 10 1200 30" />
          </svg>
          <svg className="absolute bottom-2 left-[12%] w-7 h-7 text-blue-300/45" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(72 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(144 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(216 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(288 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="3" opacity="0.8" />
          </svg>
          <svg className="absolute bottom-1 left-[32%] w-6 h-6 text-blue-400/40" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(60 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(120 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(180 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(240 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(300 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="2.5" opacity="0.8" />
          </svg>
          <svg className="absolute bottom-2 left-[52%] w-8 h-8 text-blue-300/50" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(72 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(144 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(216 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(288 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="3" opacity="0.8" />
          </svg>
          <svg className="absolute bottom-3 left-[70%] w-5 h-5 text-blue-400/35" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(72 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(144 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(216 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="4" ry="7" transform="rotate(288 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="3" opacity="0.8" />
          </svg>
          <svg className="absolute bottom-1 left-[88%] w-7 h-7 text-blue-300/45" viewBox="0 0 30 30" fill="currentColor" stroke="none">
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(0 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(60 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(120 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(180 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(240 15 15)" opacity="0.6" />
            <ellipse cx="15" cy="10" rx="3" ry="6" transform="rotate(300 15 15)" opacity="0.6" />
            <circle cx="15" cy="15" r="2.5" opacity="0.8" />
          </svg>
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />
          {/* Vidhana Soudha silhouette - left */}
          <svg className="absolute left-0 bottom-0 w-72 h-48 text-blue-400/50" viewBox="0 0 300 200" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="40" y="100" width="220" height="80" rx="2" />
            <rect x="60" y="70" width="180" height="30" rx="2" />
            <rect x="80" y="50" width="140" height="20" rx="2" />
            <rect x="130" y="20" width="40" height="30" rx="2" />
            <circle cx="150" cy="15" r="8" />
            <rect x="55" y="110" width="15" height="25" rx="1" />
            <rect x="80" y="110" width="15" height="25" rx="1" />
            <rect x="105" y="110" width="15" height="25" rx="1" />
            <rect x="130" y="110" width="15" height="25" rx="1" />
            <rect x="155" y="110" width="15" height="25" rx="1" />
            <rect x="180" y="110" width="15" height="25" rx="1" />
            <rect x="205" y="110" width="15" height="25" rx="1" />
            <rect x="230" y="110" width="15" height="25" rx="1" />
            <line x1="40" y1="100" x2="40" y2="180" />
            <line x1="260" y1="100" x2="260" y2="180" />
          </svg>
          {/* Bangalore Palace tower - right */}
          <svg className="absolute right-0 top-10 w-56 h-56 text-blue-400/50" viewBox="0 0 200 220" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="70" y="80" width="60" height="120" rx="2" />
            <path d="M70 80 L100 30 L130 80" />
            <circle cx="100" cy="25" r="6" />
            <rect x="85" y="100" width="12" height="20" rx="6" />
            <rect x="105" y="100" width="12" height="20" rx="6" />
            <rect x="85" y="140" width="12" height="20" rx="6" />
            <rect x="105" y="140" width="12" height="20" rx="6" />
            <rect x="55" y="130" width="15" height="70" rx="2" />
            <path d="M55 130 L62.5 115 L70 130" />
            <rect x="130" y="130" width="15" height="70" rx="2" />
            <path d="M130 130 L137.5 115 L145 130" />
          </svg>
          {/* Nandi Bull outline - bottom right */}
          <svg className="absolute right-20 bottom-8 w-40 h-28 text-blue-400/40" viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="80" cy="65" rx="45" ry="25" />
            <ellipse cx="45" cy="50" rx="15" ry="12" />
            <path d="M35 42 L28 30" />
            <path d="M42 40 L38 28" />
            <circle cx="40" cy="48" r="2" />
            <path d="M125 65 L130 85 L125 85" />
            <path d="M115 70 L118 88 L113 88" />
            <path d="M55 70 L52 88 L57 88" />
            <path d="M65 72 L63 90 L68 90" />
          </svg>
          {/* Auto rickshaw - top left area */}
          <svg className="absolute left-16 top-20 w-28 h-20 text-blue-400/40" viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 55 L20 35 L50 25 L90 25 L100 35 L100 55" />
            <circle cx="30" cy="60" r="8" />
            <circle cx="90" cy="60" r="8" />
            <line x1="50" y1="25" x2="50" y2="55" />
            <path d="M55 30 L85 30 L90 40 L55 40 Z" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">
              New to Bangalore? Read This First
            </h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Essential tips for anyone moving to Bangalore and looking for a PG. Save time, avoid scams, and find the right place faster.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TIPS.map((tip, i) => {
              const iconColors = [
                "bg-blue-100 text-blue-600",
                "bg-emerald-100 text-emerald-600",
                "bg-orange-100 text-orange-600",
                "bg-purple-100 text-purple-600",
                "bg-red-100 text-red-600",
                "bg-amber-100 text-amber-600",
              ];
              return (
                <div
                  key={tip.title}
                  className="p-6 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl hover:shadow-md hover:bg-white transition-all"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${iconColors[i]}`}>
                    <tip.icon size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{tip.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {tip.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-slate-600">
              Plan smart, stay safe, and <span className="font-semibold text-blue-600">enjoy your new beginning in Bangalore!</span> <span className="text-blue-500">💙</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">ProManage</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; 2024 ProManage. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Visit Booking Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowVisitModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Book a PG Visit</h2>
                <p className="text-xs text-slate-500 mt-0.5">Schedule a tour at any registered PG</p>
              </div>
              <button
                onClick={() => setShowVisitModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {visitSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Visit Booked!</h3>
                  <p className="text-sm text-slate-600 mt-2">
                    Your visit to <span className="font-medium">{visitForm.propertyName}</span> has been requested for{" "}
                    <span className="font-medium">{new Date(visitForm.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>.
                  </p>
                  <p className="text-xs text-slate-500 mt-3">The PG owner will confirm your visit shortly.</p>
                  <button
                    onClick={() => setShowVisitModal(false)}
                    className="mt-6 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVisitSubmit} className="space-y-5">
                  {visitError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{visitError}</p>
                  )}

                  {/* Filters: Gender + Area */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Looking for</label>
                      <div className="flex gap-2">
                        {["Boys", "Girls", "Co-ed"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setPgFilter({ ...pgFilter, gender: pgFilter.gender === g ? "" : g })}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                              pgFilter.gender === g
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Area</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g., Koramangala"
                          value={pgFilter.area}
                          onChange={(e) => setPgFilter({ ...pgFilter, area: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PG Results */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Select PG <span className="text-red-500">*</span>
                    </label>
                    {visitForm.propertyName ? (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-blue-900">{visitForm.propertyName}</p>
                          {visitForm.pgAddress && <p className="text-xs text-blue-600 mt-0.5">{visitForm.pgAddress}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setVisitForm({ ...visitForm, propertyId: "", propertyName: "", pgAddress: "" })}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                        {loadingPgs ? (
                          <div className="px-3 py-4 text-center text-xs text-slate-500">Searching...</div>
                        ) : !pgFilter.gender && !pgFilter.area ? (
                          <div className="px-3 py-4 text-center text-xs text-slate-500">Select a gender or enter an area to see PGs</div>
                        ) : pgResults.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-slate-500">No PGs found matching your filters.</div>
                        ) : (
                          pgResults.map((pg) => (
                            <button
                              key={pg.id}
                              type="button"
                              onClick={() => handleSelectPg(pg)}
                              className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors ${
                                visitForm.propertyId === pg.id ? "bg-blue-50" : ""
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <Building2 size={13} className="text-blue-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800">{pg.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {pg.address && <p className="text-xs text-slate-500 truncate">{pg.address}</p>}
                                    <span className="text-[10px] text-slate-400 shrink-0">{pg.type}</span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visitor Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g., Ram Sharma"
                          value={visitForm.name}
                          onChange={(e) => setVisitForm({ ...visitForm, name: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="+91 XXXXX XXXXX"
                          value={visitForm.phone}
                          onChange={(e) => setVisitForm({ ...visitForm, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Visit Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={visitForm.date}
                      onChange={(e) => setVisitForm({ ...visitForm, date: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Message <span className="text-xs text-slate-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <MessageSquare size={14} className="absolute left-3 top-3 text-slate-400" />
                      <textarea
                        placeholder="Any specific requirements or questions..."
                        rows={2}
                        value={visitForm.message}
                        onChange={(e) => setVisitForm({ ...visitForm, message: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowVisitModal(false)}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={visitSubmitting}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {visitSubmitting ? "Submitting..." : "Book Visit"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
