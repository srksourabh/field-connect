import type { SaudiEmployee, GOSICalculation, ESBCalculation, WageFileRecord } from "./types";

const GOSI_OLD_EMPLOYEE_RATE = 0.095;
const GOSI_OLD_EMPLOYER_RATE = 0.02;
const GOSI_NEW_EMPLOYEE_RATE = 0.095;
const GOSI_NEW_EMPLOYER_RATE = 0.02;
const GOSI_CONTRIBUTION_CAP = 45000;

export function calcGOSI(salary: number, system: "old" | "new" | null): GOSICalculation {
  const base = Math.min(salary, GOSI_CONTRIBUTION_CAP);
  if (system === "old") {
    return {
      employeeContribution: Math.round(base * GOSI_OLD_EMPLOYEE_RATE * 100) / 100,
      employerContribution: Math.round(base * GOSI_OLD_EMPLOYER_RATE * 100) / 100,
      total: Math.round(base * (GOSI_OLD_EMPLOYEE_RATE + GOSI_OLD_EMPLOYER_RATE) * 100) / 100,
      contributionBase: base,
    };
  }
  return {
    employeeContribution: Math.round(base * GOSI_NEW_EMPLOYEE_RATE * 100) / 100,
    employerContribution: Math.round(base * GOSI_NEW_EMPLOYER_RATE * 100) / 100,
    total: Math.round(base * (GOSI_NEW_EMPLOYEE_RATE + GOSI_NEW_EMPLOYER_RATE) * 100) / 100,
    contributionBase: base,
  };
}

export function calcESB(
  employee: SaudiEmployee,
  terminationDate: Date,
  isResigned: boolean,
): ESBCalculation {
  const hireDate = new Date(employee.hire_date);
  const totalDays = Math.floor((terminationDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
  const serviceYears = Math.floor(totalDays / 365);
  if (serviceYears < 2) {
    return { amount: 0, serviceYears, baseSalary: employee.salary_basic, isResigned };
  }
  const base = employee.salary_basic;
  const halfDays = 15 * base / 365;
  const fullDays = 30 * base / 365;
  if (isResigned) {
    if (serviceYears < 5) {
      const amount = Math.round(halfDays * totalDays * 0.33 * 100) / 100;
      return { amount, serviceYears, baseSalary: base, isResigned };
    }
    if (serviceYears < 10) {
      const amount = Math.round(halfDays * totalDays * 0.66 * 100) / 100;
      return { amount, serviceYears, baseSalary: base, isResigned };
    }
    const fullAmount = Math.round(halfDays * totalDays * 100) / 100;
    return { amount: fullAmount, serviceYears, baseSalary: base, isResigned };
  }
  if (serviceYears < 5) {
    const amount = Math.round(halfDays * totalDays * 100) / 100;
    return { amount, serviceYears, baseSalary: base, isResigned };
  }
  const firstFiveYears = Math.round(halfDays * 365 * 5);
  const remainingDays = (serviceYears - 5) > 0 ? totalDays - (365 * 5) : 0;
  const remainingAmount = Math.round(fullDays * remainingDays);
  return {
    amount: firstFiveYears + remainingAmount,
    serviceYears,
    baseSalary: base,
    isResigned,
  };
}

export function generateWageFileRecord(emp: SaudiEmployee, gosi: GOSICalculation, iban: string): WageFileRecord {
  return {
    employeeId: emp.id,
    iqamaNumber: emp.iqama_number_enc ?? "",
    fullName: emp.full_name,
    basicSalary: emp.salary_basic,
    housingAllowance: emp.salary_housing,
    transportAllowance: emp.salary_transport,
    grossSalary: emp.salary_basic + emp.salary_housing + emp.salary_transport,
    gosiDeduction: gosi.employeeContribution,
    netSalary: emp.salary_basic + emp.salary_housing + emp.salary_transport - gosi.employeeContribution,
    bankIban: iban,
  };
}

export function calcLeaveDays(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function formatSAR(amount: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function dateStr(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-CA");
}

export function todaySaudi(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
}
