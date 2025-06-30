import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Convention } from "@shared/schema";
import { useAuth, usePermissions } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ConventionForm } from "@/components/convention-form";
import { DeleteConfirmation } from "@/components/delete-confirmation";
import { UserManagement } from "@/components/user-management";
import { formatCurrency, formatDate, getStatusBadgeClass } from "@/lib/utils";
import { getRoleDisplayName } from "@/lib/authUtils";
import { File, Plus, Download, Search, Eye, Edit, Trash2, Bell, LogOut, Users, Settings, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ConventionsPage() {
  const { user, logout } = useAuth();
  const permissions = usePermissions();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingConvention, setEditingConvention] = useState<Convention | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [viewingConvention, setViewingConvention] = useState<Convention | null>(null);

  // Fetch conventions
  const { data: conventions = [], isLoading } = useQuery<Convention[]>({
    queryKey: ["/api/conventions"],
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/conventions/stats"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conventions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conventions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conventions/stats"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف الاتفاقية بنجاح",
      });
      setIsDeleteOpen(false);
      setDeletingId(null);
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الاتفاقية",
        variant: "destructive",
      });
    },
  });

  // Filter conventions
  const filteredConventions = conventions.filter((convention) => {
    const matchesSearch = !searchQuery || 
      convention.conventionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      convention.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      convention.contractor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === "all" || convention.status === statusFilter;
    
    const matchesDomain = !domainFilter || domainFilter === "all" || convention.domain === domainFilter;
    const matchesSector = !sectorFilter || sectorFilter === "all" || convention.sector === sectorFilter;
    
    return matchesSearch && matchesStatus && matchesDomain && matchesSector;
  });



  const handleAddNew = () => {
    if (!permissions.canCreateConvention) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لإضافة اتفاقيات جديدة",
        variant: "destructive",
      });
      return;
    }
    setEditingConvention(null);
    setIsFormOpen(true);
  };

  const handleEdit = (convention: Convention) => {
    if (!permissions.canEditConvention) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لتعديل الاتفاقيات",
        variant: "destructive",
      });
      return;
    }
    setEditingConvention(convention);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!permissions.canDeleteConvention) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لحذف الاتفاقيات",
        variant: "destructive",
      });
      return;
    }
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "تم تسجيل الخروج بنجاح",
        description: "نراك قريباً",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    toast({
      title: "تصدير البيانات",
      description: "جاري تصدير البيانات إلى Excel...",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDomainFilter("all");
    setSectorFilter("all");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-cairo font-bold text-primary">
                  <File className="inline ml-2 h-6 w-6" />
                  نظام إدارة الاتفاقيات
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-reverse space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-reverse space-x-2">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getRoleDisplayName(user?.role || "")}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-reverse space-x-2 py-3 text-sm">
            <a href="#" className="text-primary hover:text-primary/80">الرئيسية</a>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">إدارة الاتفاقيات</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${permissions.canManageUsers ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              لوحة المراقبة
            </TabsTrigger>
            <TabsTrigger value="conventions" className="flex items-center gap-2">
              <File className="h-4 w-4" />
              الاتفاقيات
            </TabsTrigger>
            {permissions.canManageUsers && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                إدارة المستخدمين
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-cairo font-bold text-gray-900 mb-2">لوحة المراقبة</h2>
              <p className="text-gray-600">عرض شامل لإحصائيات النظام</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="h-5 w-5 bg-gray-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="mr-3 min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600 truncate">إجمالي الاتفاقيات</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <div className="h-5 w-5 bg-green-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="mr-3 min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600 truncate">اتفاقيات نشطة</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.active || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <div className="h-5 w-5 bg-yellow-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="mr-3 min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600 truncate">اتفاقيات معلقة</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.pending || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <div className="h-5 w-5 bg-blue-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="mr-3 min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600 truncate">قيد التنفيذ</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.progress || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <div className="h-5 w-5 bg-purple-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="mr-3 min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600 truncate">مكتملة</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.completed || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <span className="text-emerald-600 font-bold text-xs">د.م</span>
                      </div>
                    </div>
                    <div className="mr-3 min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600 truncate">إجمالي القيمة</p>
                      <p className="text-sm font-cairo font-bold text-gray-900 truncate">{stats?.totalValue || "درهم 0.00"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>


          </TabsContent>

          <TabsContent value="conventions" className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-cairo font-bold text-gray-900 mb-2">إدارة الاتفاقيات</h2>
                  <p className="text-gray-600">إدارة وتتبع جميع الاتفاقيات والعقود في النظام</p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-reverse space-x-3">
                  {permissions.canCreateConvention && (
                    <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90">
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة اتفاقية جديدة
                    </Button>
                  )}
                  <Button onClick={exportToExcel} variant="secondary" className="bg-green-600 hover:bg-green-700 text-white">
                    <Download className="ml-2 h-4 w-4" />
                    تصدير إلى Excel
                  </Button>
                </div>
              </div>
            </div>

        {/* Search and Filter Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-cairo">البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البحث العام</label>
                <Input
                  placeholder="البحث في رقم الاتفاقية، الوصف، أو المبلغ"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">حالة الاتفاقية</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="في طور التوقيع"> في طور التوقيع</SelectItem>
                    <SelectItem value="في طور التأشير">في طور التأشير</SelectItem>
                    <SelectItem value="مؤشرة">مؤشرة</SelectItem>
                    <SelectItem value="مفعلة">مفعلة</SelectItem>
                    <SelectItem value="غير مفعلة">غير مفعلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المجال</label>
                <Select value={domainFilter} onValueChange={setDomainFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع المجالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المجالات</SelectItem>
                    <SelectItem value="السياحة">السياحة</SelectItem>
                    <SelectItem value="التشغيل">التشغيل</SelectItem>
                    <SelectItem value="الصحة">الصحة</SelectItem>
                    <SelectItem value="الصناعة التقليدية">الصناعة التقليدية</SelectItem>
                    <SelectItem value="الطرق">الطرق</SelectItem>
                    <SelectItem value="الصيد البحري و تربية الأحياء البحرية">الصيد البحري و تربية الأحياء البحرية</SelectItem>
                    <SelectItem value="الفلاحة">الفلاحة</SelectItem>
                    <SelectItem value="اعداد التراب">اعداد التراب </SelectItem>
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">القطاع</label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع القطاعات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع القطاعات</SelectItem>
                    <SelectItem value="التنمية الإقتصادية">التنمية الإقتصادية</SelectItem>
                    <SelectItem value="التنمية المجالية">التنمية المجالية</SelectItem>
                    <SelectItem value="الشراكة والتعاون الدولي">الشراكة والتعاون الدولي</SelectItem>
                    <SelectItem value="الشؤون الاجتماعية و الثقافية والرياضية">الشؤون الاجتماعية و الثقافية والرياضية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <Button className="bg-primary hover:bg-primary/90">
                <Search className="ml-2 h-4 w-4" />
                تطبيق البحث
              </Button>
              <Button variant="ghost" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-cairo">قائمة الاتفاقيات</CardTitle>
              <div className="flex items-center space-x-reverse space-x-2">
                <span className="text-sm text-gray-600">عرض {filteredConventions.length} من النتائج</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-gray-600">جاري تحميل البيانات...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الإجراءات</TableHead>
                      <TableHead className="text-right">القطاع</TableHead>
                      <TableHead className="text-right">الكلفة الاجمالية</TableHead>
                      <TableHead className="text-right">الاتفاقية</TableHead>
                      <TableHead className="text-right">الدورة</TableHead>
                      <TableHead className="text-right">رقم الاتفاقية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConventions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <p className="text-gray-500">لا توجد اتفاقيات للعرض</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredConventions.map((convention) => (
                        <TableRow key={convention.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-reverse space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => setViewingConvention(convention)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {permissions.canEditConvention && (
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(convention)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {permissions.canDeleteConvention && (
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(convention.id)}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{convention.sector || "غير محدد"}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(convention.amount)}</TableCell>
                          <TableCell className="max-w-xs truncate">{convention.description}</TableCell>
                          <TableCell>{convention.session}</TableCell>
                          <TableCell className="font-medium">{convention.conventionNumber}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
            </Card>
          </TabsContent>

          {permissions.canManageUsers && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}


        </Tabs>
      </main>

      {/* Modals */}
      {permissions.canCreateConvention && (
        <ConventionForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          convention={editingConvention}
        />
      )}

      <DeleteConfirmation
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        isLoading={deleteMutation.isPending}
      />

      {viewingConvention && (
        <Dialog open={!!viewingConvention} onOpenChange={() => setViewingConvention(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-cairo flex items-center justify-between">
                <span>تفاصيل الاتفاقية</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      // Import docx library dynamically
                      const docxModule = await import('docx');
                      
                      // Create the document content
                      const doc = new docxModule.Document({
                        sections: [{
                          children: [
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: "تفاصيل الاتفاقية",
                                  bold: true,
                                  size: 32,
                                }),
                              ],
                              spacing: { after: 400 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `رقم الاتفاقية: ${viewingConvention.conventionNumber}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `التاريخ: ${formatDate(viewingConvention.date)}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `السنة: ${viewingConvention.year || 'غير محدد'}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `الدورة: ${viewingConvention.session || 'غير محدد'}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `المجال: ${viewingConvention.domain || 'غير محدد'}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `القطاع: ${viewingConvention.sector || 'غير محدد'}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `رقم المقرر: ${viewingConvention.decisionNumber || 'غير محدد'}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `الحالة: ${viewingConvention.status}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 400 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: "الاتفاقية:",
                                  bold: true,
                                  size: 28,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: viewingConvention.description || 'غير محدد',
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 400 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `الكلفة الإجمالية: ${formatCurrency(viewingConvention.amount)}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `مساهمة الجهة: ${viewingConvention.contribution ? formatCurrency(viewingConvention.contribution) : 'غير محدد'}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                            new docxModule.Paragraph({
                              children: [
                                new docxModule.TextRun({
                                  text: `صاحب المشروع: ${viewingConvention.contractor || 'غير محدد'}`,
                                  size: 24,
                                }),
                              ],
                              spacing: { after: 200 },
                            }),
                          ],
                        }],
                      });

                      // Generate the document
                      const buffer = await docxModule.Packer.toBuffer(doc);
                      
                      // Create download link
                      const blob = new Blob([buffer], { 
                        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
                      });
                      
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `اتفاقية_${viewingConvention.conventionNumber}.docx`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);

                      toast({
                        title: "تم التحميل بنجاح",
                        description: "تم تحميل ملف Word بنجاح",
                      });
                    } catch (error) {
                      console.error('Error downloading convention:', error);
                      toast({
                        title: "خطأ في التحميل",
                        description: "حدث خطأ أثناء تحميل الاتفاقية",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="text-green-600 hover:text-green-700"
                >
                  <Download className="h-4 w-4 ml-2" />
                  تحميل الاتفاقية
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">رقم الاتفاقية</h4>
                  <p className="text-gray-900">{viewingConvention.conventionNumber}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">التاريخ</h4>
                  <p className="text-gray-900">{formatDate(viewingConvention.date)}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">السنة</h4>
                  <p className="text-gray-900">{viewingConvention.year}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">الدورة</h4>
                  <p className="text-gray-900">{viewingConvention.session}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">المجال</h4>
                  <p className="text-gray-900">{viewingConvention.domain}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">القطاع</h4>
                  <p className="text-gray-900">{viewingConvention.sector}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">رقم المقرر</h4>
                  <p className="text-gray-900">{viewingConvention.decisionNumber}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">الحالة</h4>
                  <Badge className={getStatusBadgeClass(viewingConvention.status)}>
                    {viewingConvention.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">الاتفاقية</h4>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingConvention.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">الكلفة الإجمالية</h4>
                  <p className="text-gray-900 font-semibold">{formatCurrency(viewingConvention.amount)}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">مساهمة الجهة</h4>
                  <p className="text-gray-900">{viewingConvention.contribution ? formatCurrency(viewingConvention.contribution) : 'غير محدد'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">صاحب المشروع</h4>
                  <p className="text-gray-900">{viewingConvention.contractor}</p>
                </div>
              </div>
              
              {viewingConvention.province && viewingConvention.province.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">العمالة/الإقليم</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingConvention.province.map((prov, index) => (
                      <Badge key={index} variant="secondary">{prov}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {viewingConvention.partners && viewingConvention.partners.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">الشركاء</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingConvention.partners.map((partner, index) => (
                      <Badge key={index} variant="secondary">{partner}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {viewingConvention.attachments && viewingConvention.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">المرفقات</h4>
                  <div className="space-y-2">
                    {viewingConvention.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-reverse space-x-2">
                          <File className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {attachment.split('/').pop()}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(attachment);
                              if (!response.ok) throw new Error('Failed to fetch file');
                              
                              const blob = await response.blob();
                              const link = document.createElement('a');
                              link.href = URL.createObjectURL(blob);
                              link.download = attachment.split('/').pop() || 'file';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(link.href);
                            } catch (error) {
                              console.error('Error downloading file:', error);
                              toast({
                                title: "خطأ في التحميل",
                                description: "حدث خطأ أثناء تحميل الملف",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="text-blue-500 hover:text-blue-700"
                          title="تحميل الملف"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
