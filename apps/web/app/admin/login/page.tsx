import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage() {
  // Already logged in — go to dashboard
  const user = await getAdminSession();
  if (user) redirect("/admin");

  return <LoginForm />;
}
