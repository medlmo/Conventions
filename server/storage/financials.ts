import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  financialContributions,
  type FinancialContribution,
  type InsertFinancialContribution,
} from "@shared/schema";

export async function getFinancialContributionsByConvention(
  conventionId: number
): Promise<FinancialContribution[]> {
  return await db
    .select()
    .from(financialContributions)
    .where(eq(financialContributions.conventionId, conventionId))
    .orderBy(financialContributions.year, financialContributions.partnerName);
}

export async function createFinancialContribution(
  contributionData: InsertFinancialContribution
): Promise<FinancialContribution> {
  const [contribution] = await db
    .insert(financialContributions)
    .values({
      ...contributionData,
      amountExpected: contributionData.amountExpected ? String(contributionData.amountExpected) : null,
      amountPaid:     contributionData.amountPaid     ? String(contributionData.amountPaid)     : null,
    })
    .returning();
  return contribution;
}

export async function updateFinancialContribution(
  id: number,
  contributionData: Partial<InsertFinancialContribution>
): Promise<FinancialContribution | undefined> {
  const [contribution] = await db
    .update(financialContributions)
    .set({
      ...contributionData,
      amountExpected: contributionData.amountExpected ? String(contributionData.amountExpected) : undefined,
      amountPaid:     contributionData.amountPaid     ? String(contributionData.amountPaid)     : undefined,
      updatedAt: new Date(),
    })
    .where(eq(financialContributions.id, id))
    .returning();
  return contribution;
}

export async function deleteFinancialContribution(id: number): Promise<boolean> {
  const result = await db.delete(financialContributions).where(eq(financialContributions.id, id));
  return (result.rowCount || 0) > 0;
}
