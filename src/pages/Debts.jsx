import { useState, useEffect } from "react";
import { getWallet, updateWalletBalance } from "@/utils/wallet";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [persons, setPersons] = useState([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({ person_name: "", amount: "", type: "لي", date: today(), description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [d, p] = await Promise.all([
      base44.entities.Debt.list("-date", 200),
      base44.entities.Person.list("name", 100),
    ]);
    setDebts(d);
    setPersons(p);
  };

  const handleSave = async () => {
    if (!form.person_name || !form.amount) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
    setLoading(true);
    await base44.entities.Debt.create({ ...form, amount: parseFloat(form.amount), is_settled: false });
    toast.success("تم إضافة الدين");
    setForm({ person_name: "", amount: "", type: "لي", date: today(), description: "" });
    setOpen(false);
    setLoading(false);
    loadData();
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

  const handleDelete = async (id) => {
    await base44.entities.Debt.delete(id);
    setDebts(prev => prev.filter(d => d.id !== id));
    toast.success("تم الحذف");
  };

  let filtered = debts;
  if (filter !== "الكل") filtered = filtered.filter(d => d.type === filter);
  if (dateFrom) filtered = filtered.filter(d => d.date >= dateFrom);
  if (dateTo) filtered = filtered.filter(d => d.date <= dateTo);

  const pending = debts.filter(d => !d.is_settled);
  const owedToMe = pending.filter(d => d.type === "لي").reduce((s, d) => s + d.amount, 0);
  const iOwe = pending.filter(d => d.type === "عليّ").reduce((s, d) => s + d.amount, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">الديون</h1>
        <Button onClick={() => setOpen(true)} className="rounded-xl gap-2 bg-primary">
          <Plus size={18} /> إضافة
        </Button>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <p className="text-xs text-blue-600 font-medium mb-1">مستحق لي</p>
          <p className="text-xl font-bold text-blue-700">{owedToMe.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-blue-500">ر.س</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <p className="text-xs text-red-600 font-medium mb-1">مستحق عليّ</p>
          <p className="text-xl font-bold text-red-600">{iOwe.toLocaleString("ar-SA")}</p>
          <p className="text-xs text-red-500">ر.س</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["الكل", "لي", "عليّ"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === f ? "bg-primary text-white" : "bg-white border border-border"}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-full border border-border rounded-xl px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="من" />
        </div>
        <span className="text-muted-foreground text-xs">—</span>
        <div className="flex-1">
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="w-full border border-border rounded-xl px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="إلى" />
        </div>
      </div>

      {/* Debts List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🤝</p>
            <p>لا توجد ديون مسجلة</p>
          </div>
        ) : filtered.map(debt => (
          <div key={debt.id} className={`bg-white rounded-xl border p-3 shadow-sm ${debt.is_settled ? "opacity-60 border-border" : debt.type === "لي" ? "border-blue-100" : "border-red-100"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${debt.type === "لي" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"}`}>
                  {debt.person_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{debt.person_name}</p>
                  <p className="text-xs text-muted-foreground">{debt.date}{debt.description ? ` · ${debt.description}` : ""}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${debt.type === "لي" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                    {debt.type === "لي" ? "مستحق لي" : "مستحق عليّ"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`font-bold text-sm ${debt.type === "لي" ? "text-blue-600" : "text-red-500"}`}>
                  {debt.amount?.toLocaleString("ar-SA")} ر.س
                </span>
                <div className="flex gap-2">
                  <button onClick={() => toggleSettle(debt)} className="text-muted-foreground hover:text-primary transition-colors">
                    {debt.is_settled ? <CheckCircle size={18} className="text-primary" /> : <Circle size={18} />}
                  </button>
                  <button onClick={() => handleDelete(debt.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">إضافة دين جديد</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">اسم الشخص *</label>
              <div className="flex gap-2">
                <input
                  list="persons-list"
                  placeholder="اكتب أو اختر اسماً"
                  value={form.person_name}
                  onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
                  className="flex-1 border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <datalist id="persons-list">
                  {persons.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">المبلغ *</label>
              <input type="number" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">النوع *</label>
              <div className="grid grid-cols-2 gap-2">
                {["لي", "عليّ"].map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${form.type === t ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                    {t === "لي" ? "🔵 لي" : "🔴 عليّ"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">التاريخ</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الوصف</label>
              <input placeholder="وصف اختياري..." value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full rounded-xl bg-primary">
              {loading ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}