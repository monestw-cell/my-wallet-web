import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, PlusCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const ICONS = ["🎯", "🏠", "✈️", "🚗", "💍", "📱", "💻", "🎓", "💰", "🏋️", "📚", "🏖️"];
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

export default function Goals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", target_amount: "", current_amount: "", deadline: "", icon: "🎯", color: "#10b981" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { base44.entities.Goal.list("-created_date", 50).then(setGoals); }, []);

  const handleSave = async () => {
    if (!form.title || !form.target_amount) { toast.error("يرجى ملء الحقول المطلوبة"); return; }
    setLoading(true);
    await base44.entities.Goal.create({
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount || 0)
    });
    toast.success("تم إضافة الهدف");
    setForm({ title: "", target_amount: "", current_amount: "", deadline: "", icon: "🎯", color: "#10b981" });
    setOpen(false);
    setLoading(false);
    base44.entities.Goal.list("-created_date", 50).then(setGoals);
  };



  const handleDelete = async (id) => {
    await base44.entities.Goal.delete(id);
    setGoals(prev => prev.filter(g => g.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="pt-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">الأهداف المالية</h1>
        <Button onClick={() => setOpen(true)} className="rounded-xl gap-2 bg-primary">
          <Plus size={18} /> هدف جديد
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-4">🎯</p>
          <p className="font-medium">لا توجد أهداف بعد</p>
          <p className="text-sm mt-1">أضف هدفاً مالياً لتتبع تقدمك</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const pct = Math.min(100, Math.round(((goal.current_amount || 0) / goal.target_amount) * 100));
            const remaining = goal.target_amount - (goal.current_amount || 0);
            const completed = pct >= 100;
            return (
              <div key={goal.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${completed ? "border-primary/30" : "border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: goal.color + "20" }}>
                      {goal.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{goal.title}</h3>
                      {goal.deadline && <p className="text-xs text-muted-foreground">الهدف: {goal.deadline}</p>}
                      {completed && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">✅ اكتمل!</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{(goal.current_amount || 0).toLocaleString("ar-SA")} ر.س</span>
                    <span className="text-muted-foreground">{goal.target_amount.toLocaleString("ar-SA")} ر.س</span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: goal.color || "#10b981" }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs font-bold" style={{ color: goal.color }}>{pct}%</span>
                    {!completed && <span className="text-xs text-muted-foreground">متبقي {remaining.toLocaleString("ar-SA")} ر.س</span>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => navigate(`/goals/${goal.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm text-primary border border-primary/30 rounded-xl py-2 hover:bg-primary/5 transition-colors">
                    <PlusCircle size={16} /> إدارة الهدف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">هدف مالي جديد</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">عنوان الهدف *</label>
              <input placeholder="مثال: شراء سيارة" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">المبلغ المستهدف *</label>
                <input type="number" placeholder="0" value={form.target_amount}
                  onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المبلغ الحالي</label>
                <input type="number" placeholder="0" value={form.current_amount}
                  onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الموعد النهائي</label>
              <input type="date" value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">الأيقونة</label>
              <div className="grid grid-cols-6 gap-2">
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${form.icon === icon ? "bg-primary/10 border-2 border-primary" : "bg-secondary border border-transparent"}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">اللون</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(color => (
                  <button key={color} onClick={() => setForm(f => ({ ...f, color }))}
                    className={`w-8 h-8 rounded-full transition-all ${form.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                    style={{ background: color }} />
                ))}
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full rounded-xl bg-primary">
              {loading ? "جارٍ الحفظ..." : "إضافة الهدف"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}