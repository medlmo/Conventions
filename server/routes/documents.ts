import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";

export function createDocumentsRouter(): Router {
  const router = Router();

  // GET /api/conventions/:id/download — Word document
  router.get("/:id/download", requireAuth, async (req, res) => {
    try {
      const conventionId = parseInt(req.params.id);
      const convention = await storage.getConvention(conventionId);

      if (!convention) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }

      const dateFr = new Date(convention.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const formatMad = (value: unknown): string => {
        if (value === null || value === undefined || value === "") return "غير محدد";
        const n = typeof value === "number" ? value : Number(String(value));
        if (!Number.isFinite(n)) return String(value);
        return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.م`;
      };

      const fields = [
        ["رقم الاتفاقية", convention.conventionNumber || "غير محدد"],
        ["التاريخ", dateFr],
        ["السنة", convention.year || "غير محدد"],
        ["الدورة", convention.session || "غير محدد"],
        ["المجال", convention.domain || "غير محدد"],
        ["القطاع", convention.sector || "غير محدد"],
        ["رقم المقرر", convention.decisionNumber || "غير محدد"],
        ["الحالة", convention.status || "غير محدد"],
        ["الكلفة الإجمالية", formatMad(convention.amount)],
        ["مساهمة الجهة", formatMad(convention.contribution)],
        [
          "صاحب المشروع",
          convention.contractor || "غير محدد",
        ],
        [
          "صاحب المشروع المنتدب",
          Array.isArray(convention.delegatedProjectOwner)
            ? convention.delegatedProjectOwner.join(", ")
            : convention.delegatedProjectOwner || "غير محدد",
        ],
        ["نوعية التنفيذ", convention.executionType || "غير محدد"],
        ["سريان الإتفاقية", convention.validity || "غير محدد"],
        ["الاختصاص", convention.jurisdiction || "غير محدد"],
        [
          "العمالة/الإقليم",
          Array.isArray(convention.province) && convention.province.length > 0
            ? convention.province.join(", ")
            : "غير محدد",
        ],
        [
          "الشركاء",
          Array.isArray(convention.partners) && convention.partners.length > 0
            ? convention.partners.join(", ")
            : "غير محدد",
        ],
        ["البرنامج", convention.programme || "غير محدد"],
      ];

      const {
        Document,
        Paragraph,
        TextRun,
        Packer,
        Table,
        TableRow,
        TableCell,
        AlignmentType,
        WidthType,
        BorderStyle,
        ShadingType,
        VerticalAlign,
        convertInchesToTwip,
      } = await import("docx");

      const BLUE_DARK = "1A3C5E";
      const BLUE_MID = "2E6DA4";
      const BLUE_LIGHT = "D6E8F7";
      const GRAY_LIGHT = "F4F7FB";
      const WHITE = "FFFFFF";
      const BORDER_COLOR = "B0C8E0";

      const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
      const tableBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR };

      const makeCell = (
        text: string,
        opts: { bold?: boolean; bg?: string; color?: string; width?: number; size?: number; italic?: boolean } = {}
      ) =>
        new TableCell({
          width: opts.width !== undefined ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg, fill: opts.bg } : undefined,
          margins: {
            top: convertInchesToTwip(0.04),
            bottom: convertInchesToTwip(0.04),
            left: convertInchesToTwip(0.1),
            right: convertInchesToTwip(0.1),
          },
          borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              children: [
                new TextRun({
                  text,
                  bold: opts.bold ?? false,
                  italics: opts.italic ?? false,
                  size: opts.size ?? 22,
                  font: "Arial",
                  color: opts.color ?? "2C3E50",
                  rightToLeft: true,
                }),
              ],
            }),
          ],
        });

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: convertInchesToTwip(0.8),
                  bottom: convertInchesToTwip(0.8),
                  left: convertInchesToTwip(0.9),
                  right: convertInchesToTwip(0.9),
                },
              },
            },
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: noBorder,
                  bottom: noBorder,
                  left: noBorder,
                  right: noBorder,
                  insideHorizontal: noBorder,
                  insideVertical: noBorder,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { type: ShadingType.SOLID, color: BLUE_DARK, fill: BLUE_DARK },
                        margins: {
                          top: convertInchesToTwip(0.15),
                          bottom: convertInchesToTwip(0.15),
                          left: convertInchesToTwip(0.2),
                          right: convertInchesToTwip(0.2),
                        },
                        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            bidirectional: true,
                            children: [
                              new TextRun({
                                text: "بطاقة الاتفاقية",
                                bold: true,
                                size: 40,
                                font: "Arial",
                                color: WHITE,
                                rightToLeft: true,
                              }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            bidirectional: true,
                            children: [
                              new TextRun({
                                text: `رقم الاتفاقية: ${convention.conventionNumber || "غير محدد"}`,
                                size: 22,
                                font: "Arial",
                                color: "B8D4EE",
                                rightToLeft: true,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({ spacing: { after: 240 }, children: [] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: "موضوع الاتفاقية",
                    bold: true,
                    size: 26,
                    font: "Arial",
                    color: BLUE_MID,
                    rightToLeft: true,
                  }),
                ],
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: noBorder,
                  bottom: noBorder,
                  left: noBorder,
                  right: noBorder,
                  insideHorizontal: noBorder,
                  insideVertical: noBorder,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { type: ShadingType.SOLID, color: GRAY_LIGHT, fill: GRAY_LIGHT },
                        margins: {
                          top: convertInchesToTwip(0.1),
                          bottom: convertInchesToTwip(0.1),
                          left: convertInchesToTwip(0.15),
                          right: convertInchesToTwip(0.15),
                        },
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 6, color: BLUE_MID },
                          bottom: tableBorder,
                          left: tableBorder,
                          right: { style: BorderStyle.SINGLE, size: 6, color: BLUE_MID },
                        },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            bidirectional: true,
                            children: [
                              new TextRun({
                                text: convention.description || "غير محدد",
                                size: 23,
                                font: "Arial",
                                color: "2C3E50",
                                rightToLeft: true,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({ spacing: { after: 240 }, children: [] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: "تفاصيل الاتفاقية",
                    bold: true,
                    size: 26,
                    font: "Arial",
                    color: BLUE_MID,
                    rightToLeft: true,
                  }),
                ],
              }),
              new Table({
                alignment: AlignmentType.CENTER,
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: tableBorder,
                  bottom: tableBorder,
                  left: tableBorder,
                  right: tableBorder,
                  insideHorizontal: tableBorder,
                  insideVertical: tableBorder,
                },
                rows: fields.map(([label, value], idx) =>
                  new TableRow({
                    children: [
                      makeCell(String(value), { bg: idx % 2 === 0 ? WHITE : GRAY_LIGHT, width: 60 }),
                      makeCell(String(label), { bold: true, bg: idx % 2 === 0 ? BLUE_LIGHT : "C5DDF0", width: 40 }),
                    ],
                  })
                ),
              }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      const safeConventionNumber = String(convention.conventionNumber).replace(/[^a-zA-Z0-9-_]/g, "_");
      const asciiFallback = `convention_${safeConventionNumber}.docx`;
      const utf8Filename = `اتفاقية_${safeConventionNumber}.docx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`
      );
      res.send(buffer);
    } catch (error) {
      console.error("Error generating Word document:", error);
      res.status(500).json({ message: "خطأ في إنشاء ملف Word" });
    }
  });

  // GET /api/conventions/export/excel
  router.get("/export/excel", requireAuth, async (_req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Conventions");

      worksheet.columns = [
        { header: "رقم الاتفاقية", key: "conventionNumber", width: 15 },
        { header: "التاريخ", key: "date", width: 15 },
        { header: "السنة", key: "year", width: 10 },
        { header: "الدورة", key: "session", width: 12 },
        { header: "الاتفاقية", key: "description", width: 50 },
        { header: "المجال", key: "domain", width: 15 },
        { header: "القطاع", key: "sector", width: 20 },
        { header: "رقم المقرر", key: "decisionNumber", width: 18 },
        { header: "الحالة", key: "status", width: 12 },
        { header: "الكلفة الإجمالية", key: "amount", width: 15 },
        { header: "مساهمة الجهة", key: "contribution", width: 15 },
        { header: "صاحب المشروع", key: "contractor", width: 20 },
        { header: "صاحب المشروع المنتدب", key: "delegatedProjectOwner", width: 25 },
        { header: "نوعية التنفيذ", key: "executionType", width: 18 },
        { header: "سريان الإتفاقية", key: "validity", width: 18 },
        { header: "الاختصاص", key: "jurisdiction", width: 12 },
        { header: "البرنامج", key: "programme", width: 18 },
        { header: "العمالة/الإقليم", key: "province", width: 20 },
        { header: "الشركاء", key: "partners", width: 50 },
      ];

      conventions.forEach((c) => {
        worksheet.addRow({
          conventionNumber: c.conventionNumber,
          date: c.date ? new Date(c.date).toLocaleDateString("fr-FR") : "",
          year: c.year,
          session: c.session,
          domain: c.domain,
          sector: c.sector,
          decisionNumber: c.decisionNumber,
          status: c.status,
          amount: c.amount,
          contribution: c.contribution,
          contractor: c.contractor,
          delegatedProjectOwner: Array.isArray(c.delegatedProjectOwner)
            ? c.delegatedProjectOwner.join(", ")
            : c.delegatedProjectOwner || "",
          executionType: c.executionType,
          programme: c.programme,
          province: Array.isArray(c.province) ? c.province.join(", ") : c.province,
          partners: Array.isArray(c.partners) ? c.partners.join(", ") : c.partners,
          description: c.description,
          validity: c.validity,
          jurisdiction: c.jurisdiction,
        });
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="conventions.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Erreur export Excel:", error);
      res.status(500).json({ message: "Erreur lors de l'export Excel" });
    }
  });

  return router;
}
