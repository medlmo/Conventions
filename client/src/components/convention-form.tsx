import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { insertConventionSchema, type Convention, type InsertConvention } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ConventionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convention?: Convention | null;
}

export function ConventionForm({ open, onOpenChange, convention }: ConventionFormProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertConvention>({
    resolver: zodResolver(insertConventionSchema),
    defaultValues: {
      conventionNumber: "",
      date: "",
      description: "",
      amount: "",
      status: "",
      operationType: "",
      contractor: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertConvention) => {
      await apiRequest("POST", "/api/conventions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conventions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conventions/stats"] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم إنشاء الاتفاقية بنجاح",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الاتفاقية",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertConvention) => {
      await apiRequest("PUT", `/api/conventions/${convention?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conventions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conventions/stats"] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث الاتفاقية بنجاح",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الاتفاقية",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertConvention) => {
    if (convention) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  useEffect(() => {
    if (convention) {
      form.reset({
        conventionNumber: convention.conventionNumber,
        date: convention.date,
        description: convention.description,
        amount: convention.amount,
        status: convention.status,
        operationType: convention.operationType,
        contractor: convention.contractor,
      });
    } else {
      form.reset({
        conventionNumber: "",
        date: "",
        description: "",
        amount: "",
        status: "",
        operationType: "",
        contractor: "",
      });
    }
  }, [convention, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cairo">
            {convention ? "تعديل الاتفاقية" : "إضافة اتفاقية جديدة"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="conventionNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الاتفاقية</FormLabel>
                    <FormControl>
                      <Input placeholder="2024/001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الاتفاقية</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>وصف الاتفاقية</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="وصف تفصيلي للاتفاقية..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ (ريال سعودي)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع العملية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع العملية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="توريد">توريد</SelectItem>
                        <SelectItem value="صيانة">صيانة</SelectItem>
                        <SelectItem value="تطوير">تطوير</SelectItem>
                        <SelectItem value="استشارة">استشارة</SelectItem>
                        <SelectItem value="خدمات">خدمات</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الاتفاقية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="نشطة">نشطة</SelectItem>
                        <SelectItem value="معلقة">معلقة</SelectItem>
                        <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                        <SelectItem value="مكتملة">مكتملة</SelectItem>
                        <SelectItem value="ملغية">ملغية</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجهة المتعاقدة</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="اسم الجهة أو الشركة المتعاقدة"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-reverse space-x-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "جاري الحفظ..."
                  : "حفظ الاتفاقية"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
