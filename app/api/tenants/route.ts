import { NextResponse } from "next/server";

const tenants = [
  { id: 1, name: "Rohan Agarwal", room: "B-402", phone: "+91 98765 43210", status: "active" },
  { id: 2, name: "Sanya Patel", room: "A-108", phone: "+91 87654 32109", status: "active" },
  { id: 3, name: "Vikram Khanna", room: "C-201", phone: "+91 76543 21098", status: "active" },
];

export async function GET() {
  return NextResponse.json(tenants);
}
