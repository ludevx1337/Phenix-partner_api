import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const {
    data: { user: fresh },
  } = await supabase.auth.getUser();

  return (
    <DashboardShell userEmail={fresh?.email ?? user.email}>
      {children}
    </DashboardShell>
  );
}
