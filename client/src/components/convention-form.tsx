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
import { soussMassaProvinces } from "@/lib/provinces";
import { partnersList } from "@/lib/partners";
import ReactSelect from 'react-select';

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
      year: "",
      session: "",
      domain: "",
      sector: "",
      decisionNumber: "",
      contractor: "",
      contribution: "",
      province: [],
      partners: [],
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
        year: convention.year || "",
        session: convention.session || "",
        domain: convention.domain || "",
        sector: convention.sector || "",
        decisionNumber: convention.decisionNumber || "",
        contractor: convention.contractor,
        contribution: convention.contribution || "",
        province: convention.province || [],
        partners: convention.partners || [],
      });
    } else {
      form.reset({
        conventionNumber: "",
        date: "",
        description: "",
        amount: "",
        status: "",
        year: "",
        session: "",
        domain: "",
        sector: "",
        decisionNumber: "",
        contractor: "",
        contribution: "",
        province: [],
        partners: [],
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
                    <FormLabel>الاتفاقية</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="الاتفاقية"
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
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>السنة</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="2025"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="session"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدورة</FormLabel>
                    <FormControl>
                      <Input
                        placeholder=" دورة مارس 2025"
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
                    <FormLabel>الكلفة الاجمالية</FormLabel>
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
                name="contribution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مساهمة الجهة</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="مثال: 100000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المجال</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المجال" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="الصحة">الصحة</SelectItem>
                        <SelectItem value="التعليم">التعليم</SelectItem>
                        <SelectItem value="البنية التحتية">البنية التحتية</SelectItem>
                        <SelectItem value="الثقافة والرياضة">الثقافة والرياضة</SelectItem>
                        <SelectItem value="البيئة">البيئة</SelectItem>
                        <SelectItem value="الخدمات الاجتماعية">الخدمات الاجتماعية</SelectItem>
                        <SelectItem value="التنمية الاقتصادية">التنمية الاقتصادية</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القطاع</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القطاع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="السياحة">السياحة</SelectItem>
                        <SelectItem value="التشغيل">التشغيل</SelectItem>
                        <SelectItem value="الصحة">الصحة</SelectItem>
                        <SelectItem value="الصناعة التقليدية">الصناعة التقليدية</SelectItem>
                        <SelectItem value="الطرق">الطرق</SelectItem>
                        <SelectItem value="الصيد البحري و تربية الأحياء البحرية">الصيد البحري و تربية الأحياء البحرية</SelectItem>
                        <SelectItem value="الفلاحة">الفلاحة</SelectItem>
                        <SelectItem value="اعداد التراب">اعداد التراب </SelectItem>
                        <SelectItem value="التعاون الدولي">التعاون الدولي </SelectItem>
                        <SelectItem value="التعليم">التعليم</SelectItem>
                        <SelectItem value="التكوين المهني"> التكوين المهني </SelectItem>
                        <SelectItem value="التأهيل الاجتماعي">التأهيل الاجتماعي</SelectItem>
                        <SelectItem value="التنمية القروية">التنمية القروية</SelectItem>
                        <SelectItem value="الرياضة">الرياضة</SelectItem>
                        <SelectItem value="الحد من آثار الكوارث الطبيعية والفياضانات"> الحد من آثار الكوارث الطبيعية والفياضانات</SelectItem>
                        <SelectItem value="التعاون الدولي">التعاون الدولي </SelectItem>
                        <SelectItem value="التسريع الصناعي">التسريع الصناعي </SelectItem>
                        <SelectItem value="احداث و تدبير المؤسسات الثقافية">احداث و تدبير المؤسسات الثقافية</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="decisionNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم المقرر</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="رقم المقرر"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>صاحب المشروع </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="صاحب المشروع "
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partners"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الشركاء</FormLabel>
                    <FormControl>
                      <ReactSelect
                        isMulti
                        options={partnersList.map(p => ({ value: p, label: p }))}
                        value={field.value?.map((v: string) => ({ value: v, label: v }))}
                        onChange={selected => field.onChange(selected.map((opt: any) => opt.value))}
                        placeholder="اختر الشركاء"
                        classNamePrefix="react-select"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العمالة/الإقليم</FormLabel>
                    <FormControl>
                      <ReactSelect
                        isMulti
                        options={soussMassaProvinces.map(p => ({ value: p, label: p }))}
                        value={field.value?.map((v: string) => ({ value: v, label: v }))}
                        onChange={selected => field.onChange(selected.map((opt: any) => opt.value))}
                        placeholder="اختر العمالة/الإقليم"
                        classNamePrefix="react-select"
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
