import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { getCurrency } from "@/utils/currency";

export default function WalletStatement({ open, onClose, currentBalance }) {
  const navigate = useNavigate();
  const { symbol: cur } = getCurrency();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("الكل");

  useEffect(() => {
    if (!open) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    Promise.all([
      base44.entities.Income.list("-date", 200),
      base44.entities.Expense.list("-date", 200),
      base44.entities.Debt.list("-date", 300),
      base44.entities.GoalTransaction.list("-date", 100),
    ]).then(([incomes, expenses, allDebts, goalTxs]) => {
      const all = [];

      incomes.forEach(i => all.push({
        id: "inc_" + i.id, date: i.date, amount: i.amount,
        direction: "in", label: i.source, sub: i.notes || "", type: "دخل",
        icon: "💰", link: "/"
      }));

      expenses.forEach(e => all.push({
        id: "exp_" + e.id, date: e.date, amount: e.amount,
        direction: "out", label: e.category, sub: e.notes || "", type: "نفقة",
        icon: "🛒", link: "/expenses"
      }));

      // ديون أُعطيت (لي = أنت أعطيت شخصاً مالاً)
      allDebts.filter(d => d.type === "لي" && !d.is_settled).forEach(d => all.push({
        id: "lnt_" + d.id, date: d.date, amount: d.amount,
        direction: "out", label: `قرض لـ ${d.person_name}`, sub: d.description || "", type: "قرض",
        icon: "🤝", link: "/debts"
      }));

      // ديون عليك تم سدادها
      allDebts.filter(d => d.type === "عليّ" && d.is_settled).forEach(d => all.push({
        id: "dbt_" + d.id, date: d.date, amount: d.amount,
        direction: "out", label: `سداد لـ ${d.person_name}`, sub: d.description || "", type: "سداد دين",
        icon: "✅", link: "/debts"
      }));

      goalTxs.filter(t => t.type === "إضافة").forEach(t => all.push({
        id: "gol_" + t.id, date: t.date, amount: t.amount,
        direction: "out", label: `هدف: ${t.goal_title}`, sub: t.notes || "", type: "هدف",
        icon: "🎯", link: "/goals"
      }));



      all.sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(all);
      setLoading(false);
    });
  }, [open]);

  const filtered = filter === "الكل" ? transactions : transactions.filter(t => t.type === filter);
  const totalIn = transactions.filter(t => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.direction === "out").reduce((s, t) => s + t.amount, 0);

  const types = ["الكل", "دخل", "نفقة", "سداد دين", "قرض", "هدف"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">كشف حساب المحفظة</DialogTitle>
        </DialogHeader>

        {/* Balance Summary */}
        <div className="bg-gradient-to-l from-primary/10 to-emerald-50 dark:from-primary/20 dark:to-transparent rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الرصيد الحالي</span>
            <span className="font-bold text-primary">{(currentBalance || 0).toLocaleString("ar-SA")} {cur}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 text-green-600"><ArrowUpCircle size={14} /> إجمالي الدخل</span>
            <span className="font-semibold text-green-600">{totalIn.toLocaleString("ar-SA")} {cur}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 text-red-500"><ArrowDownCircle size={14} /> إجمالي الصرف</span>
            <span className="font-semibold text-red-500">{totalOut.toLocaleString("ar-SA")} {cur}</span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium transition-all ${filter === t ? "bg-primary text-white" : "bg-secondary text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Transactions List */}
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
                {tx.direction === "in" ? "+" : "-"}{tx.amount?.toLocaleString("ar-SA")} {cur}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}