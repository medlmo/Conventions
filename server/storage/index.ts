import type { SafeUser, UpsertUser, CreateUser, Convention, InsertConvention, FinancialContribution, InsertFinancialContribution, AdministrativeEvent, InsertAdministrativeEvent } from "@shared/schema";

import * as userOps        from "./users";
import * as conventionOps  from "./conventions";
import * as statsOps       from "./stats";
import * as financialOps   from "./financials";
import * as eventOps       from "./events";

// ---------------------------------------------------------------------------
// Storage interface
// ---------------------------------------------------------------------------

export interface IStorage {
  // Users
  getUser(id: string): Promise<SafeUser | undefined>;
  getUserByUsername(username: string): Promise<SafeUser | undefined>;
  upsertUser(user: UpsertUser): Promise<SafeUser>;
  createUser(user: CreateUser): Promise<SafeUser>;
  /** Update profile fields only — role excluded. Use setUserRole() for role changes. */
  updateUser(id: string, user: Omit<Partial<UpsertUser>, "role">): Promise<SafeUser | undefined>;
  /** Explicit, auditable role change — separate from general profile updates. */
  setUserRole(id: string, role: string): Promise<SafeUser | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<SafeUser[]>;
  validateUser(username: string, password: string): Promise<SafeUser | null>;

  // Conventions
  getAllConventions(): Promise<Convention[]>;
  getConventions(filters?: {
    search?: string;
    status?: string;
    sector?: string;
    programme?: string;
    domain?: string;
    limit?: number;
    offset?: number;
  }): Promise<Convention[]>;
  getConvention(id: number): Promise<Convention | undefined>;
  createConvention(data: InsertConvention, createdBy: string): Promise<Convention>;
  updateConvention(id: number, data: Partial<InsertConvention>): Promise<Convention | undefined>;
  deleteConvention(id: number): Promise<boolean>;
  getConventionsByStatus(status: string): Promise<Convention[]>;
  getConventionsByDateRange(fromDate: string, toDate: string): Promise<Convention[]>;

  // Stats
  getGlobalStats(): Promise<{ total: number; signed: number; signature: number; visa: number; visee: number; totalValue: number }>;
  getStatsByStatus(): Promise<Array<{ status: string; count: number }>>;
  getStatsBySector(): Promise<Array<{ sector: string; count: number }>>;
  getStatsBySectorCost(): Promise<Array<{ sector: string; amount: number }>>;
  getStatsByDomain(): Promise<Array<{ domain: string; count: number }>>;
  getStatsByYear(): Promise<Array<{ year: string; count: number }>>;
  getStatsByProgramme(): Promise<Array<{ programme: string; count: number }>>;
  getStatsByProvince(): Promise<Array<{ province: string; count: number }>>;

  // Financial contributions
  getFinancialContributionsByConvention(conventionId: number): Promise<FinancialContribution[]>;
  createFinancialContribution(data: InsertFinancialContribution): Promise<FinancialContribution>;
  updateFinancialContribution(id: number, data: Partial<InsertFinancialContribution>): Promise<FinancialContribution | undefined>;
  deleteFinancialContribution(id: number): Promise<boolean>;

  // Administrative events
  getAdministrativeEventsByConvention(conventionId: number): Promise<AdministrativeEvent[]>;
  createAdministrativeEvent(data: InsertAdministrativeEvent): Promise<AdministrativeEvent>;
  updateAdministrativeEvent(id: number, data: Partial<InsertAdministrativeEvent>): Promise<AdministrativeEvent | undefined>;
  deleteAdministrativeEvent(id: number): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Implementation — delegates to domain modules
// ---------------------------------------------------------------------------

class DatabaseStorage implements IStorage {
  // Users
  getUser              = userOps.getUser;
  getUserByUsername    = userOps.getUserByUsername;
  upsertUser           = userOps.upsertUser;
  createUser           = userOps.createUser;
  updateUser           = userOps.updateUser;
  setUserRole          = userOps.setUserRole;
  deleteUser           = userOps.deleteUser;
  getAllUsers           = userOps.getAllUsers;
  validateUser         = userOps.validateUser;

  // Conventions
  getAllConventions        = conventionOps.getAllConventions;
  getConventions          = conventionOps.getConventions;
  getConvention           = conventionOps.getConvention;
  createConvention        = conventionOps.createConvention;
  updateConvention        = conventionOps.updateConvention;
  deleteConvention        = conventionOps.deleteConvention;
  getConventionsByStatus  = conventionOps.getConventionsByStatus;
  getConventionsByDateRange = conventionOps.getConventionsByDateRange;

  // Stats
  getGlobalStats       = statsOps.getGlobalStats;
  getStatsByStatus     = statsOps.getStatsByStatus;
  getStatsBySector     = statsOps.getStatsBySector;
  getStatsBySectorCost = statsOps.getStatsBySectorCost;
  getStatsByDomain     = statsOps.getStatsByDomain;
  getStatsByYear       = statsOps.getStatsByYear;
  getStatsByProgramme  = statsOps.getStatsByProgramme;
  getStatsByProvince   = statsOps.getStatsByProvince;

  // Financial contributions
  getFinancialContributionsByConvention = financialOps.getFinancialContributionsByConvention;
  createFinancialContribution           = financialOps.createFinancialContribution;
  updateFinancialContribution           = financialOps.updateFinancialContribution;
  deleteFinancialContribution           = financialOps.deleteFinancialContribution;

  // Administrative events
  getAdministrativeEventsByConvention = eventOps.getAdministrativeEventsByConvention;
  createAdministrativeEvent           = eventOps.createAdministrativeEvent;
  updateAdministrativeEvent           = eventOps.updateAdministrativeEvent;
  deleteAdministrativeEvent           = eventOps.deleteAdministrativeEvent;
}

export const storage: IStorage = new DatabaseStorage();
