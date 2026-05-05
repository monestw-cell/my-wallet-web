import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Plus, PlusCircle, MinusCircle, Trash2 } from "lucide-react";
import { getWallet, updateWalletBalance } from "@/utils/wallet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function GoalDetail() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState("إضافة");
  const [form, setForm] = useState({ amount: "", date: today(), notes: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [goalId]);

  const loadData = async () => {
    const [g, txs] = await Promise.all([
      base44.entities.Goal.get(goalId),
      base44.entities.GoalTransaction.filter({ goal_id: goalId }, "-date", 100),
    ]);
    setGoal(g);
    setTransactions(txs);
  };

  const handleAddPayment = async () => {
    if (!form.amount || isNaN(form.amount)) { toast.error("أدخل مبلغاً صحيحاً"); return; }
    const amt = parseFloat(form.amount);
    if (txType === "إضافة") {
      const wallet = await getWallet();
      if (wallet.balance < amt) {
        toast.error(`رصيدك المتوفر ${wallet.balance.toLocaleString("ar-SA")} ر.س فقط`);
        return;
      }
    }
    setLoading(true);
    const delta = amt * (txType === "إضافة" ? 1 : -1);
    if (txType === "إضافة") await updateWalletBalance(-amt);
    const newAmount = Math.max(0, (goal.current_amount || 0) + delta);

    await Promise.all([
      base44.entities.Goal.update(goalId, { current_amount: newAmount }),
      base44.entities.GoalTransaction.create({
        goal_id: goalId,
        goal_title: goal.title,
        amount: parseFloat(form.amount),
        type: txType,
        date: form.date,
        notes: form.notes,
      }),
    ]);

    toast.success(txType === "إضافة" ? "تم إضافة الدفعة" : "تم خصم المبلغ");
    setForm({ amount: "", date: today(), notes: "" });
    setOpen(false);
    setLoading(false);
    loadData();
  };

  const handleDeleteTx = async (tx) => {
    const delta = tx.type === "إضافة" ? -tx.amount : tx.amount;
    const newAmount = Math.max(0, (goal.current_amount || 0) + delta);
    await Promise.all([
      base44.entities.GoalTransaction.delete(tx.id),
      base44.entities.Goal.update(goalId, { current_amount: newAmount }),
    ]);
    toast.success("تم حذف المعاملة");
    loadData();
  };

  if (!goal) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const pct = Math.min(100, Math.round(((goal.current_amount || 0) / goal.target_amount) * 100));
  const remaining = Math.max(0, goal.target_amount - (goal.current_amount || 0));
  const completed = pct >= 100;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="pt-8 flex items-center gap-3">
        <button onClick={() => navigate("/goals")} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowRight size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-2xl">{goal.icon}</span>
          <h1 className="text-xl font-bold">{goal.title}</h1>
          {completed && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">✅ اكتمل</span>}
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs text-muted-foreground">تم توفيره</p>
            <p className="text-3xl font-bold text-primary">{(goal.current_amount || 0).toLocaleString("ar-SA")}<span className="text-base font-medium text-muted-foreground mr-1">ر.س</span></p>
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">الهدف</p>
            <p className="text-xl font-bold">{goal.target_amount.toLocaleString("ar-SA")}<span className="text-sm font-medium text-muted-foreground mr-1">ر.س</span></p>
          </div>
        </div>

        <div className="h-4 bg-secondary rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: goal.color || "#10b981" }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-bold" style={{ color: goal.color || "#10b981" }}>{pct}%</span>
          {!completed && <span className="text-sm text-muted-foreground">متبقي {remaining.toLocaleString("ar-SA")} ر.س</span>}
        </div>

        {goal.deadline && (
          <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">الموعد النهائي: {goal.deadline}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setTxType("إضافة"); setOpen(true); }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium text-sm shadow-md shadow-primary/20"
        >
          <PlusCircle size={18} /> إضافة دفعة
        </button>
        <button
          onClick={() => { setTxType("خصم"); setOpen(true); }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-card border border-border font-medium text-sm text-foreground"
        >
          <MinusCircle size={18} /> خصم مبلغ
        </button>
      </div>

      {/* Transactions */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <h2 className="font-semibold text-sm mb-3">سجل المعاملات</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">لا توجد معاملات بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${tx.type === "إضافة" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                    {tx.type === "إضافة" ? "↑" : "↓"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}{tx.notes ? ` · ${tx.notes}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${tx.type === "إضافة" ? "text-green-600" : "text-red-500"}`}>
                    {tx.type === "إضافة" ? "+" : "-"}{tx.amount?.toLocaleString("ar-SA")} ر.س
                  </span>
                  <button onClick={() => handleDeleteTx(tx)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">{txType === "إضافة" ? "إضافة دفعة" : "خصم مبلغ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">المبلغ *</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">التاريخ *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">ملاحظات</label>
              <textarea
                placeholder="ملاحظة اختيارية..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
              />
            </div>
            <Button onClick={handleAddPayment} disabled={loading} className="w-full rounded-xl bg-primary">
              {loading ? "جارٍ الحفظ..." : "تأكيد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}