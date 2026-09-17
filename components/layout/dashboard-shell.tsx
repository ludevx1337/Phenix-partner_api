"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  History,
  LayoutDashboard,
  LineChart,
  Radio,
  Settings,
  Smartphone,
  Bell,
  Share2,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";

const navMain = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "SIM / eSIM", href: "/sim", icon: Smartphone },
  { title: "Lignes GSM", href: "/lignes", icon: Radio },
  { title: "Consommations", href: "/consommations", icon: LineChart },
  { title: "Recharges DATA", href: "/recharges-data", icon: CreditCard },
  { title: "Portabilités", href: "/portabilites", icon: Share2 },
  { title: "eSIM", href: "/esim", icon: Layers },
  { title: "Opérations", href: "/operations", icon: SlidersHorizontal },
  { title: "Catalogue", href: "/catalogue", icon: BookOpen },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Historique", href: "/historique", icon: History },
  { title: "Paramètres", href: "/settings", icon: Settings },
];

type Props = {
  children: React.ReactNode;
  userEmail: string | null | undefined;
};

export function DashboardShell({ children, userEmail }: Props) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-chart-1 text-xs font-bold text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-border/60">
              P
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold">PHENIX GSM</p>
              <p className="text-muted-foreground text-xs">Console partenaire</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navMain.map((item) => {
                  const active =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <p className="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">
            API v2.9 — serveur uniquement
          </p>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
          <SidebarTrigger className="-ml-1" aria-label="Ouvrir le menu" />
          <Separator orientation="vertical" className="mr-2 h-6" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserNav email={userEmail} />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
