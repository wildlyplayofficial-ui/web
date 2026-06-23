"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

/**
 * Build a Supabase client that reads/writes auth cookies via next/headers.
 * Used for admin login/logout and session verification.
 */
function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const store = await cookieStore;
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // setAll called from a Server Component — cookies are read-only.
          // Token refresh will be retried on the next request.
        }
      },
    },
  });
}

/** Read auth cookies and return the verified user, or null. */
export async function getAdminSession(): Promise<User | null> {
  const client = getAuthClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** Guard for admin pages — redirects to login if not authenticated. */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminSession();
  if (!user) redirect("/admin/login");
  return user;
}

/** Server Action: sign in with email + password, set auth cookies. */
export async function loginAction(
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  if (!email || !password) return { error: "Email and password required" };

  const client = getAuthClient();
  if (!client) return { error: "Supabase not configured" };

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/admin");
}

/** Server Action: sign out and redirect to login. */
export async function logoutAction(): Promise<void> {
  const client = getAuthClient();
  if (client) await client.auth.signOut();
  redirect("/admin/login");
}
