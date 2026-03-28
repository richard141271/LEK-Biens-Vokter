import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export async function generateHiveLabelsPDF(hivesToPrint: any[]) {
  const doc = new jsPDF();
  const cols = 3;
  const rows = 8;
  const labelWidth = 70;
  const labelHeight = 37;
  const startX = 0;
  const startY = 0;
  const sheetOffsetY = 2;
  const leftColumnOffsetX = 2;
  const rightColumnOffsetX = -2;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  for (let i = 0; i < hivesToPrint.length; i++) {
    const hive = hivesToPrint[i];
    const indexOnPage = i % (cols * rows);

    if (i > 0 && indexOnPage === 0) {
      doc.addPage();
    }

    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);

    const columnOffsetX = col === 0 ? leftColumnOffsetX : col === 2 ? rightColumnOffsetX : 0;
    const x = startX + col * labelWidth + columnOffsetX;
    const y = startY + row * labelHeight + sheetOffsetY;

    doc.setDrawColor(210, 180, 140);
    doc.setLineWidth(0.2);
    doc.rect(x + 1.5, y + 1.5, labelWidth - 3, labelHeight - 3);

    const qrUrl = `${origin}/hives/${hive?.id}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 0, width: 256, errorCorrectionLevel: 'H' });

    doc.addImage(qrDataUrl, 'PNG', x + labelWidth - 32, y + 3.5, 30, 30);

    const textX = x + 4;
    const maxTextWidth = labelWidth - 34;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text('LEK-BIENS VOKTER', textX, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(String(hive?.hive_number || ''), textX, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const hiveName = String(hive?.name || '');
    const hiveNameLines = doc.splitTextToSize(hiveName, maxTextWidth);
    const hiveNameLine = Array.isArray(hiveNameLines) ? hiveNameLines[0] : hiveName;
    doc.text(hiveNameLine || '', textX, y + 20);

    const apiaryName = String(hive?.apiaries?.name || hive?.apiary?.name || 'Ukjent Bigård');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38);
    const apiaryLines = doc.splitTextToSize(apiaryName, maxTextWidth);
    const clippedApiaryLines = Array.isArray(apiaryLines) ? apiaryLines.slice(0, 2) : [apiaryName];
    doc.text(clippedApiaryLines, textX, y + 26);
  }

  doc.save(`bikube_etiketter_${new Date().toISOString().split('T')[0]}.pdf`);
}
