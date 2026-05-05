import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TrendingDown, Users, Target, Plus, ArrowLeftCircle, Wallet, PlusCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getWallet, updateWalletBalance } from "@/utils/wallet";

const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [wallet, setWalletData] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: "", source: "", date: today(), notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [e, d, g, w, s] = await Promise.all([
      base44.entities.Expense.list("-date", 100),
      base44.entities.Debt.list("-date", 100),
      base44.entities.Goal.list("-created_date", 10),
      getWallet(),
      base44.entities.IncomeSource.list("name", 100),
    ]);
    setExpenses(e);
    setDebts(d);
    setGoals(g);
    setWalletData(w);
    setSources(s);
    setLoading(false);
  };

  const handleAddIncome = async () => {
    if (!incomeForm.amount || !incomeForm.source) { toast.error("المبلغ والمصدر مطلوبان"); return; }
    setSaving(true);
    const amt = parseFloat(incomeForm.amount);
    await Promise.all([
      base44.entities.Income.create({ ...incomeForm, amount: amt }),
      updateWalletBalance(amt),
    ]);
    toast.success("تم إضافة المبلغ للمحفظة");
    setIncomeForm({ amount: "", source: "", date: today(), notes: "" });
    setAddMoneyOpen(false);
    setSaving(false);
    loadData();
  };

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= monthStart && d <= monthEnd; });
  const totalMonth = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingDebts = debts.filter(d => !d.is_settled);
  const owedToMe = pendingDebts.filter(d => d.type === "لي").reduce((s, d) => s + d.amount, 0);
  const iOwe = pendingDebts.filter(d => d.type === "عليّ").reduce((s, d) => s + d.amount, 0);

  const categoryIcons = { "طعام وشراب": "🍽️", "مواصلات": "🚗", "تسوق": "🛍️", "فواتير": "💡", "صحة": "💊", "ترفيه": "🎬", "تعليم": "📚", "إيجار": "🏠", "أخرى": "📌" };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 space-y-5">
      <div className="pt-8 pb-2">
        <p className="text-muted-foreground text-sm">{format(now, "EEEE، d MMMM yyyy")}</p>
        <h1 className="text-2xl font-bold text-foreground mt-1">محفظتي 💰</h1>
      </div>

      {/* Wallet Balance */}
      <div className="bg-gradient-to-br from-primary to-emerald-400 rounded-2xl p-5 text-white shadow-lg shadow-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium flex items-center gap-1"><Wallet size={14} /> رصيدك المتوفر</p>
            <p className="text-4xl font-bold mt-1">{(wallet?.balance || 0).toLocaleString("ar-SA")} <span className="text-xl">ر.س</span></p>
            <p className="text-white/70 text-xs mt-1">نفقات الشهر: {totalMonth.toLocaleString("ar-SA")} ر.س</p>
          </div>
          <button onClick={() => setAddMoneyOpen(true)} className="bg-white/20 hover:bg-white/30 transition-colors rounded-xl p-3">
            <PlusCircle size={22} />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-50 p-1.5 rounded-lg"><Users size={16} className="text-blue-500" /></div>
            <span className="text-xs text-muted-foreground">مستحق لي</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{owedToMe.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-muted-foreground">ر.س</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-red-50 p-1.5 rounded-lg"><Users size={16} className="text-red-500" /></div>
            <span className="text-xs text-muted-foreground">مستحق عليّ</span>
          </div>
          <p className="text-xl font-bold text-red-500">{iOwe.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-muted-foreground">ر.س</p>
        </div>
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">الأهداف المالية</h2>
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
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">آخر النفقات</h2>
          <Link to="/expenses" className="text-primary text-xs font-medium">عرض الكل</Link>
        </div>
        {expenses.slice(0, 5).length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">لا توجد نفقات بعد</p>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, 5).map(exp => (
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
        <Link to="/debts" className="bg-card text-foreground rounded-xl p-3 flex items-center gap-2 justify-center font-medium text-sm border border-border shadow-sm">
          <ArrowLeftCircle size={18} /> إضافة دين
        </Link>
      </div>

      {/* Add Money Dialog */}
      <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">إضافة أموال للمحفظة</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">المبلغ *</label>
              <input type="number" placeholder="0.00" value={incomeForm.amount}
                onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">المصدر *</label>
              {sources.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {sources.map(src => (
                    <button key={src.id} onClick={() => setIncomeForm(f => ({ ...f, source: src.name }))}
                      className={`p-2 rounded-xl border text-xs font-medium transition-all ${incomeForm.source === src.name ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground bg-background"}`}>
                      {src.icon} {src.name}
                    </button>
                  ))}
                </div>
              ) : (
                <input placeholder="مثال: راتب، محل..." value={incomeForm.source}
                  onChange={e => setIncomeForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">التاريخ</label>
              <input type="date" value={incomeForm.date}
                onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">ملاحظات</label>
              <input placeholder="اختياري" value={incomeForm.notes}
                onChange={e => setIncomeForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <Button onClick={handleAddIncome} disabled={saving} className="w-full rounded-xl bg-primary">
              {saving ? "جارٍ الحفظ..." : "إضافة للمحفظة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}