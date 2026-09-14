"use server";
import { redirect } from "next/navigation";
import { createClient, isConfigured } from "@/lib/supabase/server";
export async function signIn(form: FormData) {
  if (!isConfigured()) redirect("/");
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const client = await createClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=credentials");
  redirect("/");
}
export async function signOut() {
  if (isConfigured()) {
    const client = await createClient();
    await client.auth.signOut();
  }
  redirect("/login");
}
