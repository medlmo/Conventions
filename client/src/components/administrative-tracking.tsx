import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Convention, AdministrativeEvent, InsertAdministrativeEvent } from "@shared/schema";
import { insertAdministrativeEventSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { usePermissions } from "@/hooks/useAuth";

interface AdministrativeTrackingProps {
  convention: Convention;
}

type AdministrativeEventFormData = Omit<InsertAdministrativeEvent, 'conventionId'>;

const formSchema = insertAdministrativeEventSchema.omit({ conventionId: true });

export function AdministrativeTracking({ convention }: AdministrativeTrackingProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdministrativeEvent | null>(null);
  const { userRole } = usePermissions();

  const form = useForm<AdministrativeEventFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventDate: "",
      eventDescription: "",
      notes: "",
    },
  });

  const { data: events = [], isLoading } = useQuery<AdministrativeEvent[]>({
    queryKey: [`/api/conventions/${convention.id}/administrative-events`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: AdministrativeEventFormData) => {
      const res = await apiRequest("POST", `/api/conventions/${convention.id}/administrative-events`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conventions/${convention.id}/administrative-events`] 
      });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "نجح",
        description: "تم إضافة الحدث الإداري بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الحدث الإداري",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AdministrativeEventFormData }) => {
      const res = await apiRequest("PUT", `/api/administrative-events/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conventions/${convention.id}/administrative-events`] 
      });
      setIsDialogOpen(false);
      form.reset();
      setEditingEvent(null);
      toast({
        title: "نجح",
        description: "تم تحديث الحدث الإداري بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الحدث الإداري",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/administrative-events/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conventions/${convention.id}/administrative-events`] 
      });
      toast({
        title: "نجح",
        description: "تم حذف الحدث الإداري بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الحدث الإداري",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (event: AdministrativeEvent) => {
    setEditingEvent(event);
    form.reset({
      eventDate: event.eventDate,
      eventDescription: event.eventDescription,
      notes: event.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: AdministrativeEventFormData) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الحدث الإداري؟")) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy", { locale: ar });
    } catch {
      return dateString;
    }
  };

  const handleOpenDialog = () => {
    setEditingEvent(null);
    form.reset({
      eventDate: "",
      eventDescription: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            التتبع الإداري
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">جاري التحميل...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            التتبع الإداري
          </CardTitle>
          {userRole !== "viewer" && (
            <Button
              onClick={handleOpenDialog}
              size="sm"
              data-testid="button-add-administrative-event"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة حدث
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            لا توجد أحداث إدارية مسجلة
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحدث</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                    <TableCell className="text-right" data-testid={`text-event-date-${event.id}`}>
                      {formatDate(event.eventDate)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-event-description-${event.id}`}>
                      {event.eventDescription}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-event-notes-${event.id}`}>
                      {event.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(event)}
                          data-testid={`button-edit-event-${event.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(event.id)}
                          data-testid={`button-delete-event-${event.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "تعديل الحدث الإداري" : "إضافة حدث إداري جديد"}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? "قم بتعديل معلومات الحدث الإداري"
                : "أضف حدثاً إدارياً جديداً للإتفاقية"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      تاريخ الحدث <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-event-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      وصف الحدث <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="مثال: إرسال الإتفاقية للتأشيرة"
                        data-testid="input-event-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="أضف ملاحظات إضافية..."
                        rows={3}
                        data-testid="input-event-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    form.reset();
                    setEditingEvent(null);
                  }}
                  data-testid="button-cancel"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingEvent ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
