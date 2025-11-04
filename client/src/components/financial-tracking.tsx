import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Convention } from "@shared/schema";
import { partnersList } from "@/lib/partners";

interface FinancialContribution {
  id: number;
  conventionId: number;
  partnerName: string;
  year: string;
  amountExpected: string | null;
  amountPaid: string | null;
  paymentDate: string | null;
  isPaid: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FinancialTrackingProps {
  convention: Convention;
}

export function FinancialTracking({ convention }: FinancialTrackingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<FinancialContribution | null>(null);
  const [formData, setFormData] = useState({
    partnerName: "",
    year: new Date().getFullYear().toString(),
    amountExpected: "",
    amountPaid: "",
    paymentDate: "",
    isPaid: "false",
    notes: "",
  });

  const { data: contributions = [], isLoading } = useQuery<FinancialContribution[]>({
    queryKey: [`/api/conventions/${convention.id}/financial-contributions`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/conventions/${convention.id}/financial-contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("خطأ في إنشاء المساهمة المالية");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conventions/${convention.id}/financial-contributions`] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "نجح",
        description: "تم إضافة المساهمة المالية بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة المساهمة المالية",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await fetch(`/api/financial-contributions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("خطأ في تحديث المساهمة المالية");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conventions/${convention.id}/financial-contributions`] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "نجح",
        description: "تم تحديث المساهمة المالية بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المساهمة المالية",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/financial-contributions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("خطأ في حذف المساهمة المالية");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conventions/${convention.id}/financial-contributions`] });
      toast({
        title: "نجح",
        description: "تم حذف المساهمة المالية بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المساهمة المالية",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      partnerName: "",
      year: new Date().getFullYear().toString(),
      amountExpected: "",
      amountPaid: "",
      paymentDate: "",
      isPaid: "false",
      notes: "",
    });
    setEditingContribution(null);
  };

  const handleEdit = (contribution: FinancialContribution) => {
    setEditingContribution(contribution);
    setFormData({
      partnerName: contribution.partnerName,
      year: contribution.year,
      amountExpected: contribution.amountExpected || "",
      amountPaid: contribution.amountPaid || "",
      paymentDate: contribution.paymentDate || "",
      isPaid: contribution.isPaid,
      notes: contribution.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContribution) {
      updateMutation.mutate({ id: editingContribution.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("ar-MA", {
      style: "currency",
      currency: "MAD",
    }).format(parseFloat(amount));
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/;
    const slashMatch = /^\d{4}[\/]-\d{2}[\/]-\d{2}$/;
    const dmySlashMatch = /^\d{2}[\/]-?\d{2}[\/]-?\d{4}$/;

    let year: number, month: number, day: number;

    if (isoMatch.test(value) || slashMatch.test(value)) {
      const parts = value.split(/[\/-]/);
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
    } else if (dmySlashMatch.test(value)) {
      const parts = value.split(/[\/-]/);
      day = Number(parts[0]);
      month = Number(parts[1]);
      year = Number(parts[2]);
    } else {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        day = d.getUTCDate();
        month = d.getUTCMonth() + 1;
        year = d.getUTCFullYear();
      } else {
        return value;
      }
    }

    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);
    return `${dd}/${mm}/${yyyy}`;
  };

  const groupByYear = () => {
    const grouped: { [year: string]: FinancialContribution[] } = {};
    contributions.forEach((contribution) => {
      if (!grouped[contribution.year]) {
        grouped[contribution.year] = [];
      }
      grouped[contribution.year].push(contribution);
    });
    return grouped;
  };

  const groupedContributions = groupByYear();
  const years = Object.keys(groupedContributions).sort((a, b) => b.localeCompare(a));

  // Limit partners to those already present in the convention record
  const availablePartners: string[] = (() => {
    try {
      if (Array.isArray((convention as any).partners)) {
        return (convention as any).partners as string[];
      }
      if (typeof (convention as any).partners === "string" && (convention as any).partners.trim() !== "") {
        const parsed = JSON.parse((convention as any).partners);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      }
      return [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-cairo">التتبع المالي للشركاء</h3>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 ml-2" />
          إضافة مساهمة
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">جاري التحميل...</div>
      ) : contributions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          لا توجد مساهمات مالية مسجلة
        </div>
      ) : (
        <div className="space-y-6">
          {years.map((year) => (
            <div key={year} className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-primary">السنة {year}</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">الشريك</TableHead>
                    <TableHead className="text-center">المبلغ المتوقع</TableHead>
                    <TableHead className="text-center">المبلغ المحول</TableHead>
                    <TableHead className="text-center">تاريخ الدفع</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedContributions[year].map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell className="font-medium text-center">{contribution.partnerName}</TableCell>
                      <TableCell className="text-center">{formatCurrency(contribution.amountExpected)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(contribution.amountPaid)}</TableCell>
                      <TableCell className="text-center">
                        {formatDate(contribution.paymentDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {contribution.isPaid === "true" ? (
                            <span className="inline-flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 ml-1" />
                              تم التحويل
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-yellow-600">
                              <XCircle className="h-4 w-4 ml-1" />
                              لم يتم التحويل
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(contribution)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذه المساهمة؟")) {
                                deleteMutation.mutate(contribution.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] max-w-screen-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editingContribution ? "تعديل المساهمة المالية" : "إضافة مساهمة مالية"}
            </DialogTitle>
            <DialogDescription>
              أدخل تفاصيل المساهمة المالية للشريك
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partnerName">الشريك *</Label>
                <Select
                  value={formData.partnerName}
                  onValueChange={(value) =>
                    setFormData({ ...formData, partnerName: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الشريك" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePartners.map((partner) => (
                      <SelectItem key={partner} value={partner}>
                        {partner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">السنة *</Label>
                <Input
                  id="year"
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountExpected">المبلغ المتوقع (درهم)</Label>
                <Input
                  id="amountExpected"
                  type="number"
                  step="0.01"
                  value={formData.amountExpected}
                  onChange={(e) =>
                    setFormData({ ...formData, amountExpected: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPaid">المبلغ المحول (درهم)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) =>
                    setFormData({ ...formData, amountPaid: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">تاريخ التحويل</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isPaid">حالة التحويل *</Label>
                <Select
                  value={formData.isPaid}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isPaid: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">لم يتم التحويل</SelectItem>
                    <SelectItem value="true">تم التحويل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="أدخل أي ملاحظات إضافية..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                إلغاء
              </Button>
              <Button type="submit">
                {editingContribution ? "تحديث" : "إضافة"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
