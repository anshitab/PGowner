import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  const { id, type } = await request.json();

  if (!id || !type) {
    return NextResponse.json({ error: "id and type required" }, { status: 400 });
  }

  if (type === "complaint") {
    const { error } = await supabaseAdmin
      .from("complaints")
      .update({ status: "Resolved" })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (type === "checkout") {
    const { error } = await supabaseAdmin
      .from("checkout_records")
      .update({ status: "completed" })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
