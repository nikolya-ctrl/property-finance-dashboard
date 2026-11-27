"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { StoreProvider, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { NewBookingDrawer } from "@/components/new-booking";
import { Avatar } from "@/components/ui";

type NavItem = { name: string; href: string; icon: React.ElementType; ownerOnly?: boolean; exact?: boolean };

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { name: "Today", href: "/dashboard", icon: LayoutGrid, exact: true },
      { name: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Stays",
    items: [
      { name: "Bookings", href: "/dashboard/bookings", icon: BedDouble },
      { name: "Guests", href: "/dashboard/guests", icon: Users },
    ],
  },
  {
    title: "Money",
    items: [
      { name: "Expenses", href: "/dashboard/expenses", icon: Receipt },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3, ownerOnly: true },
    ],
  },
  {
    title: "Property",
    items: [
      { name: "Operations", href: "/dashboard/operations", icon: Sparkles },
      { name: "Settings", href: "/dashboard/settings", icon: Settings, ownerOnly: true },
    ],
  },
];

const MOBILE_NAV: NavItem[] = [
  { name: "Today", href: "/dashboard", icon: LayoutGrid, exact: true },
  { name: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { name: "Bookings", href: "/dashboard/bookings", icon: BedDouble },
  { name: "Ops", href: "/dashboard/operations", icon: Sparkles },
];

const isActive = (pathname: string, item: NavItem) =>
  item.exact ? pathname === item.href : pathname.startsWith(item.href);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) return null;
  if (!user.active) return <PendingAccess />;

  return (
    <StoreProvider>
      <Shell>{children}</Shell>
    </StoreProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setNewBookingOpen, loading, error } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOwner = user!.role === "owner";

  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => isOwner || !i.ownerOnly) })).filter(
    (s) => s.items.length
  );
  const all = sections.flatMap((s) => s.items);
  const current = all.find((i) => isActive(pathname, i));

  // staff can't open owner-only pages
  useEffect(() => {
    const item = NAV.flatMap((s) => s.items).find((i) => isActive(pathname, i));
    if (item?.ownerOnly && !isOwner) router.replace("/dashboard");
  }, [pathname, isOwner, router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex h-dvh bg-white text-ink overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-neutral-100 bg-soft h-full overflow-y-auto shrink-0 transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("h-16 flex items-center border-b border-neutral-100 shrink-0", collapsed ? "justify-center" : "justify-between px-6")}>
          {!collapsed && (
            <Link href="/dashboard" className="text-lg font-bold tracking-[0.3em] text-ink">
              HILTONIA
            </Link>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-ink rounded-lg transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <div className={cn("pt-5", collapsed ? "px-2" : "px-3")}>
          <button
            onClick={() => setNewBookingOpen(true)}
            className={cn(
              "w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] shadow-sm",
              collapsed ? "h-11" : "py-2.5"
            )}
            title="New booking"
          >
            <Plus className="w-4 h-4" />
            {!collapsed && "New booking"}
          </button>
        </div>

        <nav className={cn("flex-1 py-6 space-y-6", collapsed ? "px-2" : "px-3")}>
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase select-none">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center rounded-xl text-sm font-medium transition-all group relative",
                        collapsed ? "justify-center py-3" : "gap-3 px-3 py-2.5",
                        active
                          ? "text-ink bg-white shadow-sm border border-neutral-200/50"
                          : "text-neutral-500 hover:text-ink hover:bg-neutral-100 border border-transparent"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "shrink-0",
                          collapsed ? "w-5 h-5" : "w-4 h-4",
                          active ? "text-accent" : "text-neutral-400 group-hover:text-ink"
                        )}
                      />
                      {!collapsed && <span>{item.name}</span>}
                      {active && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute left-0 w-1 h-5 bg-accent rounded-r-full"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-100 shrink-0">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 px-2 py-2">
                <Avatar name={user!.name} className="w-8 h-8 text-[10px] ring-0 bg-neutral-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{user!.name}</p>
                  <p className="text-[10px] text-neutral-500 font-medium flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                    {user!.title}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-1">
              <Avatar name={user!.name} className="w-8 h-8 text-[10px] ring-0 bg-neutral-200" />
              <button onClick={signOut} title="Sign out" className="p-2 rounded-xl text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-b border-neutral-100 z-50 flex items-center justify-between px-4">
        <Link href="/dashboard" className="text-base font-bold tracking-[0.3em] text-ink">
          HILTONIA
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setNewBookingOpen(true)}
            className="p-2 rounded-lg bg-neutral-900 text-white"
            aria-label="New booking"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2 -mr-2 text-neutral-600 hover:bg-neutral-50 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto pt-16 md:pt-0 pb-20 md:pb-0">
        <header className="hidden md:flex h-16 items-center justify-between px-10 border-b border-neutral-100 shrink-0 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center text-sm font-medium text-neutral-400">
            <span>Dashboard</span>
            <ChevronRight className="w-4 h-4 mx-2 text-neutral-300" />
            <span className="text-ink">{current?.name ?? "Today"}</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-neutral-400">
            <span>{format(new Date(), "EEEE, d MMMM")}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-300" />
            <span className="capitalize px-2.5 py-1 rounded-lg bg-soft border border-neutral-100 text-neutral-600 font-semibold">
              {user!.role}
            </span>
          </div>
        </header>

        <div className="flex-1 w-full max-w-[1200px] mx-auto px-5 py-8 sm:px-8 md:px-10 md:py-12">
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>
          )}
          {loading ? <p className="text-sm text-neutral-400 font-medium">Loading…</p> : children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 z-40 flex items-center justify-around px-2">
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[60px]",
                active ? "text-ink" : "text-neutral-400"
              )}
            >
              <item.icon className={cn("w-5 h-5", active && "text-accent")} />
              <span className={cn("text-[10px] mt-1 font-medium", active && "font-bold")}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-16 flex flex-col justify-between overflow-y-auto">
          <div className="p-5 space-y-6">
            <div className="flex items-center gap-3 p-3 bg-soft rounded-2xl border border-neutral-200/60">
              <Avatar name={user!.name} className="ring-0 bg-neutral-200" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user!.name}</p>
                <p className="text-xs text-neutral-500">{user!.title}</p>
              </div>
            </div>
            {sections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 pb-1 text-[11px] font-bold tracking-wider text-neutral-400 uppercase">{section.title}</div>
                {section.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium",
                        active ? "bg-neutral-100 text-ink font-semibold" : "text-neutral-600"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", active ? "text-accent" : "text-neutral-400")} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-neutral-100">
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-600 bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <NewBookingDrawer />
    </div>
  );
}

function PendingAccess() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 text-ink">
      <div className="max-w-sm text-center space-y-3">
        <div className="text-xl font-bold tracking-[0.3em] mb-6">HILTONIA</div>
        <h1 className="text-lg font-bold">Waiting for access</h1>
        <p className="text-sm text-neutral-500 font-medium">
          {user?.email} isn&apos;t invited yet. Ask an owner to invite this email in Settings, then sign in again.
        </p>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="text-sm font-semibold underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
