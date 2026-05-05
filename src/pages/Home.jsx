import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TrendingDown, Users, Target, Plus, ArrowLeftCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

const categoryIcons = {
  "طعام وشراب": "🍽️", "مواصلات": "🚗", "تسوق": "🛍️", "فواتير": "💡",
  "صحة": "💊", "ترفيه": "🎬", "تعليم": "📚", "إيجار": "🏠", "أخرى": "📌"
};

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Expense.list("-date", 100),
      base44.entities.Debt.list("-date", 100),
      base44.entities.Goal.list("-created_date", 10),
    ]).then(([e, d, g]) => {
      setExpenses(e);
      setDebts(d);
      setGoals(g);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d >= monthStart && d <= monthEnd;
  });

  const totalMonth = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingDebts = debts.filter(d => !d.is_settled);
  const owedToMe = pendingDebts.filter(d => d.type === "لي").reduce((s, d) => s + d.amount, 0);
  const iOwe = pendingDebts.filter(d => d.type === "عليّ").reduce((s, d) => s + d.amount, 0);

  const recentExpenses = expenses.slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-8 pb-2">
        <p className="text-muted-foreground text-sm">{format(now, "EEEE، d MMMM yyyy")}</p>
        <h1 className="text-2xl font-bold text-foreground mt-1">محفظتي 💰</h1>
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-gradient-to-br from-primary to-emerald-400 rounded-2xl p-5 text-white shadow-lg shadow-primary/20">
        <p className="text-white/80 text-sm font-medium">إجمالي نفقات هذا الشهر</p>
        <p className="text-4xl font-bold mt-1">{totalMonth.toLocaleString("ar-SA")} <span className="text-xl">ر.س</span></p>
        <p className="text-white/70 text-xs mt-2">{format(now, "MMMM yyyy")}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-50 p-1.5 rounded-lg"><Users size={16} className="text-blue-500" /></div>
            <span className="text-xs text-muted-foreground">مستحق لي</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{owedToMe.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-muted-foreground">ر.س</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-red-50 p-1.5 rounded-lg"><Users size={16} className="text-red-500" /></div>
            <span className="text-xs text-muted-foreground">مستحق عليّ</span>
          </div>
          <p className="text-xl font-bold text-red-500">{iOwe.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-muted-foreground">ر.س</p>
        </div>
      </div>

      {/* Goals progress */}
      {goals.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-foreground">الأهداف المالية</h2>
            <Link to="/goals" className="text-primary text-xs font-medium">عرض الكل</Link>
          </div>
          <div className="space-y-3">
            {goals.slice(0, 2).map(goal => {
              const pct = Math.min(100, Math.round(((goal.current_amount || 0) / goal.target_amount) * 100));
              return (
                <div key={goal.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{goal.icon} {goal.title}</span>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-foreground">آخر النفقات</h2>
          <Link to="/expenses" className="text-primary text-xs font-medium">عرض الكل</Link>
        </div>
        {recentExpenses.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">لا توجد نفقات بعد</p>
        ) : (
          <div className="space-y-2">
            {recentExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{categoryIcons[exp.category] || "📌"}</span>
                  <div>
                    <p className="text-sm font-medium">{exp.category}</p>
                    <p className="text-xs text-muted-foreground">{exp.date}</p>
                  </div>
                </div>
                <span className="font-semibold text-sm text-red-500">-{exp.amount?.toLocaleString("ar-SA")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <Link to="/expenses" className="bg-primary text-white rounded-xl p-3 flex items-center gap-2 justify-center font-medium text-sm shadow-md shadow-primary/20">
          <Plus size={18} /> إضافة نفقة
        </Link>
        <Link to="/debts" className="bg-white text-foreground rounded-xl p-3 flex items-center gap-2 justify-center font-medium text-sm border border-border shadow-sm">
          <ArrowLeftCircle size={18} /> إضافة دين
        </Link>
      </div>
    </div>
  );
}