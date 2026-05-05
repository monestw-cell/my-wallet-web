import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpCircle, ArrowDownCircle, FileDown, Pencil, Trash2 } from "lucide-react";
import { getCurrency } from "@/utils/currency";
import { updateWalletBalance } from "@/utils/wallet";
import { toast } from "sonner";
import ExportStatementPDF from "./ExportStatementPDF";

export default function WalletStatement({ open, onClose, currentBalance, onBalanceChange }) {
  const navigate = useNavigate();
  const { symbol: cur } = getCurrency();
  const [tab, setTab] = useState("statement");
  const [transactions, setTransactions] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("الكل");
  const [exportOpen, setExportOpen] = useState(false);
  const [editIncome, setEditIncome] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  useEffect(() => {
    if (!open) {
      setTransactions([]);
      setIncomes([]);
      setEditIncome(null);
      return;
    }
    loadAll();
  }, [open]);

  const loadAll = async () => {
    setLoading(true);
    const [incomesData, expenses, allDebts, goalTxs] = await Promise.all([
      base44.entities.Income.list("-date", 200),
      base44.entities.Expense.list("-date", 200),
      base44.entities.Debt.list("-date", 300),
      base44.entities.GoalTransaction.list("-date", 100),
    ]);

    setIncomes(incomesData);

    const all = [];
    incomesData.forEach(i => all.push({
      id: "inc_" + i.id, date: i.date, created_date: i.created_date, amount: i.amount,
      direction: "in", label: i.source, sub: i.notes || "", type: "دخل",
      icon: "💰", link: "/"
    }));
    expenses.forEach(e => all.push({
      id: "exp_" + e.id, date: e.date, created_date: e.created_date, amount: e.amount,
      direction: "out", label: e.category, sub: e.notes || "", type: "نفقة",
      icon: "🛒", link: "/expenses"
    }));
    allDebts.filter(d => d.type === "لي" && !d.is_settled).forEach(d => all.push({
      id: "lnt_" + d.id, date: d.date, created_date: d.created_date, amount: d.amount,
      direction: "out", label: `قرض لـ ${d.person_name}`, sub: d.description || "", type: "قرض",
      icon: "🤝", link: "/debts"
    }));
    allDebts.filter(d => d.type === "عليّ" && d.is_settled).forEach(d => all.push({
      id: "dbt_" + d.id, date: d.date, created_date: d.created_date, amount: d.amount,
      direction: "out", label: `سداد لـ ${d.person_name}`, sub: d.description || "", type: "سداد دين",
      icon: "✅", link: "/debts"
    }));
    goalTxs.filter(t => t.type === "إضافة").forEach(t => all.push({
      id: "gol_" + t.id, date: t.date, created_date: t.created_date, amount: t.amount,

      id: "gol_" + t.id, date: t.date, amount: t.amount,
      direction: "out", label: `هدف: ${t.goal_title}`, sub: t.notes || "", type: "هدف",
      icon: "🎯", link: "/goals"
    }));

    all.sort((a, b) => (b.created_date || b.date).localeCompare(a.created_date || a.date));
    setTransactions(all);
    setLoading(false);
  };

  const handleUpdateIncome = async () => {
    if (!editAmount || isNaN(editAmount)) return;
    const newAmt = parseFloat(editAmount);
    const diff = newAmt - editIncome.amount;
    await Promise.all([
      base44.entities.Income.update(editIncome.id, { amount: newAmt }),
      updateWalletBalance(diff),
    ]);
    toast.success("تم التعديل");
    setEditIncome(null);
    setEditAmount("");
    if (onBalanceChange) onBalanceChange();
    loadAll();
  };

  const handleDeleteIncome = async (inc) => {
    await base44.entities.Income.delete(inc.id);
    await updateWalletBalance(-inc.amount);
    toast.success("تم الحذف");
    if (onBalanceChange) onBalanceChange();
    loadAll();
  };

  const filtered = filter === "الكل" ? transactions : transactions.filter(t => t.type === filter);
  const totalIn = transactions.filter(t => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.direction === "out").reduce((s, t) => s + t.amount, 0);
  const types = ["الكل", "دخل", "نفقة", "سداد دين", "قرض", "هدف"];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl max-h-[90vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle>المحفظة</DialogTitle>
              {tab === "statement" && (
                <button onClick={() => setExportOpen(true)}
                  className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                  <FileDown size={14} /> PDF
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Balance Summary */}
          <div className="bg-gradient-to-l from-primary/10 to-emerald-50 dark:from-primary/20 dark:to-transparent rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الرصيد الحالي</span>
              <span className="font-bold text-primary">{(currentBalance || 0).toLocaleString("en-US")} {cur}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-green-600"><ArrowUpCircle size={14} /> إجمالي الدخل</span>
              <span className="font-semibold text-green-600">{totalIn.toLocaleString("en-US")} {cur}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-red-500"><ArrowDownCircle size={14} /> إجمالي الصرف</span>
              <span className="font-semibold text-red-500">{totalOut.toLocaleString("en-US")} {cur}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button onClick={() => setTab("incomes")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === "incomes" ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>
              💰 الإيرادات
            </button>
            <button onClick={() => setTab("statement")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === "statement" ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>
              📋 كشف الحساب
            </button>
          </div>

          {/* Incomes Tab */}
          {tab === "incomes" && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : incomes.length === 0 ? (
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
                        <input type="number" value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          className="w-24 border border-border rounded-lg px-2 py-1 text-right text-sm bg-background focus:outline-none"
                          autoFocus />
                        <button onClick={handleUpdateIncome} className="text-xs bg-primary text-white px-2 py-1 rounded-lg">حفظ</button>
                        <button onClick={() => setEditIncome(null)} className="text-xs text-muted-foreground">✕</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-green-600">+{inc.amount?.toLocaleString("en-US")} {cur}</span>
                        <button onClick={() => { setEditIncome(inc); setEditAmount(inc.amount); }}
                          className="text-muted-foreground hover:text-primary transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteIncome(inc)}
                          className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Statement Tab */}
          {tab === "statement" && (
            <>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {types.map(t => (
                  <button key={t} onClick={() => setFilter(t)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium transition-all ${filter === t ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm">لا توجد حركات</p>
                  </div>
                ) : filtered.map(tx => (
                  <div key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 rounded-lg px-1 transition-colors"
                    onClick={() => { if (tx.link) { onClose(); navigate(tx.link); } }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${tx.direction === "in" ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                        {tx.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{tx.label}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}{tx.sub ? ` · ${tx.sub}` : ""}</p>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{tx.type}</span>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${tx.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                      {tx.direction === "in" ? "+" : "-"}{tx.amount?.toLocaleString("en-US")} {cur}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ExportStatementPDF
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        transactions={transactions}
        currentBalance={currentBalance}
        currency={cur}
      />
    </>
  );
}