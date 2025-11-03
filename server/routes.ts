import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSession, requireAuth, requireRole } from "./auth";
import { upload, deleteFile } from "./upload";
import { 
  insertConventionSchema, 
  loginSchema, 
  createUserSchema,
  UserRole,
  insertFinancialContributionSchema
} from "@shared/schema";
import { z } from "zod";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(getSession());

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.validateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      req.session.userId = user.id;
      req.session.user = user;
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "خطأ في تسجيل الدخول" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "خطأ في تسجيل الخروج" });
      }
      res.json({ message: "تم تسجيل الخروج بنجاح" });
    });
  });

  app.get("/api/auth/user", requireAuth, (req, res) => {
    res.json({
      user: {
        id: req.user!.id,
        username: req.user!.username,
        role: req.user!.role,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        email: req.user!.email,
      }
    });
  });

  // User management routes (Admin only)
  app.get("/api/users", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "خطأ في استرجاع المستخدمين" });
    }
  });

  app.post("/api/users", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "خطأ في إنشاء المستخدم" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (id === req.user!.id) {
        return res.status(400).json({ message: "لا يمكنك حذف حسابك الخاص" });
      }
      
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      res.json({ message: "تم حذف المستخدم بنجاح" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "خطأ في حذف المستخدم" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const userData = createUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "خطأ في تحديث المستخدم" });
    }
  });

  // Convention routes with role-based access
  // Get all conventions - All authenticated users can view
  app.get("/api/conventions", requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      res.json(conventions);
    } catch (error) {
      console.error("Error fetching conventions:", error);
      res.status(500).json({ message: "خطأ في استرجاع الاتفاقيات" });
    }
  });

  // Statistiques globales conventions (dashboard)
  app.get('/api/conventions/stats', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const total = conventions.length;
      const signed = conventions.filter(c => c.status === 'موقعة').length;
      const signature = conventions.filter(c => c.status === 'في طور التوقيع').length;
      const visa = conventions.filter(c => c.status === 'في طور التأشير').length;
      const visee = conventions.filter(c => c.status === 'مؤشرة').length;
      const totalValue = conventions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const totalValueFormatted = totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });
      res.json({ total, signed, signature, visa, visee, totalValue: totalValueFormatted });
    } catch (error) {
      console.error('Erreur stats globales:', error);
      res.status(500).json({ message: 'Erreur statistiques globales' });
    }
  });

  // Search conventions - All authenticated users can search
  app.get("/api/conventions/search/:query", requireAuth, async (req, res) => {
    try {
      const query = req.params.query;
      const conventions = await storage.searchConventions(query);
      res.json(conventions);
    } catch (error) {
      console.error("Error searching conventions:", error);
      res.status(500).json({ message: "خطأ في البحث" });
    }
  });

  // Get convention by ID - All authenticated users can view
  app.get("/api/conventions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const convention = await storage.getConvention(id);
      if (!convention) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }
      res.json(convention);
    } catch (error) {
      console.error("Error fetching convention:", error);
      res.status(500).json({ message: "خطأ في استرجاع الاتفاقية" });
    }
  });

  // Create new convention - Admin and Editor only
  app.post("/api/conventions", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const validatedData = insertConventionSchema.parse(req.body);
      const convention = await storage.createConvention(validatedData, req.user!.id);
      res.status(201).json(convention);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating convention:", error);
      res.status(500).json({ message: "خطأ في إنشاء الاتفاقية" });
    }
  });

  // Update convention - Admin and Editor only
  app.put("/api/conventions/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const validatedData = insertConventionSchema.partial().parse(req.body);
      const convention = await storage.updateConvention(id, validatedData);
      if (!convention) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }
      res.json(convention);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating convention:", error);
      res.status(500).json({ message: "خطأ في تحديث الاتفاقية" });
    }
  });

  // Delete convention - Admin and Editor only
  app.delete("/api/conventions/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const deleted = await storage.deleteConvention(id);
      if (!deleted) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }
      res.json({ message: "تم حذف الاتفاقية بنجاح" });
    } catch (error) {
      console.error("Error deleting convention:", error);
      res.status(500).json({ message: "خطأ في حذف الاتفاقية" });
    }
  });

  // File upload routes
  app.post("/api/upload", requireAuth, (req, res, next) => {
    upload.array('files', 5)(req, res, (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        
        // Gestion spécifique de l'erreur Multer "File too large"
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            message: "الملف كبير جداً. الحد الأقصى هو 10 ميجابايت.",
            error: "FILE_TOO_LARGE"
          });
        }
        
        // Gestion des autres erreurs Multer
        if (err.name === 'MulterError') {
          switch (err.code) {
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({ 
                message: "عدد الملفات كبير جداً. الحد الأقصى هو 5 ملفات.",
                error: "TOO_MANY_FILES"
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({ 
                message: "نوع الملف غير متوقع.",
                error: "UNEXPECTED_FILE"
              });
            default:
              return res.status(400).json({ 
                message: "خطأ في رفع الملفات.",
                error: "UPLOAD_ERROR"
              });
          }
        }
        
        // Gestion des erreurs générales
        return res.status(500).json({ message: "خطأ في رفع الملفات" });
      }
      
      // Si pas d'erreur, continuer avec le traitement normal
      next();
    });
  }, async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "لم يتم رفع أي ملفات" });
      }

      // Validation de la taille des fichiers côté serveur
      const maxFileSize = 10 * 1024 * 1024; // 10MB en bytes
      const oversizedFiles: string[] = [];

      for (const file of files) {
        if (file.size > maxFileSize) {
          oversizedFiles.push(file.originalname);
          // Supprimer le fichier trop volumineux
          const { deleteFile } = await import('./upload');
          deleteFile(file.filename);
        }
      }

      // Si des fichiers sont trop volumineux, retourner une erreur
      if (oversizedFiles.length > 0) {
        const fileList = oversizedFiles.join(', ');
        return res.status(400).json({ 
          message: `الملفات التالية كبيرة جداً (الحد الأقصى 10 ميجابايت): ${fileList}`,
          oversizedFiles 
        });
      }

      const uploadedFiles = files.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        path: `/uploads/${file.filename}`
      }));

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "خطأ في رفع الملفات" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', requireAuth, express.static(path.join(process.cwd(), 'uploads')));

  // Download convention as Word document
  app.get("/api/conventions/:id/download", requireAuth, async (req, res) => {
    try {
      const conventionId = parseInt(req.params.id);
      const convention = await storage.getConvention(conventionId);
      
      if (!convention) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }

      // Format date in French with Western digits
      const dateFr = new Date(convention.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // Prepare table rows (label, value)
      const fields = [
        ['رقم الاتفاقية', convention.conventionNumber || 'غير محدد'],
        ['التاريخ', dateFr],
        ['السنة', convention.year || 'غير محدد'],
        ['الدورة', convention.session || 'غير محدد'],
        ['المجال', convention.domain || 'غير محدد'],
        ['القطاع', convention.sector || 'غير محدد'],
        ['رقم المقرر', convention.decisionNumber || 'غير محدد'],
        ['الحالة', convention.status || 'غير محدد'],
        ['الكلفة الإجمالية', convention.amount ? convention.amount.toLocaleString('fr-FR') + ' د.م' : 'غير محدد'],
        ['مساهمة الجهة', convention.contribution ? convention.contribution.toLocaleString('fr-FR') + ' د.م' : 'غير محدد'],
        ['صاحب المشروع', convention.contractor || 'غير محدد'],
        ['صاحب المشروع المنتدب', (Array.isArray(convention.delegatedProjectOwner) ? convention.delegatedProjectOwner.join(', ') : (convention.delegatedProjectOwner || 'غير محدد'))],
        ['نوعية التنفيذ', convention.executionType || 'غير محدد'],
        ["سريان الإتفاقية", convention.validity || "غير محدد"],
        ["الاختصاص", convention.jurisdiction || "غير محدد"],
        [
          'العمالة/الإقليم',
          (convention.province && Array.isArray(convention.province) && convention.province.length > 0)
            ? convention.province.join(', ')
            : 'غير محدد',
        ],
        [
          'الشركاء',
          (convention.partners && Array.isArray(convention.partners) && convention.partners.length > 0)
            ? convention.partners.join(', ')
            : 'غير محدد',
        ],
        ['البرنامج', convention.programme || 'غير محدد'],
      ];

      const { Document, Paragraph, TextRun, Packer, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } = await import('docx');

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: 'الاتفاقية:',
                  bold: true,
                  size: 28,
                  font: 'Arial',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              children: [
                new TextRun({
                  text: convention.description || 'غير محدد',
                  font: 'Arial',
                  size: 24,
                }),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              children: [
                new TextRun({
                  text: 'تفاصيل الاتفاقية',
                  bold: true,
                  size: 36,
                  font: 'Arial',
                }),
              ],
              spacing: { after: 400 },
            }),
            new Table({
              alignment: AlignmentType.RIGHT,
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: fields.map(([label, value]) =>
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 60, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          bidirectional: true,
                          children: [
                            new TextRun({ text: String(value), font: 'Arial', size: 24 }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          bidirectional: true,
                          children: [
                            new TextRun({ text: String(label), bold: true, font: 'Arial', size: 24 }),
                          ],
                        }),
                      ],
                    }),
                  ],
                  tableHeader: false,
                })
              ),
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
                left: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
                right: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'auto' },
              },
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      
      // Sanitize filename and support UTF-8
      const safeConventionNumber = String(convention.conventionNumber).replace(/[^a-zA-Z0-9-_]/g, '_');
      const asciiFallback = `convention_${safeConventionNumber}.docx`;
      const utf8Filename = `اتفاقية_${safeConventionNumber}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`);
      res.send(buffer);
    } catch (error) {
      console.error('Error generating Word document:', error);
      res.status(500).json({ message: "خطأ في إنشاء ملف Word" });
    }
  });

  // Delete uploaded file
  app.delete("/api/upload/:filename", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), (req, res) => {
    try {
      const { filename } = req.params;
      deleteFile(filename);
      res.json({ message: "تم حذف الملف بنجاح" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "خطأ في حذف الملف" });
    }
  });

  // Export all conventions to Excel
  app.get('/api/conventions/export/excel', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Conventions');

      // Define columns
      worksheet.columns = [
        { header: 'رقم الاتفاقية', key: 'conventionNumber', width: 15 },
        { header: 'التاريخ', key: 'date', width: 15 },
        { header: 'السنة', key: 'year', width: 10 },
        { header: 'الدورة', key: 'session', width: 12 },
        { header: 'الاتفاقية', key: 'description', width: 50 },
        { header: 'المجال', key: 'domain', width: 15 },
        { header: 'القطاع', key: 'sector', width: 20 },
        { header: 'رقم المقرر', key: 'decisionNumber', width: 18 },
        { header: 'الحالة', key: 'status', width: 12 },
        { header: 'الكلفة الإجمالية', key: 'amount', width: 15 },
        { header: 'مساهمة الجهة', key: 'contribution', width: 15 },
        { header: 'صاحب المشروع', key: 'contractor', width: 20 },
        { header: 'صاحب المشروع المنتدب', key: 'delegatedProjectOwner', width: 25 },
        { header: 'نوعية التنفيذ', key: 'executionType', width: 18 },
        { header: 'سريان الإتفاقية', key: 'validity', width: 18 },
        { header: 'الاختصاص', key: 'jurisdiction', width: 12 },
        { header: 'البرنامج', key: 'programme', width: 18 },
        { header: 'العمالة/الإقليم', key: 'province', width: 20 },
        { header: 'الشركاء', key: 'partners', width: 50 },
      ];

      // Add rows
      conventions.forEach(c => {
        worksheet.addRow({
          conventionNumber: c.conventionNumber,
          date: c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '',
          year: c.year,
          session: c.session,
          domain: c.domain,
          sector: c.sector,
          decisionNumber: c.decisionNumber,
          status: c.status,
          amount: c.amount,
          contribution: c.contribution,
          contractor: c.contractor,
          delegatedProjectOwner: Array.isArray(c.delegatedProjectOwner) ? c.delegatedProjectOwner.join(', ') : (c.delegatedProjectOwner || ''),
          executionType: c.executionType,
          programme: c.programme,
          province: Array.isArray(c.province) ? c.province.join(', ') : c.province,
          partners: Array.isArray(c.partners) ? c.partners.join(', ') : c.partners,
          description: c.description,
          validity: c.validity,
          jurisdiction: c.jurisdiction,
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="conventions.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Erreur export Excel:', error);
      res.status(500).json({ message: 'Erreur lors de l\'export Excel' });
    }
  });

  // Statistiques : nombre de conventions par secteur
  app.get('/api/conventions/stats/by-sector', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const sectorCounts: Record<string, number> = {};
      conventions.forEach(c => {
        const sector = ((c.sector as unknown as string) || 'غير محدد').toString().trim().replace(/\s+/g, ' ');
        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      });
      const result = Object.entries(sectorCounts).map(([sector, count]) => ({ sector, count }));
      res.json(result);
    } catch (error) {
      console.error('Erreur stats by-sector:', error);
      res.status(500).json({ message: 'Erreur statistiques secteur' });
    }
  });

  // Statistiques : nombre de conventions par statut
  app.get('/api/conventions/stats/by-status', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const statusCounts: Record<string, number> = {};
      conventions.forEach(c => {
        const status = c.status || 'غير محدد';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const result = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
      res.json(result);
    } catch (error) {
      console.error('Erreur stats by-status:', error);
      res.status(500).json({ message: 'Erreur statistiques statut' });
    }
  });

  // Statistiques : somme des montants par secteur
  app.get('/api/conventions/stats/by-sector-cost', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const sectorAmounts: Record<string, number> = {};
      conventions.forEach(c => {
        const sector = ((c.sector as unknown as string) || 'غير محدد').toString().trim().replace(/\s+/g, ' ');
        const amount = Number(c.amount) || 0;
        sectorAmounts[sector] = (sectorAmounts[sector] || 0) + amount;
      });
      const result = Object.entries(sectorAmounts).map(([sector, amount]) => ({ sector, الكلفة: amount }));
      res.json(result);
    } catch (error) {
      console.error('Erreur stats by-sector-cost:', error);
      res.status(500).json({ message: 'Erreur statistiques montant secteur' });
    }
  });

  // Statistiques : nombre de conventions par domaine
  app.get('/api/conventions/stats/by-domain', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const domainCounts: Record<string, number> = {};
      conventions.forEach(c => {
        const domain = c.domain || 'غير محدد';
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      });
      const result = Object.entries(domainCounts).map(([domain, count]) => ({ domain, count }));
      res.json(result);
    } catch (error) {
      console.error('Erreur stats by-domain:', error);
      res.status(500).json({ message: 'Erreur statistiques المجال' });
    }
  });

  // Statistiques : nombre de conventions par العمالة/الإقليم (province)
  app.get('/api/conventions/stats/by-province', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const provinceCounts: Record<string, number> = {};
      conventions.forEach(c => {
        let provinces = c.province || [];
        if (typeof provinces === 'string') {
          try {
            provinces = JSON.parse(provinces);
          } catch {
            provinces = provinces.split(',').map((p: string) => p.trim());
          }
        }
        if (!Array.isArray(provinces)) provinces = [String(provinces)];
        (provinces as string[]).forEach((prov: string) => {
          if (!prov) return;
          provinceCounts[prov] = (provinceCounts[prov] || 0) + 1;
        });
      });
      const result = Object.entries(provinceCounts).map(([province, count]) => ({ province, count }));
      res.json(result);
    } catch (error) {
      console.error('Erreur stats by-province:', error);
      res.status(500).json({ message: 'Erreur statistiques العمالة/الإقليم' });
    }
  });

  // Statistiques : nombre de conventions par année
  app.get('/api/conventions/stats/by-year', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const yearCounts: Record<string, number> = {};
      conventions.forEach(c => {
        const year = c.year || 'غير محدد';
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      });
      const result = Object.entries(yearCounts).map(([year, count]) => ({ year, العدد:count }));
      res.json(result);
    } catch (error) {
      console.error('Erreur stats by-year:', error);
      res.status(500).json({ message: 'Erreur statistiques السنة' });
    }
  });

  // Statistiques : nombre de conventions par programme
  app.get('/api/conventions/stats/by-programme', requireAuth, async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const programmeCounts: Record<string, number> = {};
      conventions.forEach(c => {
        const programme = c.programme || 'غير محدد';
        programmeCounts[programme] = (programmeCounts[programme] || 0) + 1;
      });
      const result = Object.entries(programmeCounts).map(([programme, count]) => ({ programme, count }));
      res.json(result);
    } catch (error) {
      console.error('Erreur stats by-programme:', error);
      res.status(500).json({ message: 'Erreur statistiques البرنامج' });
    }
  });

  // Financial contributions routes
  app.get("/api/conventions/:conventionId/financial-contributions", requireAuth, async (req, res) => {
    try {
      const { conventionId } = req.params;
      const contributions = await storage.getFinancialContributionsByConvention(parseInt(conventionId));
      res.json(contributions);
    } catch (error) {
      console.error("Error fetching financial contributions:", error);
      res.status(500).json({ message: "خطأ في استرجاع المساهمات المالية" });
    }
  });

  app.post("/api/conventions/:conventionId/financial-contributions", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const { conventionId } = req.params;
      const contributionData = insertFinancialContributionSchema.parse({
        ...req.body,
        conventionId: parseInt(conventionId)
      });
      const contribution = await storage.createFinancialContribution(contributionData);
      res.status(201).json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating financial contribution:", error);
      res.status(500).json({ message: "خطأ في إنشاء المساهمة المالية" });
    }
  });

  app.put("/api/financial-contributions/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const { id } = req.params;
      const contributionData = insertFinancialContributionSchema.partial().parse(req.body);
      const contribution = await storage.updateFinancialContribution(parseInt(id), contributionData);
      
      if (!contribution) {
        return res.status(404).json({ message: "المساهمة المالية غير موجودة" });
      }
      
      res.json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating financial contribution:", error);
      res.status(500).json({ message: "خطأ في تحديث المساهمة المالية" });
    }
  });

  app.delete("/api/financial-contributions/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFinancialContribution(parseInt(id));
      res.json({ message: "تم حذف المساهمة المالية بنجاح" });
    } catch (error) {
      console.error("Error deleting financial contribution:", error);
      res.status(500).json({ message: "خطأ في حذف المساهمة المالية" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
