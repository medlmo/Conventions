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
import { File, Plus, Download, Search, Eye, Edit, Trash2, Bell, LogOut, Users, Settings } from "lucide-react";

export default function ConventionsPage() {
  const { user, logout } = useAuth();
  const permissions = usePermissions();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("conventions");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingConvention, setEditingConvention] = useState<Convention | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
    
    const matchesDateRange = (!dateFrom || new Date(convention.date) >= new Date(dateFrom)) &&
      (!dateTo || new Date(convention.date) <= new Date(dateTo));
    
    return matchesSearch && matchesStatus && matchesDateRange;
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
    setDateFrom("");
    setDateTo("");
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
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
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

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
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="نشطة">نشطة</SelectItem>
                    <SelectItem value="معلقة">معلقة</SelectItem>
                    <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                    <SelectItem value="مكتملة">مكتملة</SelectItem>
                    <SelectItem value="ملغية">ملغية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <File className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">إجمالي الاتفاقيات</p>
                  <p className="text-2xl font-cairo font-bold text-gray-900">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <div className="h-5 w-5 bg-green-600 rounded-full"></div>
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">اتفاقيات نشطة</p>
                  <p className="text-2xl font-cairo font-bold text-gray-900">{stats?.active || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <div className="h-5 w-5 bg-yellow-600 rounded-full"></div>
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">اتفاقيات معلقة</p>
                  <p className="text-2xl font-cairo font-bold text-gray-900">{stats?.pending || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">ر.س</span>
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">إجمالي القيمة</p>
                  <p className="text-2xl font-cairo font-bold text-gray-900">{stats?.totalValue || "0 ر.س"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-cairo">قائمة الاتفاقيات</CardTitle>
              <div className="flex items-center space-x-reverse space-x-2">
                <span className="text-sm text-gray-600">عرض 10 من النتائج</span>
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
                      <TableHead className="text-right">رقم الاتفاقية</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">نوع العملية</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConventions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-gray-500">لا توجد اتفاقيات للعرض</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredConventions.map((convention) => (
                        <TableRow key={convention.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{convention.conventionNumber}</TableCell>
                          <TableCell>{formatDate(convention.date)}</TableCell>
                          <TableCell className="max-w-xs truncate">{convention.description}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(convention.amount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(convention.status)}>
                              {convention.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{convention.operationType}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-reverse space-x-2">
                              <Button variant="ghost" size="sm">
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

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-cairo">إعدادات النظام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b">
                    <div>
                      <h4 className="font-medium">معلومات المستخدم</h4>
                      <p className="text-sm text-gray-600">اسم المستخدم: {user?.username}</p>
                      <p className="text-sm text-gray-600">الدور: {getRoleDisplayName(user?.role || "")}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <h4 className="font-medium">تسجيل الخروج</h4>
                      <p className="text-sm text-gray-600">إنهاء الجلسة الحالية</p>
                    </div>
                    <Button variant="destructive" onClick={handleLogout}>
                      <LogOut className="ml-2 h-4 w-4" />
                      تسجيل الخروج
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
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
    </div>
  );
}
