import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeWeeklyMenu, emptyWeeklyMenu, type WeeklyMenu } from "@/lib/food-menu";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resolveTenant(userId: string, email: string | null) {
  let { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("property_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tenant && email) {
    const { data: emailMatch } = await supabaseAdmin
      .from("tenants")
      .select("property_id")
      .eq("email", email)
      .maybeSingle();
    tenant = emailMatch;
  }
  return tenant;
}

function menuHasMeals(menu: WeeklyMenu): boolean {
  return Object.values(menu).some((d) => d.breakfast || d.lunch || d.dinner);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const tenant = await resolveTenant(userId, email);
  if (!tenant?.property_id) {
    return NextResponse.json({
      foodIncluded: false,
      weeklyMenu: emptyWeeklyMenu(),
      upiId: "",
    });
  }

  const full = await supabaseAdmin
    .from("settings")
    .select("upi_id, food_included, weekly_menu")
    .eq("property_id", tenant.property_id)
    .maybeSingle();

  if (full.error?.message?.includes("food_included")) {
    const basic = await supabaseAdmin
      .from("settings")
      .select("upi_id")
      .eq("property_id", tenant.property_id)
      .maybeSingle();
    return NextResponse.json({
      foodIncluded: false,
      weeklyMenu: emptyWeeklyMenu(),
      upiId: basic.data?.upi_id || "",
    });
  }

  const weeklyMenu = normalizeWeeklyMenu(full.data?.weekly_menu);
  const foodIncluded =
    full.data?.food_included === true || menuHasMeals(weeklyMenu);

  return NextResponse.json({
    foodIncluded,
    weeklyMenu,
    upiId: full.data?.upi_id || "",
  });
}
