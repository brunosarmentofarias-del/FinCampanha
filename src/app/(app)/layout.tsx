import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getAlertasResumo } from "@/lib/data/alerts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, alertas] = await Promise.all([auth(), getAlertasResumo()]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar role={session?.user?.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userEmail={session?.user?.email}
          userName={session?.user?.name}
          role={session?.user?.role}
          alertas={alertas}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
