import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDarkMode } from "@/hooks/useDarkMode";

const DEFAULT_CATEGORIES = [
  { name: "طعام وشراب", icon: "🍽️" },
  { name: "مواصلات", icon: "🚗" },
  { name: "تسوق", icon: "🛍️" },
  { name: "فواتير", icon: "💡" },
  { name: "صحة", icon: "💊" },
  { name: "ترفيه", icon: "🎬" },
  { name: "تعليم", icon: "📚" },
  { name: "إيجار", icon: "🏠" },
  { name: "أخرى", icon: "📌" },
];

const DEFAULT_SOURCES = [
  { name: "راتب", icon: "💼" },
  { name: "محل / تجارة", icon: "🏪" },
  { name: "دين مستلم", icon: "🤝" },
  { name: "هدية", icon: "🎁" },
  { name: "استثمار", icon: "📈" },
  { name: "أخرى", icon: "💵" },
];

export default function Settings() {
  const [dark, setDark] = useDarkMode();
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [newCat, setNewCat] = useState({ name: "", icon: "📌" });
  const [newSrc, setNewSrc] = useState({ name: "", icon: "💵" });
  const [tab, setTab] = useState("categories");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cats, srcs] = await Promise.all([
      base44.entities.ExpenseCategory.list("name", 100),
      base44.entities.IncomeSource.list("name", 100),
    ]);
    setCategories(cats);
    setSources(srcs);
  };

  const initDefaults = async () => {
    await Promise.all(DEFAULT_CATEGORIES.map(c => base44.entities.ExpenseCategory.create(c)));
    toast.success("تم إضافة التصنيفات الافتراضية");
    loadData();
  };

  const initDefaultSources = async () => {
    await Promise.all(DEFAULT_SOURCES.map(s => base44.entities.IncomeSource.create(s)));
    toast.success("تم إضافة المصادر الافتراضية");
    loadData();
  };

  const addCategory = async () => {
    if (!newCat.name.trim()) { toast.error("أدخل اسم التصنيف"); return; }
    await base44.entities.ExpenseCategory.create(newCat);
    setNewCat({ name: "", icon: "📌" });
    loadData();
    toast.success("تم الإضافة");
  };

  const deleteCategory = async (id) => {
    await base44.entities.ExpenseCategory.delete(id);
    setCategories(prev => prev.filter(c => c.id !== id));
    toast.success("تم الحذف");
  };

  const addSource = async () => {
    if (!newSrc.name.trim()) { toast.error("أدخل اسم المصدر"); return; }
    await base44.entities.IncomeSource.create(newSrc);
    setNewSrc({ name: "", icon: "💵" });
    loadData();
    toast.success("تم الإضافة");
  };

  const deleteSource = async (id) => {
    await base44.entities.IncomeSource.delete(id);
    setSources(prev => prev.filter(s => s.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="pt-8">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
      </div>

      {/* Dark Mode */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          {dark ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-yellow-500" />}
          <div>
            <p className="font-medium text-sm">الوضع الليلي</p>
            <p className="text-xs text-muted-foreground">{dark ? "مفعّل" : "معطّل"}</p>
          </div>
        </div>
        <button
          onClick={() => setDark(d => !d)}
          className={`w-12 h-6 rounded-full transition-all duration-300 relative ${dark ? "bg-primary" : "bg-secondary border border-border"}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow ${dark ? "right-0.5" : "left-0.5"}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["categories", "تصنيفات النفقات"], ["sources", "مصادر الدخل"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === key ? "bg-primary text-white" : "bg-card border border-border text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Categories Tab */}
      {tab === "categories" && (
        <div className="space-y-3">
          {categories.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm mb-3">لا توجد تصنيفات، أضف التصنيفات الافتراضية؟</p>
              <Button onClick={initDefaults} variant="outline" className="rounded-xl">إضافة الافتراضية</Button>
            </div>
          ) : categories.map(cat => (
            <div key={cat.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                <span className="font-medium text-sm">{cat.name}</span>
              </div>
              <button onClick={() => deleteCategory(cat.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="bg-card rounded-xl border border-dashed border-border p-3 flex gap-2">
            <input value={newCat.icon} onChange={e => setNewCat(f => ({ ...f, icon: e.target.value }))}
              className="w-12 border border-border rounded-lg px-2 py-1.5 text-center bg-background focus:outline-none" placeholder="🏷️" />
            <input value={newCat.name} onChange={e => setNewCat(f => ({ ...f, name: e.target.value }))}
              placeholder="اسم التصنيف"
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={addCategory} className="bg-primary text-white rounded-lg px-3 py-1.5 text-sm font-medium">
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Sources Tab */}
      {tab === "sources" && (
        <div className="space-y-3">
          {sources.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm mb-3">لا توجد مصادر، أضف المصادر الافتراضية؟</p>
              <Button onClick={initDefaultSources} variant="outline" className="rounded-xl">إضافة الافتراضية</Button>
            </div>
          ) : sources.map(src => (
            <div key={src.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">{src.icon}</span>
                <span className="font-medium text-sm">{src.name}</span>
              </div>
              <button onClick={() => deleteSource(src.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="bg-card rounded-xl border border-dashed border-border p-3 flex gap-2">
            <input value={newSrc.icon} onChange={e => setNewSrc(f => ({ ...f, icon: e.target.value }))}
              className="w-12 border border-border rounded-lg px-2 py-1.5 text-center bg-background focus:outline-none" placeholder="💵" />
            <input value={newSrc.name} onChange={e => setNewSrc(f => ({ ...f, name: e.target.value }))}
              placeholder="اسم المصدر"
              className="flex-1 border border-border rounded-lg px-3 py-1.5 text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={addSource} className="bg-primary text-white rounded-lg px-3 py-1.5 text-sm font-medium">
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}