export type GosiOptions = {
  employerRate?: number; // decimal (e.g., 0.12 for 12%)
  employeeRate?: number; // decimal
  employerCap?: number | null; // maximum salary capped for employer contribution
  employeeCap?: number | null; // maximum salary capped for employee contribution
};

export type GosiResult = {
  employerContribution: number;
  employeeContribution: number;
  totalContribution: number;
};

export function calcEndOfServiceBenefit(monthlyBasic: number, totalMonths: number): number {
  if (!monthlyBasic || totalMonths < 24) return 0; // Eligibility: at least 2 years

  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  // Per common ESB patterns: first 5 years → 0.5 month per year; subsequent years → 1 month per year
  const firstPhaseYears = Math.min(years, 5);
  const secondPhaseYears = Math.max(0, years - 5);

  let benefit = 0;
  benefit += firstPhaseYears * 0.5 * monthlyBasic;
  benefit += secondPhaseYears * 1.0 * monthlyBasic;

  // pro-rate remaining months using the current year's rate (0.5 for years < 5 else 1.0)
  const currentYearRate = years < 5 ? 0.5 : 1.0;
  benefit += (remainingMonths / 12) * currentYearRate * monthlyBasic;

  return Math.round((benefit + Number.EPSILON) * 100) / 100;
}

export function calcGosiContribution(baseSalary: number, opts: GosiOptions = {}): GosiResult {
  const employerRate = typeof opts.employerRate === 'number' ? opts.employerRate : 0.12;
  const employeeRate = typeof opts.employeeRate === 'number' ? opts.employeeRate : 0.10;

  const employerCap = opts.employerCap ?? null;
  const employeeCap = opts.employeeCap ?? null;

  const employerBase = employerCap && employerCap > 0 ? Math.min(baseSalary, employerCap) : baseSalary;
  const employeeBase = employeeCap && employeeCap > 0 ? Math.min(baseSalary, employeeCap) : baseSalary;

  const employerContribution = Math.round((employerBase * employerRate + Number.EPSILON) * 100) / 100;
  const employeeContribution = Math.round((employeeBase * employeeRate + Number.EPSILON) * 100) / 100;

  return {
    employerContribution,
    employeeContribution,
    totalContribution: Math.round((employerContribution + employeeContribution + Number.EPSILON) * 100) / 100,
  };
}

export default {
  calcEndOfServiceBenefit,
  calcGosiContribution,
};
