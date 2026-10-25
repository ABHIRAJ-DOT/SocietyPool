import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type SocietyMembership = {
  societyId: string;
  societyName: string;
  cityArea: string;
};

export type ResidentDeal = {
  id: string;
  name: string;
  pack: string;
  category: string;
  price: number;
  mrp: number;
  joined: number;
  target: number;
  close: string;
  photo: string;
  label: string;
};

export type ResidentOrder = {
  id: string;
  status: string;
  quantity: number;
  total: number;
  createdAt: string;
};

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient<Database> | null = null;

export const hasSupabaseConfig = Boolean(projectUrl && publishableKey);

export function getSupabaseClient() {
  if (!projectUrl || !publishableKey) return null;

  client ??= createClient<Database>(projectUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return client;
}

export async function getActiveMembership(user: User): Promise<SocietyMembership | null> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured. Add the project URL and publishable key to frontend/.env.local.");

  const { data, error } = await supabase
    .from("society_members")
    .select("society_id, societies(name, city_area)")
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    society_id: string;
    societies: { name: string; city_area: string } | null;
  };

  if (!row.societies) return null;
  return {
    societyId: row.society_id,
    societyName: row.societies.name,
    cityArea: row.societies.city_area,
  };
}

function getCategory(name: string) {
  const productName = name.toLowerCase();
  if (/egg|milk|paneer|curd|cheese|yogurt/.test(productName)) return "Dairy & eggs";
  if (/oil|rice|flour|spice|dal|lentil|atta/.test(productName)) return "Pantry";
  return "Fresh picks";
}

function getClosingLabel(endsAt: string) {
  const hours = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 3_600_000));
  if (hours < 1) return "Closing soon";
  if (hours < 24) return `${hours}h left`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} left`;
}

export async function getResidentDeals(societyId: string): Promise<ResidentDeal[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("deals")
    .select("id, target_quantity, pooled_price, ends_at, status, product:products(name, description, image_url, unit_size, reference_price)")
    .eq("society_id", societyId)
    .in("status", ["open", "target_reached"])
    .order("ends_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    target_quantity: number;
    pooled_price: number;
    ends_at: string;
    status: string;
    product: {
      name: string;
      description: string;
      image_url: string | null;
      unit_size: string;
      reference_price: number;
    } | null;
  }>;

  return Promise.all(rows.filter((row) => row.product).map(async (row) => {
    const { data: progressData, error: progressError } = await supabase
      .rpc("get_deal_progress", { p_deal_id: row.id });

    if (progressError) throw progressError;
    const progress = Array.isArray(progressData) ? progressData[0] : progressData;
    const joined = Number(progress?.joined_quantity ?? 0);
    const product = row.product!;

    return {
      id: row.id,
      name: product.name,
      pack: product.unit_size,
      category: getCategory(product.name),
      price: Number(row.pooled_price),
      mrp: Number(product.reference_price),
      joined,
      target: row.target_quantity,
      close: getClosingLabel(row.ends_at),
      photo: product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85",
      label: row.status === "target_reached" ? "POOL TARGET REACHED" : joined >= row.target_quantity * 0.8 ? "ALMOST THERE" : "NEIGHBOURHOOD DEAL",
    };
  }));
}

export async function getResidentOrders(societyId: string): Promise<ResidentOrder[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("orders")
    .select("id, status, quantity, total_amount_snapshot, created_at")
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((order) => ({
    id: order.id,
    status: String(order.status).replaceAll("_", " "),
    quantity: order.quantity,
    total: Number(order.total_amount_snapshot),
    createdAt: order.created_at,
  }));
}

export async function joinSociety(inviteCode: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("join_society", {
    p_invite_code: inviteCode,
  });
  if (error) throw error;

  const society = Array.isArray(data) ? data[0] : data;
  if (!society) throw new Error("The invite code did not return a society.");
  return {
    societyId: society.id as string,
    societyName: society.name as string,
    cityArea: society.city_area as string,
  } satisfies SocietyMembership;
}

export async function placeResidentOrder(dealId: string, quantity: number) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("create_order", {
    p_deal_id: dealId,
    p_quantity: quantity,
  });
  if (error) throw error;
  return data;
}
