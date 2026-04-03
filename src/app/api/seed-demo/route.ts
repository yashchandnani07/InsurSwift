import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your-supabase-service-role-key-here') {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your .env file. Find it in Supabase Dashboard → Settings → API → service_role key." },
      { status: 500 }
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, string> = {};

  const { data: existingUsers } = await adminClient.auth.admin.listUsers();

  // ── Admin user ──────────────────────────────────────────────
  const adminExists = existingUsers?.users?.some((u) => u.email === "admin@insureswift.com");

  if (!adminExists) {
    const { data: adminData, error: adminErr } = await adminClient.auth.admin.createUser({
      email: "admin@insureswift.com",
      password: "Admin@123",
      email_confirm: true,
      user_metadata: { full_name: "Arvind Kumar", role: "admin", lic_id: "LIC-ADM-001" },
      app_metadata: { role: "admin" },
    });
    if (adminErr) {
      results.admin = `Error: ${adminErr.message}`;
    } else {
      results.admin = "Created";
      // Upsert profile
      if (adminData?.user) {
        await adminClient.from("user_profiles").upsert({
          id: adminData.user.id,
          email: "admin@insureswift.com",
          full_name: "Arvind Kumar",
          role: "admin",
          lic_id: "LIC-ADM-001",
        }, { onConflict: "id" });
      }
    }
  } else {
    // Ensure app_metadata has role=admin (fix existing users)
    const adminUser = existingUsers?.users?.find((u) => u.email === "admin@insureswift.com");
    if (adminUser && adminUser.app_metadata?.role !== "admin") {
      await adminClient.auth.admin.updateUserById(adminUser.id, {
        app_metadata: { role: "admin" },
        user_metadata: { ...adminUser.user_metadata, role: "admin" },
      });
      results.admin = "Updated role metadata";
    } else {
      results.admin = "Already exists";
    }
  }

  // ── Claimant user ────────────────────────────────────────────
  const claimantExists = existingUsers?.users?.some((u) => u.email === "rahul@example.com");

  if (!claimantExists) {
    const { data: claimantData, error: claimantErr } = await adminClient.auth.admin.createUser({
      email: "rahul@example.com",
      password: "Rahul@123",
      email_confirm: true,
      user_metadata: { full_name: "Rahul Mehta", role: "claimant" },
      app_metadata: { role: "claimant" },
    });
    if (claimantErr) {
      results.claimant = `Error: ${claimantErr.message}`;
    } else {
      results.claimant = "Created";
      if (claimantData?.user) {
        await adminClient.from("user_profiles").upsert({
          id: claimantData.user.id,
          email: "rahul@example.com",
          full_name: "Rahul Mehta",
          role: "claimant",
        }, { onConflict: "id" });
      }
    }
  } else {
    const claimantUser = existingUsers?.users?.find((u) => u.email === "rahul@example.com");
    if (claimantUser && claimantUser.app_metadata?.role !== "claimant") {
      await adminClient.auth.admin.updateUserById(claimantUser.id, {
        app_metadata: { role: "claimant" },
        user_metadata: { ...claimantUser.user_metadata, role: "claimant" },
      });
      results.claimant = "Updated role metadata";
    } else {
      results.claimant = "Already exists";
    }
  }

  return NextResponse.json({
    message: "Demo seed complete. Both users have correct role metadata.",
    results,
    credentials: {
      admin: { email: "admin@insureswift.com", password: "Admin@123" },
      claimant: { email: "rahul@example.com", password: "Rahul@123" },
    },
    next_step: "Go to /login and click 'Use' on either demo credential card, then sign in.",
  });
}
