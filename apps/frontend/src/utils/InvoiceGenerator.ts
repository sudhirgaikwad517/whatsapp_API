import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// The Invoice model stores a single GST-inclusive grandTotal, not a line-item
// breakdown — derive a human-readable description from the invoice number's
// prefix (set in invoice.service.ts's createInvoiceRecord) instead.
function describeInvoice(invoiceNumber: string): string {
  if (invoiceNumber?.startsWith('INV-PLAN')) return 'Subscription Plan Purchase';
  if (invoiceNumber?.startsWith('INV-AI')) return 'AI Credits Top-up';
  if (invoiceNumber?.startsWith('INV-USG')) return 'Wallet Recharge';
  return 'Service Charge';
}

export const generateInvoicePdf = (invoice: any, settings: any, organization: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header (Company Settings)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.invoiceCompanyName || 'Platform Company', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const companyInfo = [
    settings?.invoiceAddress || 'Address not provided',
    `CIN: ${settings?.invoiceCin || 'N/A'}`,
    `Email: ${settings?.invoiceEmail || 'N/A'} | Phone: ${settings?.invoicePhone || 'N/A'}`,
    `Website: ${settings?.invoiceWebsite || 'N/A'}`
  ];
  
  let currentY = 28;
  companyInfo.forEach(text => {
    doc.text(text, 14, currentY);
    currentY += 5;
  });

  // 2. Invoice Title & Details
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageWidth - 14, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, pageWidth - 14, 28, { align: 'right' });
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, pageWidth - 14, 33, { align: 'right' });
  doc.text(`Status: ${invoice.status}`, pageWidth - 14, 38, { align: 'right' });

  // 3. Bill To
  currentY += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 14, currentY);
  
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Organization: ${organization.name}`, 14, currentY);
  currentY += 5;
  if (organization.billingEmail) doc.text(`Email: ${organization.billingEmail}`, 14, currentY);
  else if (organization.slug) doc.text(`Account ID: ${organization.slug}`, 14, currentY);
  currentY += 5;
  
  // 4. Line Items Table
  currentY += 10;
  
  const subtotal = Number(invoice.subtotal);
  const tableData = [[
    describeInvoice(invoice.invoiceNumber),
    '1',
    `Rs. ${subtotal.toFixed(2)}`,
    `Rs. ${subtotal.toFixed(2)}`,
  ]];

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Qty', 'Unit Price (Rs)', 'Amount (Rs)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
  });

  // 5. Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.text(`Subtotal: Rs. ${Number(invoice.subtotal).toFixed(2)}`, pageWidth - 14, finalY, { align: 'right' });
  doc.text(`Tax (18% GST): Rs. ${Number(invoice.taxAmount).toFixed(2)}`, pageWidth - 14, finalY + 6, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: Rs. ${Number(invoice.grandTotal).toFixed(2)}`, pageWidth - 14, finalY + 14, { align: 'right' });

  // 6. Footer Notes
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated invoice and does not require a physical signature.', pageWidth / 2, 280, { align: 'center' });

  // Download
  doc.save(`${invoice.invoiceNumber}.pdf`);
};
