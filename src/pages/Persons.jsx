import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, ChevronLeft, Phone } from "lucide-react";
import { getCurrency } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Persons() {
  const [persons, setPersons] = useState([]);
  const [debts, setDebts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { symbol: cur } = getCurrency();

  useEffect(() => {
    Promise.all([
      base44.entities.Person.list("name", 100),
      base44.entities.Debt.list("-date", 300),
    ]).then(([p, d]) => { setPersons(p); setDebts(d); });
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("أدخل اسم الشخص"); return; }
    setLoading(true);
    await base44.entities.Person.create(form);
    toast.success("تم إضافة الشخص");
    setForm({ name: "", phone: "" });
    setOpen(false);
    setLoading(false);
    base44.entities.Person.list("name", 100).then(setPersons);
  };

  const handleDelete = async (id) => {
    await base44.entities.Person.delete(id);
    setPersons(prev => prev.filter(p => p.id !== id));
    toast.success("تم الحذف");
  };

  const getPersonBalance = (personName) => {
    const personDebts = debts.filter(d => d.person_name === personName && !d.is_settled);
    const owedToMe = personDebts.filter(d => d.type === "لي").reduce((s, d) => s + d.amount, 0);
    const iOwe = personDebts.filter(d => d.type === "عليّ").reduce((s, d) => s + d.amount, 0);
    return { owedToMe, iOwe, net: owedToMe - iOwe };
  };

  return (
    <div className="p-4 space-y-4">
      <div className="pt-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الأشخاص</h1>
          <p className="text-sm text-muted-foreground">{persons.length} شخص مسجل</p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-xl gap-2 bg-primary">
          <Plus size={18} /> إضافة
        </Button>
      </div>

      {persons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-4">👥</p>
          <p className="font-medium">لا يوجد أشخاص بعد</p>
          <p className="text-sm mt-1">أضف أشخاصاً للتعامل معهم</p>
        </div>
      ) : (
        <div className="space-y-2">
          {persons.map(person => {
            const { owedToMe, iOwe, net } = getPersonBalance(person.name);
            return (
              <div
                key={person.id}
                className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/persons/${person.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{person.name}</p>
                    {person.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone size={10} /> {person.phone}
                      </p>
                    )}
                    {(owedToMe > 0 || iOwe > 0) && (
                      <div className="flex gap-2 mt-0.5">
                        {owedToMe > 0 && <span className="text-xs text-blue-500 font-medium">له {owedToMe.toLocaleString("ar-SA")} {cur}</span>}
                        {iOwe > 0 && <span className="text-xs text-red-500 font-medium">عليّ {iOwe.toLocaleString("ar-SA")} {cur}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronLeft size={18} className="text-muted-foreground" />
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(person.id); }}
                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-right">إضافة شخص جديد</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">الاسم *</label>
              <input placeholder="اسم الشخص" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">رقم الهاتف (اختياري)</label>
              <input placeholder="05xxxxxxxx" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full rounded-xl bg-primary">
              {loading ? "جارٍ الحفظ..." : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}