import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TrendingDown, Users, Target, Plus, ArrowLeftCircle, Wallet, PlusCircle, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getWallet, updateWalletBalance } from "@/utils/wallet";
import { getCurrency } from "@/utils/currency";
import WalletStatement from "@/components/WalletStatement";

const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [wallet, setWalletData] = useState(null);
  const [sources, setSources] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [addMoneyTab, setAddMoneyTab] = useState("add");
  const [statementOpen, setStatementOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: "", source: "", date: today(), notes: "" });
  const [editIncome, setEditIncome] = useState(null);
  const [editIncomeAmount, setEditIncomeAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const { symbol: cur } = getCurrency();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [e, d, g, w, s, inc] = await Promise.all([
      base44.entities.Expense.list("-date", 100),
      base44.entities.Debt.list("-date", 100),
      base44.entities.Goal.list("-created_date", 10),
      getWallet(),
      base44.entities.IncomeSource.list("name", 100),
      base44.entities.Income.list("-date", 50),
    ]);
    setExpenses(e);
    setDebts(d);
    setGoals(g);
    setWalletData(w);
    setSources(s);
    setIncomes(inc);
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

  const handleUpdateIncome = async () => {
    if (!editIncomeAmount || isNaN(editIncomeAmount)) return;
    const oldAmt = editIncome.amount;
    const newAmt = parseFloat(editIncomeAmount);
    const diff = newAmt - oldAmt;
    await Promise.all([
      base44.entities.Income.update(editIncome.id, { amount: newAmt }),
      updateWalletBalance(diff),
    ]);
    toast.success("تم تعديل المبلغ");
    setEditIncome(null);
    setEditIncomeAmount("");
    loadData();
  };

  const handleDeleteIncome = async (inc) => {
    await base44.entities.Income.delete(inc.id);
    await updateWalletBalance(-inc.amount);
    setIncomes(prev => prev.filter(i => i.id !== inc.id));
    toast.success("تم الحذف وإعادة المبلغ للمحفظة");
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
      <div
        className="bg-gradient-to-br from-primary to-emerald-400 rounded-2xl p-5 text-white shadow-lg shadow-primary/20 cursor-pointer"
        onClick={() => setStatementOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium flex items-center gap-1"><Wallet size={14} /> رصيدك المتوفر</p>
            <p className="text-4xl font-bold mt-1">{(wallet?.balance || 0).toLocaleString("en-US")} <span className="text-xl">{cur}</span></p>
            <p className="text-white/70 text-xs mt-1">نفقات الشهر: {totalMonth.toLocaleString("en-US")} {cur}</p>
            <p className="text-white/60 text-[11px] mt-0.5">اضغط لعرض كشف الحساب 👆</p>
          </div>
          <button onClick={e => { e.stopPropagation(); setAddMoneyOpen(true); }} className="bg-white/20 hover:bg-white/30 transition-colors rounded-xl p-3">
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
          <p className="text-xl font-bold text-blue-600">{owedToMe.toLocaleString("en-US")}</p>
          <p className="text-xs text-muted-foreground">{cur}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-red-50 p-1.5 rounded-lg"><Users size={16} className="text-red-500" /></div>
            <span className="text-xs text-muted-foreground">مستحق عليّ</span>
          </div>
          <p className="text-xl font-bold text-red-500">{iOwe.toLocaleString("en-US")}</p>
          <p className="text-xs text-muted-foreground">{cur}</p>
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
                <span className="font-semibold text-sm text-red-500">-{exp.amount?.toLocaleString("en-US")} {cur}</span>
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
      <Dialog open={addMoneyOpen} onOpenChange={(v) => { setAddMoneyOpen(v); if (!v) { setEditIncome(null); setAddMoneyTab("add"); } }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">إدارة الإيرادات</DialogTitle></DialogHeader>
          {/* Tabs */}
          <div className="flex gap-2">
            <button onClick={() => setAddMoneyTab("add")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${addMoneyTab === "add" ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>إضافة جديد</button>
            <button onClick={() => setAddMoneyTab("history")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${addMoneyTab === "history" ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>السجل والتعديل</button>
          </div>

          {addMoneyTab === "add" && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-sm font-medium mb-1 block">المبلغ *</label>
              <input type="number" placeholder="0.00" value={incomeForm.amount}
                onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">المصدر *</label>
              {sources.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {sources.map(src => {
                    const srcTotal = incomes.filter(i => i.source === src.name).reduce((s, i) => s + (i.amount || 0), 0);
                    return (
                      <div key={src.id} className="relative">
                        <button onClick={() => setIncomeForm(f => ({ ...f, source: src.name }))}
                          className={`w-full p-2.5 rounded-xl border text-sm font-medium transition-all text-right flex flex-col gap-0.5 ${
                            incomeForm.source === src.name ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground bg-background"
                          }`}>
                          <span className="flex items-center gap-1.5">{src.icon} {src.name}</span>
                          {srcTotal > 0 && <span className="text-[10px] text-green-600 font-semibold">+{srcTotal.toLocaleString("en-US")} {cur}</span>}
                        </button>
                        <button onClick={() => { setAddMoneyOpen(false); navigate(`/income-source/${encodeURIComponent(src.name)}`); }}
                          className="absolute left-1 top-1.5 text-muted-foreground hover:text-primary transition-colors p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </button>
                      </div>
                    );
                  })}
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
          )}

          {addMoneyTab === "history" && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {incomes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-3xl mb-2">💰</p>
                <p className="text-sm">لا توجد إيرادات مسجلة</p>
              </div>
            ) : incomes.map(inc => (
              <div key={inc.id} className="bg-secondary rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{inc.source}</p>
                  <p className="text-xs text-muted-foreground">{inc.date}{inc.notes ? ` · ${inc.notes}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editIncome?.id === inc.id ? (
                    <div className="flex items-center gap-1">
                      <input type="number" value={editIncomeAmount}
                        onChange={e => setEditIncomeAmount(e.target.value)}
                        className="w-20 border border-border rounded-lg px-2 py-1 text-right text-sm bg-background focus:outline-none"
                        autoFocus />
                      <button onClick={handleUpdateIncome} className="text-xs bg-primary text-white px-2 py-1 rounded-lg">حفظ</button>
                      <button onClick={() => setEditIncome(null)} className="text-xs text-muted-foreground px-1">✕</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-green-600">+{inc.amount?.toLocaleString("en-US")} {cur}</span>
                      <button onClick={() => { setEditIncome(inc); setEditIncomeAmount(inc.amount); }}
                        className="text-muted-foreground hover:text-primary transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteIncome(inc)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </DialogContent>
      </Dialog>

      <WalletStatement open={statementOpen} onClose={() => setStatementOpen(false)} currentBalance={wallet?.balance || 0} />
    </div>
  );
}