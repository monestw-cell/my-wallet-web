import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Trash2, Pencil } from "lucide-react";
import { getCurrency } from "@/utils/currency";
import { updateWalletBalance } from "@/utils/wallet";
import { toast } from "sonner";

export default function IncomeSourceDetail() {
  const { sourceName } = useParams();
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const { symbol: cur } = getCurrency();

  useEffect(() => { loadData(); }, [sourceName]);

  const loadData = async () => {
    const all = await base44.entities.Income.filter({ source: decodeURIComponent(sourceName) }, "-date", 200);
    setIncomes(all);
  };

  const handleDelete = async (inc) => {
    await base44.entities.Income.delete(inc.id);
    await updateWalletBalance(-inc.amount);
    setIncomes(prev => prev.filter(i => i.id !== inc.id));
    toast.success("تم الحذف وإعادة المبلغ للمحفظة");
  };

  const handleUpdate = async () => {
    if (!editAmount || isNaN(editAmount)) return;
    const newAmt = parseFloat(editAmount);
    const diff = newAmt - editItem.amount;
    await Promise.all([
      base44.entities.Income.update(editItem.id, { amount: newAmt }),
      updateWalletBalance(diff),
    ]);
    toast.success("تم التعديل");
    setEditItem(null);
    setEditAmount("");
    loadData();
  };

  const total = incomes.reduce((s, i) => s + (i.amount || 0), 0);
  const decodedName = decodeURIComponent(sourceName);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-8 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">{decodedName}</h1>
          <p className="text-xs text-muted-foreground">{incomes.length} سجل</p>
        </div>
      </div>

      {/* Total */}
      <div className="bg-gradient-to-l from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 rounded-xl p-4 border border-green-100 dark:border-green-800">
        <p className="text-xs text-green-600 font-medium mb-1">إجمالي الإيرادات</p>
        <p className="text-2xl font-bold text-green-700">{total.toLocaleString("en-US")} <span className="text-base">{cur}</span></p>
      </div>

      {/* History */}
      <div className="space-y-2">
        {incomes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">💰</p>
            <p>لا توجد إيرادات من هذا المصدر</p>
          </div>
        ) : incomes.map(inc => (
          <div key={inc.id} className="bg-card rounded-xl border border-border p-3 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{inc.date}{inc.notes ? ` · ${inc.notes}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              {editItem?.id === inc.id ? (
                <div className="flex items-center gap-1">
                  <input type="number" value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-24 border border-border rounded-lg px-2 py-1 text-right text-sm bg-background focus:outline-none"
                    autoFocus />
                  <button onClick={handleUpdate} className="text-xs bg-primary text-white px-2 py-1 rounded-lg">حفظ</button>
                  <button onClick={() => setEditItem(null)} className="text-xs text-muted-foreground">✕</button>
                </div>
              ) : (
                <>
                  <span className="font-bold text-sm text-green-600">+{inc.amount?.toLocaleString("en-US")} {cur}</span>
                  <button onClick={() => { setEditItem(inc); setEditAmount(inc.amount); }} className="text-muted-foreground hover:text-primary transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(inc)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}