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
import { useState, useRef } from "react";
import { File, X, Upload, Download } from "lucide-react";
import { saveAs } from "file-saver";

// Sanitize filename to avoid special characters and potential injection vectors
function sanitizeFileName(name: string): string {
  // Autoriser lettres/chiffres/espaces/.-_/caractères arabes ; remplacer le reste par _
  const safe = name.replace(/[^\w\u0600-\u06FF\-\.\s]/g, "_").trim();
  return safe.length > 200 ? safe.slice(0, 200) : safe;
}

interface ConventionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convention?: Convention | null;
}

export function ConventionForm({ open, onOpenChange, convention }: ConventionFormProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      attachments: [],
      delegatedProjectOwner: [],
      executionType: "",
      validity: "",
      jurisdiction: undefined,
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
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: (err && err.message) ? err.message : "حدث خطأ أثناء حفظ الاتفاقية",
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
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: (err && err.message) ? err.message : "حدث خطأ أثناء تحديث الاتفاقية",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;
    
    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      const newFiles = result.files;
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Update form attachments
      const currentAttachments = form.getValues('attachments') || [];
      form.setValue('attachments', [...currentAttachments, ...newFiles.map((f: any) => f.path)]);
      
      toast({
        title: "تم رفع الملفات بنجاح",
        description: `تم رفع ${newFiles.length} ملف`,
      });
    } catch (error) {
      toast({
        title: "خطأ في رفع الملفات",
        description: "حدث خطأ أثناء رفع الملفات",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    form.setValue('attachments', newFiles.map(f => f.path));
  };

  const downloadFile = async (file: any) => {
    try {
      const response = await fetch(file.path);
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const blob = await response.blob();
      const suggested = file.originalName || file.path.split('/').pop() || 'file';
      const fname = sanitizeFileName(suggested);
      saveAs(blob, fname);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "خطأ في التحميل",
        description: "حدث خطأ أثناء تحميل الملف",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: InsertConvention) => {
    // Include uploaded files in the submission
    const submissionData = {
      ...data,
      attachments: uploadedFiles.map(f => f.path)
    };
    
    if (convention) {
      updateMutation.mutate(submissionData);
    } else {
      createMutation.mutate(submissionData);
    }
  };

  useEffect(() => {
    if (convention) {
      form.reset({
        conventionNumber: convention.conventionNumber,
        date: convention.date,
        description: convention.description,
        amount: (convention.amount as any) ?? "",
        status: convention.status,
        year: convention.year || "",
        session: convention.session || "",
        domain: convention.domain || "",
        sector: convention.sector || "",
        decisionNumber: convention.decisionNumber || "",
        contractor: convention.contractor,
        contribution: (convention.contribution as any) ?? "",
        province: typeof convention.province === "string" ? JSON.parse(convention.province) : (convention.province || []),
        partners: typeof convention.partners === "string" ? JSON.parse(convention.partners) : (convention.partners || []),
        attachments: typeof convention.attachments === "string" ? JSON.parse(convention.attachments) : (convention.attachments || []),
        delegatedProjectOwner: Array.isArray(convention.delegatedProjectOwner)
          ? convention.delegatedProjectOwner
          : (typeof convention.delegatedProjectOwner === 'string' && convention.delegatedProjectOwner
              ? (() => { try { return JSON.parse(convention.delegatedProjectOwner as unknown as string); } catch { return [convention.delegatedProjectOwner as unknown as string].filter(Boolean); } })()
              : []),
        executionType: convention.executionType || "",
        programme: convention.programme || "",
        validity: convention.validity || "",
        jurisdiction: (convention.jurisdiction as "منقول" | "ذاتي" | "مشترك") || undefined,
      });
      setUploadedFiles(
        (typeof convention.attachments === "string"
          ? JSON.parse(convention.attachments)
          : convention.attachments || []
        ).map((path: string) => ({
          path,
          originalName: path.split('/').pop(),
          size: 0
        }))
      );
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
        attachments: [],
        delegatedProjectOwner: [],
        executionType: "",
        validity: "",
        jurisdiction: undefined,
      });
      setUploadedFiles([]);
    }
  }, [convention, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl sm:max-w-5xl md:max-w-6xl max-h-[90vh] overflow-y-auto">
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
                        <SelectItem value="دعم الاستثمار و المقاولات">دعم الاستثمار و المقاولات</SelectItem>
                        <SelectItem value="الصحة">الصحة</SelectItem>
                        <SelectItem value="الصناعة التقليدية">الصناعة التقليدية</SelectItem>
                        <SelectItem value="الطرق">الطرق</SelectItem>
                        <SelectItem value="الصيد البحري و تربية الأحياء البحرية">الصيد البحري و تربية الأحياء البحرية</SelectItem>
                        <SelectItem value="الفلاحة">الفلاحة</SelectItem>
                        <SelectItem value=" اعداد التراب و النقل "> اعداد التراب و النقل </SelectItem>
                        <SelectItem value="التعليم">التعليم</SelectItem>
                        <SelectItem value="التكوين المهني"> التكوين المهني </SelectItem>
                        <SelectItem value="التأهيل الاجتماعي">التأهيل الاجتماعي</SelectItem>
                        <SelectItem value="التنمية القروية">التنمية القروية</SelectItem>
                        <SelectItem value="الرياضة">الرياضة</SelectItem>
                        <SelectItem value="الحد من آثار الكوارث الطبيعية والفياضانات"> الحد من آثار الكوارث الطبيعية والفياضانات</SelectItem>
                        <SelectItem value="التعاون الدولي ">التعاون الدولي </SelectItem>
                        <SelectItem value="التسريع الصناعي ">التسريع الصناعي </SelectItem>
                        <SelectItem value="احداث و تدبير المؤسسات الثقافية">احداث و تدبير المؤسسات الثقافية</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="التنمية الإقتصادية">التنمية الإقتصادية</SelectItem>
                        <SelectItem value="التنمية المجالية">التنمية المجالية</SelectItem>
                        <SelectItem value="الشراكة والتعاون الدولي">الشراكة والتعاون الدولي</SelectItem>
                        <SelectItem value="الشؤون الاجتماعية و الثقافية والرياضية">الشؤون الاجتماعية و الثقافية والرياضية</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر صاحب المشروع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partnersList.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Champ صاحب المشروع المنتدب (متعدد) */}
              <FormField
                control={form.control}
                name="delegatedProjectOwner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>صاحب المشروع المنتدب</FormLabel>
                    <FormControl>
                      <ReactSelect
                        isMulti
                        options={partnersList.map(p => ({ value: p, label: p }))}
                        value={(field.value || []).map((v: string) => ({ value: v, label: v }))}
                        onChange={(selected) => field.onChange((selected as any[]).map((opt: any) => opt.value))}
                        placeholder="اختر واحداً أو أكثر"
                        classNamePrefix="react-select"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Champ الشركاء */}
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

              {/* Champ سريان الإتفاقية */}
              <FormField
                control={form.control}
                name="validity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سريان الإتفاقية</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="سريان الإتفاقية"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Champ الاختصاص */}
              <FormField
                control={form.control}
                name="jurisdiction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاختصاص</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الاختصاص" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="منقول">منقول</SelectItem>
                        <SelectItem value="ذاتي">ذاتي</SelectItem>
                        <SelectItem value="مشترك">مشترك</SelectItem>
                      </SelectContent>
                    </Select>
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الاتفاقية</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة الاتفاقية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="في طور التوقيع">في طور التوقيع</SelectItem>
                          <SelectItem value="في طور التأشير">في طور التأشير</SelectItem>
                          <SelectItem value="مؤشرة">مؤشرة</SelectItem>
                          <SelectItem value="موقعة">موقعة</SelectItem>
                          <SelectItem value="غير مفعلة">غير مفعلة</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="programme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البرنامج</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر البرنامج" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PDR">PDR</SelectItem>
                        <SelectItem value="Hors PDR">Hors PDR</SelectItem>
                        <SelectItem value="PDU">PDU</SelectItem>
                        <SelectItem value="PNAM">PNAM</SelectItem>
                        <SelectItem value="PRDTS">PRDTS</SelectItem>
                        <SelectItem value="Contrat etat région">Contrat etat région</SelectItem>
                        <SelectItem value="PAI">PAI</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload Section */}
              <div className="md:col-span-2">
                <FormLabel>المرفقات</FormLabel>
                <div className="mt-2 space-y-4">
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      اضغط هنا لرفع الملفات أو اسحب الملفات إلى هنا
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, Word, Excel, أو الصور (حد أقصى 10 ميجابايت لكل ملف)
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  
                  {isUploading && (
                    <div className="text-center text-sm text-gray-600">
                      جاري رفع الملفات...
                    </div>
                  )}
                  
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">الملفات المرفقة:</h4>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-reverse space-x-2">
                            <File className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{file.originalName}</span>
                            {file.size > 0 && (
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024 / 1024).toFixed(2)} ميجابايت)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-reverse space-x-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(file)}
                              className="text-blue-500 hover:text-blue-700"
                              title="تحميل الملف"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700"
                              title="حذف الملف"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
