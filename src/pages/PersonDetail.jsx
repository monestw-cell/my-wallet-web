import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, CheckCircle, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getWallet, updateWalletBalance } from "@/utils/wallet";

export default function PersonDetail() {
  const { personId } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [debts, setDebts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tab, setTab] = useState("debts");

  useEffect(() => { loadData(); }, [personId]);

  const loadData = async () => {
    const p = await base44.entities.Person.get(personId);
    setPerson(p);
    const [d, e] = await Promise.all([
      base44.entities.Debt.filter({ person_name: p.name }, "-date", 200),
      base44.entities.Expense.filter({ person_name: p.name }, "-date", 200),
    ]);
    setDebts(d);
    setExpenses(e);
  };

  const toggleSettle = async (debt) => {
    if (!debt.is_settled && debt.type === "عليّ") {
      const wallet = await getWallet();
      if (wallet.balance < debt.amount) {
        toast.error(`رصيدك المتوفر ${wallet.balance.toLocaleString("ar-SA")} ر.س فقط، لا يكفي لسداد هذا الدين`);
        return;
      }
      await updateWalletBalance(-debt.amount);
    }
    await base44.entities.Debt.update(debt.id, { is_settled: !debt.is_settled });
    setDebts(prev => prev.map(d => d.id === debt.id ? { ...d, is_settled: !d.is_settled } : d));
    toast.success(debt.is_settled ? "تم إعادة الفتح" : "تم تسجيل السداد");
  };

  const handleDeleteDebt = async (id) => {
    await base44.entities.Debt.delete(id);
    setDebts(prev => prev.filter(d => d.id !== id));
    toast.success("تم الحذف");
  };

  if (!person) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const pending = debts.filter(d => !d.is_settled);
  const owedToMe = pending.filter(d => d.type === "لي").reduce((s, d) => s + d.amount, 0);
  const iOwe = pending.filter(d => d.type === "عليّ").reduce((s, d) => s + d.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-8 flex items-center gap-3">
        <button onClick={() => navigate("/persons")} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowRight size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
          {person.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-bold">{person.name}</h1>
          {person.phone && <p className="text-xs text-muted-foreground">{person.phone}</p>}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">لي</p>
          <p className="font-bold text-blue-700 dark:text-blue-300 text-sm">{owedToMe.toLocaleString("ar-SA")}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
          <p className="text-xs text-red-600 dark:text-red-400 mb-1">عليّ</p>
          <p className="font-bold text-red-600 dark:text-red-400 text-sm">{iOwe.toLocaleString("ar-SA")}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
          <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">مشتريات</p>
          <p className="font-bold text-orange-600 dark:text-orange-400 text-sm">{totalExpenses.toLocaleString("ar-SA")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["debts", "الديون"], ["expenses", "المشتريات"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === key ? "bg-primary text-white" : "bg-card border border-border text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Debts Tab */}
      {tab === "debts" && (
        <div className="space-y-2">
          {debts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><p className="text-3xl mb-2">🤝</p><p>لا توجد ديون</p></div>
          ) : debts.map(debt => (
            <div key={debt.id} className={`bg-card rounded-xl border p-3 shadow-sm ${debt.is_settled ? "opacity-50 border-border" : debt.type === "لي" ? "border-blue-100 dark:border-blue-800" : "border-red-100 dark:border-red-900"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${debt.type === "لي" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {debt.type === "لي" ? "مستحق لي" : "مستحق عليّ"}
                    </span>
                    {debt.is_settled && <span className="text-xs text-green-500 font-medium">✅ مسدد</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{debt.date}{debt.description ? ` · ${debt.description}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${debt.type === "لي" ? "text-blue-600" : "text-red-500"}`}>
                    {debt.amount?.toLocaleString("ar-SA")} ر.س
                  </span>
                  <button onClick={() => toggleSettle(debt)} className="text-muted-foreground hover:text-primary transition-colors">
                    {debt.is_settled ? <CheckCircle size={18} className="text-primary" /> : <Circle size={18} />}
                  </button>
                  <button onClick={() => handleDeleteDebt(debt.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === "expenses" && (
        <div className="space-y-2">
          {expenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><p className="text-3xl mb-2">🛒</p><p>لا توجد مشتريات</p></div>
          ) : expenses.map(exp => (
            <div key={exp.id} className="bg-card rounded-xl border border-border p-3 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{exp.category}</p>
                <p className="text-xs text-muted-foreground">{exp.date}{exp.notes ? ` · ${exp.notes}` : ""}</p>
              </div>
              <span className="font-bold text-sm text-red-500">{exp.amount?.toLocaleString("ar-SA")} ر.س</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}