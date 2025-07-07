import { useState, useEffect } from "react";
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
import { File, Plus, Download, Search, Eye, Edit, Trash2, LogOut, Users, Settings, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import logoSoussMassa from "../assets/logo-soussmassa.png";

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
  const [sectorStats, setSectorStats] = useState([]);
  const [statusStats, setStatusStats] = useState([]);
  const [sectorCostStats, setSectorCostStats] = useState([]);
  const [programmeFilter, setProgrammeFilter] = useState("");

  // Fetch conventions
  const { data: conventions = [], isLoading } = useQuery<Convention[]>({
    queryKey: ["/api/conventions"],
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/conventions/stats"],
  });

  useEffect(() => {
    fetch('/api/conventions/stats/by-sector', { credentials: 'include' })
      .then(res => res.json())
      .then(setSectorStats);
    fetch('/api/conventions/stats/by-status', { credentials: 'include' })
      .then(res => res.json())
      .then(setStatusStats);
    fetch('/api/conventions/stats/by-sector-cost', { credentials: 'include' })
      .then(res => res.json())
      .then(setSectorCostStats);
  }, []);

  const COLORS = ['#0088FE', '#FF8042', '#888888', '#FFD700', '#00C49F', '#FFBB28', '#FF4444', '#A28CFF', '#FFB6C1'];

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
    
    const matchesSector = !sectorFilter || sectorFilter === "all" || convention.sector === sectorFilter;
    const matchesProgramme = !programmeFilter || programmeFilter === "all" || convention.programme === programmeFilter;
    
    return matchesSearch && matchesStatus && matchesSector && matchesProgramme;
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
    fetch('/api/conventions/export/excel', {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) throw new Error('Erreur lors de l\'export Excel');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'conventions.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تصدير البيانات إلى Excel',
          variant: 'destructive',
        });
      });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDomainFilter("all");
    setSectorFilter("all");
    setProgrammeFilter("all");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">
            {/* Titre à gauche */}
            <div className="flex items-center space-x-reverse space-x-4">
              <h1 className="text-lg md:text-xl font-cairo font-bold text-primary whitespace-nowrap">
                <File className="inline ml-2 h-6 w-6" />
                نظام إدارة الاتفاقيات
              </h1>
            </div>
            {/* Logo centré */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <img src={logoSoussMassa} alt="Logo Région Souss Massa" className="h-10 w-auto" style={{maxWidth: 48}} />
            </div>
            {/* Actions utilisateur/logout à droite */}
            <div className="flex items-center space-x-reverse space-x-4">
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
                      <p className="text-xs font-medium text-gray-600 truncate">مؤشرة</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.visee || 0}</p>
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
                      <p className="text-xs font-medium text-gray-600 truncate">في طور التأشير</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.visa || 0}</p>
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
                      <p className="text-xs font-medium text-gray-600 truncate">في طور التوقيع</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.signature || 0}</p>
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
                      <p className="text-xs font-medium text-gray-600 truncate">مفعلة</p>
                      <p className="text-lg font-cairo font-bold text-gray-900">{stats?.activated || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Total Value Card */}
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

            {/* Graphiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Pie Chart: Répartition par secteur */}
              <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                <h3 className="font-cairo font-bold text-lg mb-4">توزيع الاتفاقيات حسب القطاعات</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={sectorStats} dataKey="count" nameKey="sector" cx="50%" cy="50%" outerRadius={100} label>
                      {sectorStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Donut Chart: Répartition par statut */}
              <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
                <h3 className="font-cairo font-bold text-lg mb-4">توزيع الاتفاقيات حسب التفعيل</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={statusStats} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                      {statusStats.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Montant par secteur */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
              <h3 className="font-cairo font-bold text-lg mb-4">توزيع الاتفاقيات حسب الكلفة والقطاع</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={sectorCostStats} layout="vertical">
                  <XAxis type="number" tickFormatter={v => v.toLocaleString('fr-FR')} />
                  <YAxis dataKey="sector" type="category" width={180} />
                  <Bar dataKey="الكلفة" fill="#0088FE" />
                  <RechartsTooltip formatter={v => v.toLocaleString('fr-FR')} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="conventions" className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-cairo font-bold text-gray-900 mb-2">إدارة الاتفاقيات</h2>
                  <p className="text-gray-600">إدارة وتتبع جميع الاتفاقيات في النظام</p>
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
                    <SelectItem value="في طور التوقيع"> في طور التوقيع</SelectItem>
                    <SelectItem value="في طور التأشير">في طور التأشير</SelectItem>
                    <SelectItem value="مؤشرة">مؤشرة</SelectItem>
                    <SelectItem value="مفعلة">مفعلة</SelectItem>
                    <SelectItem value="غير مفعلة">غير مفعلة</SelectItem>
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
                    <SelectItem value="السياحة">السياحة</SelectItem>
                    <SelectItem value="التشغيل">التشغيل</SelectItem>
                    <SelectItem value="دعم الاستثمار و المقاولات">دعم الاستثمار و المقاولات</SelectItem>
                    <SelectItem value="الصحة">الصحة</SelectItem>
                    <SelectItem value="الصناعة التقليدية">الصناعة التقليدية</SelectItem>
                    <SelectItem value="الطرق">الطرق</SelectItem>
                    <SelectItem value="الصيد البحري و تربية الأحياء البحرية">الصيد البحري و تربية الأحياء البحرية</SelectItem>
                    <SelectItem value="الفلاحة">الفلاحة</SelectItem>
                    <SelectItem value="اعداد التراب ">اعداد التراب </SelectItem>
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البرنامج</label>
                <Select value={programmeFilter} onValueChange={setProgrammeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع البرامج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع البرامج</SelectItem>
                    <SelectItem value="PDR">PDR</SelectItem>
                    <SelectItem value="Hors PDR">Hors PDR</SelectItem>
                    <SelectItem value="PDU">PDU</SelectItem>
                    <SelectItem value="PNAM">PNAM</SelectItem>
                    <SelectItem value="PRDTS">PRDTS</SelectItem>
                    <SelectItem value="Contrat etat région">Contrat etat région</SelectItem>
                    <SelectItem value="PAI">PAI</SelectItem>
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
                مسح الفلتر
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
              <DialogTitle className="font-cairo flex flex-col items-start justify-between">
                <span className="text-base text-gray-700">تفاصيل الاتفاقية</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      // Download Word document from server
                      const response = await fetch(`/api/conventions/${viewingConvention.id}/download`, {
                        method: 'GET',
                        credentials: 'include', // Include session cookies
                      });

                      if (!response.ok) {
                        throw new Error('Failed to download convention');
                      }

                      const blob = await response.blob();
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
                  تحميل بطاقة الاتفاقية
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-700">الاتفاقية</h4>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingConvention.description}</p>
              </div>
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
                  <h4 className="font-medium text-gray-700">القطاع</h4>
                  <p className="text-gray-900">{viewingConvention.sector}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">المجال</h4>
                  <p className="text-gray-900">{viewingConvention.domain || "غير محدد"}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">البرنامج</span>
                    <span className="block font-cairo font-bold text-gray-800">{viewingConvention?.programme || 'غير محدد'}</span>
                  </div>
                </div>
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
                {/* Champ صاحب المشروع المنتدب */}
                <div>
                  <h4 className="font-medium text-gray-700">صاحب المشروع المنتدب</h4>
                  <p className="text-gray-900">{viewingConvention.delegatedProjectOwner || 'غير محدد'}</p>
                </div>
                {/* Champ نوعية التنفيذ */}
                <div>
                  <h4 className="font-medium text-gray-700">نوعية التنفيذ</h4>
                  <p className="text-gray-900">{viewingConvention.executionType || 'غير محدد'}</p>
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
