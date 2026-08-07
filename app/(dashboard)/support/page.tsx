"use client";

import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import { HelpCircle, Phone, Mail, MessageCircle, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

const faqs = [
  { q: "When is rent due?", a: "Rent is due by the 5th of every month. Late fees of ₹100/day apply after the 7th." },
  { q: "How do I report a maintenance issue?", a: "Go to the Complaints page and log a new complaint. Our maintenance team will respond within 24 hours." },
  { q: "What are the visitor timings?", a: "Visitors are allowed between 9:00 AM and 8:00 PM. All visitors must register at the front desk." },
  { q: "How do I request room change?", a: "Contact the owner directly via phone or WhatsApp. Room changes are subject to availability and require 15 days notice." },
  { q: "What is the notice period for check-out?", a: "A minimum of 30 days written notice is required before vacating. Security deposit is refunded within 15 working days after inspection." },
  { q: "Can I get a rent receipt?", a: "Yes, rent receipts are automatically generated for online payments. For cash payments, request a receipt from the owner." },
];

export default function SupportPage() {
  const { mode } = useUserMode();
  const { user } = useAuth();
  const { property } = usePropertyContext();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; email: string; phone: string } | null>(null);

  useEffect(() => {
    if (mode === "owner") router.replace("/dashboard");
  }, [mode, router]);

  useEffect(() => {
    if (!user?.id || mode !== "tenant") return;
    (async () => {
      const res = await fetch(`/api/owner-info?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.owner) setOwnerInfo(data.owner);
      }
    })();
  }, [user?.id, mode]);

  if (mode === "owner") return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Support</h2>
        <p className="text-sm text-slate-500 mt-1">Get help or contact the PG owner</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* FAQs */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <HelpCircle size={15} className="text-blue-500" />
                Frequently Asked Questions
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-800">{faq.q}</span>
                    {openFaq === i ? (
                      <ChevronUp size={16} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400 shrink-0" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </Card.Content>
          </Card>

          {/* Quick Actions */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Quick Actions
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  href="/complaints"
                  className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle size={18} className="text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Report an Issue</p>
                    <p className="text-[11px] text-red-600">Log a maintenance complaint</p>
                  </div>
                </Link>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Contact Card */}
        <div className="space-y-6">
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800">Contact Owner</Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-4">
              <div className="text-center pb-4 border-b border-slate-100">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700 mx-auto mb-3">
                  {ownerInfo?.name ? ownerInfo.name.split(" ").map((n) => n[0]).join("") : "PG"}
                </div>
                <p className="text-sm font-semibold text-slate-900">{ownerInfo?.name || "PG Owner"}</p>
                <p className="text-[11px] text-slate-500">{property?.name || ""}</p>
              </div>

              {ownerInfo?.phone && (
                <a
                  href={`tel:${ownerInfo.phone}`}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Phone size={16} className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-sm font-medium text-slate-800">{ownerInfo.phone}</p>
                  </div>
                </a>
              )}

              {ownerInfo?.email && (
                <a
                  href={`mailto:${ownerInfo.email}`}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Mail size={16} className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-800">{ownerInfo.email}</p>
                  </div>
                </a>
              )}

              {ownerInfo?.phone && (
                <a
                  href={`https://wa.me/${ownerInfo.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle size={16} className="text-emerald-600" />
                  <div>
                    <p className="text-xs text-emerald-600">WhatsApp</p>
                    <p className="text-sm font-medium text-emerald-800">Send Message</p>
                  </div>
                </a>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800">Emergency</Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-800">Fire / Medical Emergency</p>
                <a href="tel:112" className="text-sm font-bold text-red-600 hover:underline">112</a>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-medium text-amber-800">Police</p>
                <a href="tel:100" className="text-sm font-bold text-amber-600 hover:underline">100</a>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-800">Ambulance</p>
                <a href="tel:108" className="text-sm font-bold text-blue-600 hover:underline">108</a>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
