import jsPDF from 'jspdf';

// Older invoices (created before the `description` column existed) don't have
// one — derive a fallback from the invoice number's prefix in that case.
function describeInvoice(invoiceNumber: string): string {
  if (invoiceNumber?.startsWith('INV-PLAN')) return 'Subscription Plan Purchase';
  if (invoiceNumber?.startsWith('INV-AI')) return 'AI Credits Top-up';
  if (invoiceNumber?.startsWith('INV-USG')) return 'Credits Purchased via Razorpay';
  return 'Service Charge';
}

function productTypeFor(invoiceNumber: string): string {
  if (invoiceNumber?.startsWith('INV-PLAN')) return 'Subscription Plan';
  if (invoiceNumber?.startsWith('INV-AI')) return 'AI Credits';
  if (invoiceNumber?.startsWith('INV-USG')) return 'Wallet / Messaging Credits';
  return 'Service';
}

function formatGateway(gatewayName?: string): string {
  if (!gatewayName) return 'N/A';
  return gatewayName.charAt(0) + gatewayName.slice(1).toLowerCase();
}

// jsPDF's addImage support for arbitrary source formats (the logo may be a
// compressed WebP from the media-upload pipeline) is inconsistent, so decode
// it via the browser's own image pipeline and re-encode as PNG instead.
async function loadLogoAsPng(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), width: bitmap.width, height: bitmap.height };
  } catch {
    return null;
  }
}

export const generateInvoicePdf = async (invoice: any, settings: any, organization: any) => {
  const logo = settings?.invoiceLogoUrl ? await loadLogoAsPng(settings.invoiceLogoUrl) : null;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const rightX = pageWidth - marginX;
  // Two independent columns — left never has to share a row with the right
  // block, so a long value on one side can never collide with the other
  // (the previous version's bug: a long address on the left sat at the same
  // Y as the right-aligned invoice number and ran straight into it).
  const leftColMaxWidth = pageWidth * 0.52 - marginX;

  let y = 20;

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Tax Invoice for', marginX, y);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  const orgNameLines = doc.splitTextToSize(organization?.name || 'Customer', leftColMaxWidth);
  doc.text(orgNameLines, marginX, y + 7);

  if (logo) {
    // Fit within a fixed box (max 34mm wide, 14mm tall) without distorting
    // the aspect ratio, aligned to the same top-right corner the text mark used.
    const maxW = 34;
    const maxH = 14;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    doc.addImage(logo.dataUrl, 'PNG', rightX - w, y - h + 4, w, h);
  } else {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Prowexa', rightX, y, { align: 'right' });
  }

  y += 7 + orgNameLines.length * 6 + 6;
  doc.setDrawColor(220);
  doc.line(marginX, y, rightX, y);
  y += 10;

  const leftColTop = y;

  // ── Left column: invoice identity fields ────────────────────────────────
  const leftField = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(label, marginX, y);
    y += 5.5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(value || 'N/A', leftColMaxWidth);
    doc.text(lines, marginX, y);
    y += lines.length * 6 + 7;
  };

  leftField('Tax Invoice ID', invoice.invoiceNumber);
  leftField('Description of Service', invoice.description || describeInvoice(invoice.invoiceNumber));
  leftField('Document Date', new Date(invoice.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }));
  leftField('Payment Method', formatGateway(invoice.gatewayName));
  leftField('Transaction ID', invoice.paymentId);
  leftField('Product Type', productTypeFor(invoice.invoiceNumber));

  const leftColBottom = y;

  // ── Right column: status, amount, and totals ────────────────────────────
  let ry = leftColTop;
  const isPaid = invoice.status === 'PAID';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPaid ? 5 : 217, isPaid ? 150 : 119, isPaid ? 105 : 6); // emerald or amber
  doc.text(invoice.status || 'PENDING', rightX, ry, { align: 'right' });
  ry += 10;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text(`Rs. ${Number(invoice.grandTotal).toFixed(2)}`, rightX, ry, { align: 'right' });
  ry += 12;

  doc.setDrawColor(220);
  doc.line(rightX - 70, ry, rightX, ry);
  ry += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text(`Subtotal: Rs. ${Number(invoice.subtotal).toFixed(2)}`, rightX, ry, { align: 'right' });
  ry += 6;
  doc.text(`Tax (18% GST): Rs. ${Number(invoice.taxAmount).toFixed(2)}`, rightX, ry, { align: 'right' });
  ry += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.text('All costs for this transaction.', rightX, ry, { align: 'right' });

  y = Math.max(leftColBottom, ry + 10);

  // ── Bill To ──────────────────────────────────────────────────────────────
  doc.setDrawColor(220);
  doc.line(marginX, y, rightX, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Bill To', marginX, y);
  y += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text(organization?.name || 'Customer', marginX, y);
  y += 6;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  if (organization?.slug) {
    doc.text(`Account ID: ${organization.slug}`, marginX, y);
  }

  // ── Footer (company/legal identity, pinned to the bottom of the page) ──
  const footerTop = pageHeight - 52;
  doc.setDrawColor(220);
  doc.line(marginX, footerTop, rightX, footerTop);

  let fy = footerTop + 7;
  const footerColWidth = pageWidth - marginX * 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20);
  doc.text(settings?.invoiceCompanyName || 'PROWEXA TECHNOLOGIES PRIVATE LIMITED', marginX, fy);
  fy += 5.5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  if (settings?.invoiceAddress) {
    const addrLines = doc.splitTextToSize(settings.invoiceAddress, footerColWidth);
    doc.text(addrLines, marginX, fy);
    fy += addrLines.length * 4.5;
  }
  fy += 2;

  const idBits = [
    settings?.invoiceCin ? `CIN: ${settings.invoiceCin}` : null,
    settings?.invoiceGstin ? `GSTIN: ${settings.invoiceGstin}` : null,
    settings?.invoicePan ? `PAN: ${settings.invoicePan}` : null,
  ].filter(Boolean);
  if (idBits.length > 0) {
    doc.text(idBits.join('   |   '), marginX, fy);
    fy += 4.5;
  }

  const supplyBits = [
    settings?.invoicePlaceOfSupply ? `Place of Supply: ${settings.invoicePlaceOfSupply}` : null,
    settings?.invoiceStateCode ? `State Code: ${settings.invoiceStateCode}` : null,
  ].filter(Boolean);
  if (supplyBits.length > 0) {
    doc.text(supplyBits.join('   |   '), marginX, fy);
    fy += 4.5;
  }

  const contactBits = [
    settings?.invoiceEmail ? `Email: ${settings.invoiceEmail}` : null,
    settings?.invoicePhone ? `Phone: ${settings.invoicePhone}` : null,
    settings?.invoiceWebsite ? `Web: ${settings.invoiceWebsite}` : null,
  ].filter(Boolean);
  if (contactBits.length > 0) {
    doc.text(contactBits.join('   |   '), marginX, fy);
    fy += 4.5;
  }

  fy += 3;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(140);
  doc.text('This is a computer-generated invoice and does not require a physical signature.', marginX, fy);

  doc.save(`${invoice.invoiceNumber}.pdf`);
};
