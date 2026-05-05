import { Outlet, Link, useLocation } from "react-router-dom";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Home, TrendingDown, Users, BarChart2, Target, Settings, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "الرئيسية" },
  { path: "/expenses", icon: TrendingDown, label: "النفقات" },
  { path: "/debts", icon: Users, label: "الديون" },
  { path: "/reports", icon: BarChart2, label: "التقارير" },
  { path: "/goals", icon: Target, label: "الأهداف" },
  { path: "/persons", icon: UserCheck, label: "الأشخاص" },
  { path: "/settings", icon: Settings, label: "الإعدادات" },
];

export default function Layout() {
  const location = useLocation();
  useDarkMode(); // initialize dark mode at app level

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border z-50 shadow-lg">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all",
                  active ? "bg-primary/10" : ""
                )}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}