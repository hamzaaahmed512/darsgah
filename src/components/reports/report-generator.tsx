"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Download, Share2, Eye, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface ReportGeneratorProps {
  data: (string | number)[][];
  headers: string[];
  title: string;
  filters?: Record<string, string | undefined>;
  schoolName?: string;
}

export function ReportGenerator({ data, headers, title, filters, schoolName = "School Name" }: ReportGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const generatePDF = (action: "download" | "print" | "blob" = "download") => {
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.width;
    const margin = 40;

    // Professional Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text(schoolName, pageWidth / 2, 50, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(title, pageWidth / 2, 70, { align: "center" });

    // Decorative line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(margin, 85, pageWidth - margin, 85);

    let startY = 105;

    // Date and Filters
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, margin, startY);
    startY += 15;

    if (filters && Object.keys(filters).length > 0) {
      const activeFilters = Object.entries(filters).filter(([, v]) => v && v !== "all").map(([k, v]) => `${k}: ${v}`).join(" | ");
      if (activeFilters) {
        doc.setFont("helvetica", "normal");
        doc.text(`Filters applied: ${activeFilters}`, margin, startY);
        startY += 15;
      }
    }

    startY += 10;

    // Table
    if (data.length === 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text("No records found matching the current filters.", margin, startY + 20);
    } else {
      autoTable(doc, {
        startY: startY,
        head: [headers],
        body: data,
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 5, textColor: 50 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          // Footer (Page numbers)
          const str = `Page ${doc.getNumberOfPages()}`;
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.text(str, data.settings.margin.left, pageHeight - 20);
        }
      });
    }

    if (action === "download") {
      doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_report.pdf`);
    } else if (action === "print") {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else if (action === "blob") {
      return doc.output('datauristring');
    }
  };

  const handlePreview = () => {
    setPreviewMode(true);
  };

  const handleWhatsAppShare = async () => {
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.width;
    const margin = 40;

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text(schoolName, pageWidth / 2, 50, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(title, pageWidth / 2, 70, { align: "center" });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(margin, 85, pageWidth - margin, 85);

    let startY = 105;

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${format(new Date(), "PPpp")}`, margin, startY);
    startY += 15;

    if (filters && Object.keys(filters).length > 0) {
      const activeFilters = Object.entries(filters).filter(([, v]) => v && v !== "all").map(([k, v]) => `${k}: ${v}`).join(" | ");
      if (activeFilters) {
        doc.setFont("helvetica", "normal");
        doc.text(`Filters applied: ${activeFilters}`, margin, startY);
        startY += 15;
      }
    }

    startY += 10;

    if (data.length === 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text("No records found matching the current filters.", margin, startY + 20);
    } else {
      autoTable(doc, {
        startY: startY,
        head: [headers],
        body: data,
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 5, textColor: 50 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          const str = `Page ${doc.getNumberOfPages()}`;
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.text(str, data.settings.margin.left, pageHeight - 20);
        }
      });
    }

    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `${title.replace(/\s+/g, '_').toLowerCase()}.pdf`, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title,
          text: `Here is the ${title} report.`,
        });
      } catch (error) {
        console.error("Error sharing", error);
      }
    } else {
      generatePDF("download");
      const text = encodeURIComponent(`I've downloaded the "${title}" report. Please find the attached PDF.`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  const closeModal = () => {
    setOpen(false);
    setPreviewMode(false);
  };

  const modal = open ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-[20px] bg-white shadow-lift ring-1 ring-outline sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex items-center justify-between border-b border-outline px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="font-display text-xl font-bold text-ink">Report Actions: {title}</h2>
          <button onClick={closeModal} className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {!previewMode ? (
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Button variant="secondary" className="h-24 flex-col gap-2 rounded-2xl" onClick={handlePreview}>
                <Eye className="h-6 w-6 text-blue-600" />
                <span>Preview Report</span>
              </Button>
              <Button variant="secondary" className="h-24 flex-col gap-2 rounded-2xl" onClick={() => generatePDF("print")}>
                <Printer className="h-6 w-6 text-blue-600" />
                <span>Print Report</span>
              </Button>
              <Button variant="secondary" className="h-24 flex-col gap-2 rounded-2xl" onClick={() => generatePDF("download")}>
                <Download className="h-6 w-6 text-blue-600" />
                <span>Download PDF</span>
              </Button>
              <Button variant="secondary" className="h-24 flex-col gap-2 rounded-2xl" onClick={handleWhatsAppShare}>
                <Share2 className="h-6 w-6 text-green-600" />
                <span>Share via WhatsApp</span>
              </Button>
            </div>
          ) : (
            <div className="flex h-[75vh] flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Report Preview</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPreviewMode(false)}>
                    <X className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button size="sm" onClick={() => generatePDF("download")}>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mx-auto max-w-4xl">
                  {/* Header */}
                  <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-slate-900">{schoolName}</h1>
                    <h2 className="mt-2 text-lg text-slate-600">{title}</h2>
                    <hr className="my-4 border-slate-200" />
                    <div className="flex flex-col items-center gap-2 text-sm text-slate-500">
                      <p className="italic">Generated on: {format(new Date(), "PPpp")}</p>
                      {filters && Object.keys(filters).length > 0 && (
                        <p>
                          Filters applied: {Object.entries(filters).filter(([, v]) => v && v !== "all").map(([k, v]) => `${k}: ${v}`).join(" | ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  {data.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                      No records found matching the current filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-blue-600 text-white">
                          <tr>
                            {headers.map((header, i) => (
                              <th key={i} className="whitespace-nowrap px-4 py-3 font-semibold">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {data.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              {row.map((cell, j) => (
                                <td key={j} className="px-4 py-3 text-slate-600">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4" />
        Generate Report
      </Button>
      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
