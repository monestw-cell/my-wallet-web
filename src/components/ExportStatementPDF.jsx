import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, X } from "lucide-react";
import jsPDF from "jspdf";

export default function ExportStatementPDF({ open, onClose, transactions, currentBalance, currency }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amtMin, setAmtMin] = useState("");
  const [amtMax, setAmtMax] = useState("");
  const [generating, setGenerating] = useState(false);

  const filtered = transactions.filter(tx => {
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo && tx.date > dateTo) return false;
    if (amtMin && tx.amount < parseFloat(amtMin)) return false;
    if (amtMax && tx.amount > parseFloat(amtMax)) return false;
    return true;
  });

  const totalIn = filtered.filter(t => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.direction === "out").reduce((s, t) => s + t.amount, 0);

  const generatePDF = async () => {
    setGenerating(true);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageW, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Wallet Statement", pageW / 2, 12, { align: "center" });

    y = 28;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    // Date range info
    const rangeText = `Period: ${dateFrom || "All"} to ${dateTo || "All"}`;
    doc.text(rangeText, margin, y);
    doc.text(`Export Date: ${new Date().toLocaleDateString("en-GB")}`, pageW - margin, y, { align: "right" });
    y += 8;

    // Summary box
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text(`Balance: ${currentBalance.toLocaleString()} ${currency}`, margin + 4, y + 7);
    doc.setTextColor(21, 128, 61);
    doc.text(`Total In: +${totalIn.toLocaleString()} ${currency}`, margin + 4, y + 14);
    doc.setTextColor(185, 28, 28);
    doc.text(`Total Out: -${totalOut.toLocaleString()} ${currency}`, pageW / 2, y + 7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Transactions: ${filtered.length}`, pageW / 2, y + 14);
    y += 28;

    // Table header
    doc.setFillColor(16, 185, 129);
    doc.rect(margin, y, pageW - margin * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const cols = { date: margin + 3, type: margin + 28, desc: margin + 50, amount: pageW - margin - 3 };
    doc.text("Date", cols.date, y + 5.5);
    doc.text("Type", cols.type, y + 5.5);
    doc.text("Description", cols.desc, y + 5.5);
    doc.text("Amount", cols.amount, y + 5.5, { align: "right" });
    y += 9;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    filtered.forEach((tx, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 1, pageW - margin * 2, 7.5, "F");
      }
      doc.setTextColor(70, 70, 70);
      doc.text(tx.date, cols.date, y + 5);
      doc.text(tx.type || "", cols.type, y + 5);
      const label = (tx.label || "").substring(0, 30);
      doc.text(label, cols.desc, y + 5);
      const amtText = `${tx.direction === "in" ? "+" : "-"}${tx.amount.toLocaleString()} ${currency}`;
      if (tx.direction === "in") doc.setTextColor(21, 128, 61);
      else doc.setTextColor(185, 28, 28);
      doc.text(amtText, cols.amount, y + 5, { align: "right" });
      doc.setTextColor(70, 70, 70);
      y += 7.5;
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${p} of ${totalPages}`, pageW / 2, 290, { align: "center" });
    }

    doc.save(`wallet-statement-${new Date().toISOString().slice(0, 10)}.pdf`);
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <FileDown size={18} className="text-primary" /> تصدير PDF
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Date Filter */}
          <div>
            <p className="text-sm font-medium mb-2">📅 فلتر التاريخ</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">من</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">إلى</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>

          {/* Amount Filter */}
          <div>
            <p className="text-sm font-medium mb-2">💰 فلتر المبلغ</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">حد أدنى</label>
                <input type="number" placeholder="0" value={amtMin} onChange={e => setAmtMin(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">حد أقصى</label>
                <input type="number" placeholder="∞" value={amtMax} onChange={e => setAmtMax(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>

          {/* Preview count */}
          <div className="bg-primary/5 rounded-xl p-3 text-center">
            <p className="text-sm text-muted-foreground">سيتم تصدير <span className="font-bold text-primary">{filtered.length}</span> سجل</p>
          </div>

          <Button onClick={generatePDF} disabled={generating || filtered.length === 0} className="w-full rounded-xl bg-primary gap-2">
            <FileDown size={16} />
            {generating ? "جارٍ الإنشاء..." : "تصدير PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}