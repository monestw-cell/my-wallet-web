import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#6b7280"];

const categoryIcons = {
  "طعام وشراب": "🍽️", "مواصلات": "🚗", "تسوق": "🛍️", "فواتير": "💡",
  "صحة": "💊", "ترفيه": "🎬", "تعليم": "📚", "إيجار": "🏠", "أخرى": "📌"
};

export default function Reports() {
  const [expenses, setExpenses] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    base44.entities.Expense.list("-date", 500).then(setExpenses);
  }, []);

  const filterByMonth = (date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
  };

  const currentData = filterByMonth(currentMonth);
  const prevData = filterByMonth(subMonths(currentMonth, 1));

  const currentTotal = currentData.reduce((s, e) => s + (e.amount || 0), 0);
  const prevTotal = prevData.reduce((s, e) => s + (e.amount || 0), 0);
  const diff = currentTotal - prevTotal;
  const diffPct = prevTotal > 0 ? Math.abs(Math.round((diff / prevTotal) * 100)) : 0;

  // Group by category
  const byCat = {};
  currentData.forEach(e => {
    byCat[e.category] = (byCat[e.category] || 0) + (e.amount || 0);
  });
  const chartData = Object.entries(byCat).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const prevByCat = {};
  prevData.forEach(e => {
    prevByCat[e.category] = (prevByCat[e.category] || 0) + (e.amount || 0);
  });

  return (
    <div className="p-4 space-y-5">
      <div className="pt-8">
        <h1 className="text-2xl font-bold">التقارير</h1>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3 shadow-sm">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <ChevronRight size={20} />
        </button>
        <span className="font-semibold text-sm">{format(currentMonth, "MMMM yyyy")}</span>
        <button onClick={() => setCurrentMonth(m => new Date(m.setMonth(m.getMonth() + 1)))}
          disabled={currentMonth >= new Date()}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30">
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">إجمالي الشهر</p>
          <p className="text-xl font-bold text-foreground">{currentTotal.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-muted-foreground">ر.س</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${diff > 0 ? "bg-red-50 dark:bg-red-900/20 border-red-100" : diff < 0 ? "bg-green-50 dark:bg-green-900/20 border-green-100" : "bg-card border-border"}`}>
          <p className="text-xs text-muted-foreground mb-1">مقارنة بالشهر السابق</p>
          <p className={`text-xl font-bold ${diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : "text-foreground"}`}>
            {diff > 0 ? "+" : ""}{diff.toLocaleString("ar-SA")}
          </p>
          <p className={`text-xs font-medium ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-muted-foreground"}`}>
            {diffPct > 0 ? (diff > 0 ? `▲ ${diffPct}% أكثر` : `▼ ${diffPct}% أقل`) : "لا يوجد فرق"}
          </p>
        </div>
      </div>

      {/* Pie Chart */}
      {chartData.length > 0 ? (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h2 className="font-semibold text-sm mb-4">توزيع النفقات حسب الفئة</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={false}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v.toLocaleString("ar-SA")} ر.س`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm text-center text-muted-foreground">
          <p className="text-4xl mb-2">📊</p>
          <p>لا توجد بيانات لهذا الشهر</p>
        </div>
      )}

      {/* Category breakdown */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-sm">تفصيل الفئات</h2>
          {chartData.map((item, i) => {
            const pct = Math.round((item.value / currentTotal) * 100);
            const prev = prevByCat[item.name] || 0;
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm">{categoryIcons[item.name]} {item.name}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold">{item.value.toLocaleString("ar-SA")} ر.س</span>
                    <span className="text-xs text-muted-foreground mr-1">({pct}%)</span>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                </div>
                {prev > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    الشهر السابق: {prev.toLocaleString("ar-SA")} ر.س
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}