
export const generateFranchiseReportHtml = (report: any, franchiseName: string, ownerName: string) => {
  const { week, year, data, submitted_at } = report;
  const { salesAmount, newCustomers, inventoryStatus, highlights, challenges, plannedActivities } = data;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInventoryStatusLabel = (status: string) => {
    switch (status) {
      case 'good': return '<span class="badge badge-success">God (Grønn)</span>';
      case 'low': return '<span class="badge badge-warning">Lav (Gul)</span>';
      case 'critical': return '<span class="badge badge-danger">Kritisk (Rød)</span>';
      default: return status;
    }
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ukesrapport Uke ${week} - ${year}</title>
        <style>
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
          }
          .header {
            border-bottom: 2px solid #fbbf24;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #d97706;
          }
          .report-title {
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 10px 0;
            color: #1f2937;
          }
          .meta-info {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 40px;
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .metric-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .metric-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            padding: 15px;
            border-radius: 8px;
          }
          .metric-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
          }
          .text-content {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            white-space: pre-wrap;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .badge-success { background: #dcfce7; color: #166534; }
          .badge-warning { background: #fef9c3; color: #854d0e; }
          .badge-danger { background: #fee2e2; color: #991b1b; }
          
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">LEK-Biens Vokter</div>
          <div style="text-align: right;">
            <div>Franchise Portal</div>
          </div>
        </div>

        <h1 class="report-title">Ukesrapport: Uke ${week}, ${year}</h1>
        
        <div class="meta-info">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <strong>Enhet:</strong> ${franchiseName}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <strong>Innsender:</strong> ${ownerName}
          </div>
          <div style="display: flex; justify-content: space-between;">
            <strong>Levert dato:</strong> ${formatDate(submitted_at)}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Nøkkeltall & Drift</div>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-label">Omsetning denne uken</div>
              <div class="metric-value">${Number(salesAmount).toLocaleString('no-NO')} kr</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Nye Kunder / Leads</div>
              <div class="metric-value">${newCustomers}</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Lagerstatus</div>
            <div class="metric-value" style="font-size: 16px; margin-top: 5px;">
              ${getInventoryStatusLabel(inventoryStatus)}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Ukens Høydepunkter</div>
          <div class="text-content">${highlights || 'Ingen kommentarer.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Utfordringer / Behov for bistand</div>
          <div class="text-content">${challenges || 'Ingen kommentarer.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Planer for neste uke</div>
          <div class="text-content">${plannedActivities || 'Ingen kommentarer.'}</div>
        </div>

        <div class="footer">
          Generert fra LEK-Biens Vokter Franchise Portal &bull; ${new Date().toLocaleString('no-NO')}
        </div>
      </body>
    </html>
  `;
};
