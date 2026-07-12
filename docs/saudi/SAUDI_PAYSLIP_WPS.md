# Arabic Payslip Template & Sample WPS Export

## Arabic-first Payslip (HTML skeleton / PDF guidance)

- Use RTL layout for the whole payslip container: <div dir="rtl" lang="ar"> and mirror English variant <div dir="ltr" lang="en">.
- Embed an Arabic font that supports Arabic glyph shaping (e.g., "Noto Naskh Arabic","Almarai") and register it with jspdf or PDF library. Avoid browser default fonts for PDF.

HTML skeleton (concept):

<div dir="rtl" lang="ar" style="font-family: Almarai, sans-serif; width: 800px; padding: 24px;">
  <header style="display:flex; justify-content:space-between; align-items:center;">
    <div style="text-align:left">
      <img src="/brands/company-logo.png" alt="logo" style="height:48px;" />
    </div>
    <div style="text-align:center;">
      <h2>قائمة الرواتب / PAYSLIP</h2>
      <div>شهر: {HijriDate} / {GregorianMonthYear}</div>
    </div>
    <div style="text-align:right">
      <div>رقم الموظف: {employee_code}</div>
      <div>الوظيفة: {designation}</div>
    </div>
  </header>

  <section style="margin-top:16px; display:flex; gap:12px;">
    <div style="flex:1;">
      <p><strong>اسم الموظف:</strong> {employee_name_ar} / {employee_name_en}</p>
      <p><strong>الإقامة (Iqama):</strong> {iqama_number} (انتهاء: {iqama_expiry_hijri} / {iqama_expiry_greg})</p>
      <p><strong>الراتب التعاقدي:</strong> SAR {qiwa_contract_salary.toLocaleString()}</p>
    </div>
    <div style="flex:1; text-align:left">
      <p><strong>Bank:</strong> {bank_name} · {bank_iban}</p>
      <p><strong>الحضور:</strong> {working_days} أيام · حاضر: {days_present}</p>
      <p><strong>التحويل الصافي:</strong> SAR {net_payable}</p>
    </div>
  </section>

  <section style="margin-top:18px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
    <div>
      <h4>الأرباح / Earnings</h4>
      <table style="width:100%">{list earning rows}</table>
    </div>
    <div>
      <h4>الخصومات / Deductions</h4>
      <table style="width:100%">{list deduction rows}</table>
    </div>
  </section>

  <footer style="margin-top:18px; display:flex; justify-content:space-between;">
    <div>Prepared by: {prepared_by}</div>
    <div>Signature: ____________</div>
  </footer>
</div>

## Sample WPS Export (CSV schema suggestion)
Columns (recommended):
- company_id
- company_name
- company_bank_iban
- month (YYYY-MM)
- employee_iqama
- employee_name_ar
- employee_name_en
- employee_bank_iban
- contract_salary
- gross_earnings
- deductions
- net_payable
- qiwa_contract_id
- reference (payroll_id)

Example CSV row:
"c7b3...","ACME Saudi LLC","SA4420000001234567890123","2026-06","1234567890","محمد علي","Mohamed Ali","SA4420000009876543210987","5000.00","5000.00","0.00","5000.00","QW-2026-000123","payroll-2026-06-emp-9"

