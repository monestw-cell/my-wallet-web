import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, ChevronDown, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const categories = ["طعام وشراب", "مواصلات", "تسوق", "فواتير", "صحة", "ترفيه", "تعليم", "إيجار", "أخرى"];
const categoryIcons = {
  "طعام وشراب": "🍽️", "مواصلات": "🚗", "تسوق": "🛍️", "فواتير": "💡",
  "صحة": "💊", "ترفيه": "🎬", "تعليم": "📚", "إيجار": "🏠", "أخرى": "📌"
};
const categoryColors = {
  "طعام وشراب": "bg-orange-50 text-orange-600", "مواصلات": "bg-blue-50 text-blue-600",
  "تسوق": "bg-purple-50 text-purple-600", "فواتير": "bg-yellow-50 text-yellow-600",
  "صحة": "bg-red-50 text-red-600", "ترفيه": "bg-pink-50 text-pink-600",
  "تعليم": "bg-indigo-50 text-indigo-600", "إيجار": "bg-gray-50 text-gray-600",
  "أخرى": "bg-green-50 text-green-600"
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [persons, setPersons] = useState([]);
  const [open, setOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("الكل");
  const [form, setForm] = useState({ amount: "", date: today(), category: "طعام وشراب", notes: "", person_name: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [e, p] = await Promise.all([
      base44.entities.Expense.list("-date", 200),
      base44.entities.Person.list("name", 100),
    ]);
    setExpenses(e);
    setPersons(p);
  };

  const handleSave = async () => {
    if (!form.amount || !form.date || !form.category) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    setLoading(true);
    await base44.entities.Expense.create({ ...form, amount: parseFloat(form.amount) });
    toast.success("تم إضافة النفقة");
    setForm({ amount: "", date: today(), category: "طعام وشراب", notes: "", person_name: "" });
    setOpen(false);
    setLoading(false);
    loadData();
  };

  const handleDelete = async (id) => {
    await base44.entities.Expense.delete(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success("تم الحذف");
  };

  const filtered = filterCat === "الكل" ? expenses : expenses.filter(e => e.category === filterCat);
  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">النفقات</h1>
          <p className="text-sm text-muted-foreground">إجمالي: {total.toLocaleString("ar-SA")} ر.س</p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-xl gap-2 bg-primary">
          <Plus size={18} /> إضافة
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {["الكل", ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterCat === cat ? "bg-primary text-white" : "bg-white border border-border text-foreground"
            }`}
          >
            {cat !== "الكل" ? categoryIcons[cat] + " " : ""}{cat}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">📭</p>
            <p>لا توجد نفقات</p>
          </div>
        ) : filtered.map(exp => (
          <div key={exp.id} className="bg-white rounded-xl border border-border p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${categoryColors[exp.category] || "bg-gray-50"}`}>
                {categoryIcons[exp.category] || "📌"}
              </div>
              <div>
                <p className="font-medium text-sm">{exp.category}</p>
                <p className="text-xs text-muted-foreground">{exp.date}{exp.person_name ? ` · ${exp.person_name}` : ""}</p>
                {exp.notes && <p className="text-xs text-muted-foreground mt-0.5">{exp.notes}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-500">{exp.amount?.toLocaleString("ar-SA")} ر.س</span>
              <button onClick={() => handleDelete(exp.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">إضافة نفقة جديدة</DialogTitle>
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
              <label className="text-sm font-medium mb-1 block">الفئة *</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                      form.category === cat ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"
                    }`}
                  >
                    {categoryIcons[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الشخص المرتبط</label>
              <select
                value={form.person_name}
                onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                <option value="">بدون شخص</option>
                {persons.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
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
            <Button onClick={handleSave} disabled={loading} className="w-full rounded-xl bg-primary">
              {loading ? "جارٍ الحفظ..." : "حفظ النفقة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}