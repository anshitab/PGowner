"use client";

import { useState, useEffect } from "react";
import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { usePGData } from "@/lib/usePGData";
import { useBeds } from "@/lib/BedContext";
import { useSettings } from "@/lib/SettingsContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, Chip, Button } from "@heroui/react";
import {
  Home, Bed, Users, Wifi, Wind, Droplets, ShowerHead,
  DoorOpen, BookOpen, Flower2, CheckCircle2, AlertCircle,
  Receipt, Calendar, Download, LogOut, MessageCircle, Send,
} from "lucide-react";

const amenityIcons: Record<string, typeof Wifi> = {
  WiFi: Wifi,
  AC: Wind,
  Geyser: Droplets,
  "Attached Bath": ShowerHead,
  "Common Bath": ShowerHead,
  Wardrobe: DoorOpen,
  "Study Table": BookOpen,
  Balcony: Flower2,
  Fan: Wind,
};

function getEstimatedCheckoutDate(joinDate: string): string {
  const join = new Date(joinDate);
  const joinDay = join.getDate();
  const now = new Date();
  // Next month from now, on the same day as join date
  let targetMonth = now.getMonth() + 1;
  let targetYear = now.getFullYear();
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear++;
  }
  // Handle months with fewer days (e.g., join on 31st but next month has 30)
  const daysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(joinDay, daysInTarget);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function MyRoomPage() {
  const { mode } = useUserMode();
  const { user } = useAuth();
  const { property, propertyId } = usePropertyContext();
  const { rooms, amenities: roomAmenities } = usePGData();
  const { beds: contextBeds } = useBeds();
  const { settings } = useSettings();
  const router = useRouter();
  const [tenant, setTenant] = useState<Record<string, unknown> | null>(null);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [myBeds, setMyBeds] = useState<{ id: string; label: string; tenantName: string | null; status: string }[]>([]);
  const [checkoutDate, setCheckoutDate] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutMessages, setCheckoutMessages] = useState<{ from: string; text: string; time: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode === "owner") router.replace("/dashboard");
  }, [mode, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // Use the API endpoint that bypasses RLS (same as dashboard)
      const params = new URLSearchParams({ userId: user.id, email: user.email });
      const res = await fetch(`/api/tenant-data?${params}`);
      const apiData = await res.json();

      if (apiData.tenant) {
        setTenant(apiData.tenant);
        if (apiData.tenant.joinDate) {
          setCheckoutDate(getEstimatedCheckoutDate(apiData.tenant.joinDate));
        }
        if (apiData.payments) {
          setPayments(apiData.payments);
        }
      }

      // Also fetch room details and beds via admin API
      const roomRes = await fetch(`/api/my-room-data?userId=${user.id}`);
      if (roomRes.ok) {
        const roomApiData = await roomRes.json();
        if (roomApiData.beds) {
          setMyBeds(roomApiData.beds);
        }
        if (roomApiData.room) {
          setTenant((prev) => prev ? { ...prev, rooms: roomApiData.room } : prev);
        }
      }

      // Fetch checkout messages
      if (apiData.tenant?.id) {
        const { data: msgs } = await supabase
          .from("checkout_messages")
          .select("*")
          .eq("tenant_id", apiData.tenant.id)
          .order("created_at", { ascending: true });
        if (msgs) {
          setCheckoutMessages(msgs.map((m: Record<string, unknown>) => ({
            from: m.from_role as string,
            text: m.message as string,
            time: new Date(m.created_at as string).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
          })));
        }
      }

      setLoading(false);
    })();
  }, [user]);

  const handleCheckout = async () => {
    if (!checkoutDate || !user) return;
    setCheckoutSubmitting(true);
    try {
      await fetch("/api/checkout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, checkoutDate }),
      });
      setCheckoutSuccess(true);
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !tenant) return;
    setSendingMessage(true);
    const tenantId = (tenant as Record<string, unknown>).id as string;
    await supabase.from("checkout_messages").insert({
      tenant_id: tenantId,
      property_id: propertyId,
      from_role: "tenant",
      message: newMessage.trim(),
    });
    setCheckoutMessages((prev) => [...prev, {
      from: "tenant",
      text: newMessage.trim(),
      time: "Just now",
    }]);
    setNewMessage("");
    setSendingMessage(false);
  };

  if (mode === "owner") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Home size={48} className="text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No room assigned</h3>
        <p className="text-sm text-slate-500">Your PG owner hasn&apos;t assigned you to a room yet.</p>
      </div>
    );
  }

  const roomData = (tenant as Record<string, unknown>)?.rooms as { id: string; number: string; floor: number; type: string; rent: number; amenities: string[] } | null;
  const roomId = roomData?.id || null;
  const roomBeds = myBeds.length > 0 ? myBeds : (roomId ? contextBeds.filter((b) => b.roomId === roomId) : []);
  const roomAmenitiesList = roomId ? (roomAmenities[roomId] || roomData?.amenities || []) : (roomData?.amenities || []);
  const joinDate = (tenant as Record<string, unknown>)?.joinDate as string | null;
  const tenantName = (tenant as Record<string, unknown>)?.name as string | undefined;
  const tenantRent = roomData?.rent || (tenant as Record<string, unknown>)?.rent as number | undefined;
  const tenantDeposit = (tenant as Record<string, unknown>)?.deposit as number | undefined;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Room</h2>
        <p className="text-sm text-slate-500 mt-1">
          Room {roomData?.number || (tenant as Record<string, unknown>)?.room as string || "-"} · {property?.name || (tenant as Record<string, unknown>)?.property as string || ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Home size={15} className="text-indigo-500" />
                Room Overview
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <p className="text-[10px] text-indigo-600 uppercase font-medium mb-1">Room Number</p>
                  <p className="text-lg font-bold text-indigo-900">{roomData?.number || (tenant as Record<string, unknown>)?.room as string || "-"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Room Type</p>
                  <p className="text-lg font-bold text-slate-900">{roomData?.type || (tenant as Record<string, unknown>)?.roomType as string || "-"} Sharing</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Floor</p>
                  <p className="text-lg font-bold text-slate-900">
                    {roomData ? (roomData.floor === 0 ? "Ground" : `Floor ${roomData.floor}`) : "-"}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-[10px] text-emerald-600 uppercase font-medium mb-1">Monthly Rent</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {tenantRent ? `₹${tenantRent.toLocaleString("en-IN")}` : "-"}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-[10px] text-blue-600 uppercase font-medium mb-1">Join Date</p>
                  <p className="text-lg font-bold text-blue-900">
                    {joinDate ? new Date(joinDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-[10px] text-purple-600 uppercase font-medium mb-1">Security Deposit</p>
                  <p className="text-lg font-bold text-purple-900">
                    {tenantDeposit ? `₹${tenantDeposit.toLocaleString("en-IN")}` : "-"}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Bed size={15} className="text-teal-500" />
                Bed Allocation
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              {roomBeds.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {roomBeds.map((bed) => {
                    const isMe = bed.tenantName === user?.name || bed.tenantName === tenantName;
                    return (
                      <div
                        key={bed.id}
                        className={`p-4 rounded-xl border ${
                          isMe
                            ? "bg-indigo-50 border-indigo-200"
                            : bed.status === "occupied"
                            ? "bg-slate-50 border-slate-200"
                            : "bg-emerald-50 border-emerald-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">Bed {bed.label}</span>
                          {isMe && (
                            <Chip size="sm" variant="soft" color="accent">You</Chip>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800">
                          {bed.tenantName || "Available"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No bed data available</p>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Wifi size={15} className="text-blue-500" />
                Room Amenities
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              {roomAmenitiesList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {roomAmenitiesList.map((amenity) => {
                    const Icon = amenityIcons[amenity] || CheckCircle2;
                    return (
                      <div key={amenity} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Icon size={16} className="text-slate-500" />
                        <span className="text-sm text-slate-700">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No amenities listed</p>
              )}
            </Card.Content>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Users size={15} className="text-purple-500" />
                Roommates
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-3">
              {roomBeds
                .filter((b) => b.tenantName && b.tenantName !== user?.name && b.tenantName !== tenantName)
                .map((bed) => (
                  <div key={bed.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                      {bed.tenantName!.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{bed.tenantName}</p>
                      <p className="text-[11px] text-slate-500">Bed {bed.label}</p>
                    </div>
                  </div>
                ))}
              {roomBeds.filter((b) => b.tenantName && b.tenantName !== user?.name && b.tenantName !== tenantName).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No roommates</p>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500" />
                PG Rules
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              {settings.pgRules.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-600">
                  {settings.pgRules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>{rule}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No rules defined</p>
              )}
            </Card.Content>
          </Card>

          {/* Checkout Request */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <LogOut size={15} className="text-red-500" />
                Request Checkout
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              {checkoutSuccess ? (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-3">
                  <p className="font-medium">Request sent!</p>
                  <p className="text-xs text-emerald-600 mt-1">Your PG owner has been notified via email.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1.5">
                      Checkout date
                    </label>
                    <input
                      type="date"
                      value={checkoutDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setCheckoutDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                    {joinDate && (
                      <div className="mt-2 flex items-start justify-between gap-2">
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Suggested:{" "}
                          {new Date(getEstimatedCheckoutDate(joinDate) + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          (same day next month from join date)
                        </p>
                        <button
                          type="button"
                          onClick={() => setCheckoutDate(getEstimatedCheckoutDate(joinDate))}
                          className="shrink-0 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Use suggested
                        </button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handleCheckout}
                    isDisabled={!checkoutDate || checkoutSubmitting}
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <LogOut size={14} />
                    {checkoutSubmitting ? "Sending..." : "Submit Checkout Request"}
                  </Button>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Checkout Conversation */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <MessageCircle size={15} className="text-indigo-500" />
                Chat with Owner
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              <p className="text-[11px] text-slate-400 mb-3">
                Need to leave earlier? Discuss checkout dates with your PG owner here.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {checkoutMessages.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">No messages yet</p>
                )}
                {checkoutMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === "tenant" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${
                      msg.from === "tenant"
                        ? "bg-indigo-100 text-indigo-900"
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      <p>{msg.text}</p>
                      <p className={`text-[9px] mt-0.5 ${msg.from === "tenant" ? "text-indigo-400" : "text-slate-400"}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Payment Receipts */}
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Receipt size={15} className="text-amber-500" />
            Payment Receipts
          </Card.Title>
        </Card.Header>
        <Card.Content className="p-5">
          {payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id as string} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Receipt size={16} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">₹{(p.amount as number).toLocaleString("en-IN")} — {p.method as string}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(p.date as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                    <Download size={12} />
                    Receipt
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No payment receipts yet</p>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
