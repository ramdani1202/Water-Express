/* =========================================================
   Water Express - PDF Generator
   Invoice & Surat Jalan, tema biru profesional.
   ========================================================= */

const PDF_BLUE = [11, 79, 158];
const PDF_BLUE_DEEP = [10, 47, 92];
const PDF_BLUE_SOFT = [234, 243, 254];
const PDF_INK = [30, 41, 59];
const PDF_INK_SOFT = [100, 116, 139];
const PDF_LINE = [217, 228, 242];
const PDF_AMBER = [245, 166, 35];

function pdfHeader(doc, title, docNumber, tanggalLabel){
  const meta = DB.get().meta;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top band
  doc.setFillColor(...PDF_BLUE_DEEP);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Logo mark
  doc.setFillColor(...PDF_BLUE);
  doc.circle(24, 28, 11, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.text('W', 24, 32, {align:'center'});

  // Company name
  doc.setTextColor(...PDF_BLUE_DEEP);
  doc.setFont('helvetica','bold');
  doc.setFontSize(15);
  doc.text(meta.companyName || 'Depot Air Galon Water Express', 42, 25);

  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_INK_SOFT);
  doc.text(meta.companyAddress || '', 42, 31);
  doc.text('HP: ' + (meta.companyPhone || ''), 42, 36);

  // Doc title box (right)
  doc.setFillColor(...PDF_BLUE_SOFT);
  doc.roundedRect(pageWidth-70, 16, 56, 24, 2, 2, 'F');
  doc.setTextColor(...PDF_BLUE_DEEP);
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  doc.text(title, pageWidth-42, 24, {align:'center'});
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_INK_SOFT);
  doc.text('No: ' + docNumber, pageWidth-42, 30, {align:'center'});
  doc.text(tanggalLabel, pageWidth-42, 35.5, {align:'center'});

  // Divider
  doc.setDrawColor(...PDF_LINE);
  doc.setLineWidth(0.5);
  doc.line(14, 44, pageWidth-14, 44);

  return 52; // y cursor after header
}

function pdfFooter(doc){
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...PDF_LINE);
  doc.setLineWidth(0.4);
  doc.line(14, pageHeight-18, pageWidth-14, pageHeight-18);
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_INK_SOFT);
  doc.text('Dokumen ini dibuat otomatis oleh sistem Water Express', 14, pageHeight-12);
  doc.text('Terima kasih atas kepercayaan Anda', pageWidth-14, pageHeight-12, {align:'right'});
}

/* ---------------------------------------------------------
   INVOICE PDF
   --------------------------------------------------------- */
function generateInvoicePDF(invoiceRecord, ptName){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'mm', format:'a4'});
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = pdfHeader(doc, 'INVOICE', invoiceRecord.nomor, formatTanggalPanjang(invoiceRecord.tanggal));

  // Billed to
  doc.setFont('helvetica','bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_INK);
  doc.text('Ditagihkan kepada:', 14, y);
  doc.setFont('helvetica','bold');
  doc.setFontSize(12);
  doc.setTextColor(...PDF_BLUE_DEEP);
  doc.text(ptName, 14, y+7);

  y += 16;

  // Table
  const rows = invoiceRecord.items.map(it => [
    formatTanggalSingkat(it.tanggal),
    it.produkNama,
    String(it.jumlah),
    formatRupiah(it.harga),
    formatRupiah(it.subtotal),
  ]);

  doc.autoTable({
    startY: y,
    head: [['Tanggal', 'Produk', 'Jumlah', 'Harga Satuan', 'Subtotal']],
    body: rows,
    theme: 'plain',
    styles:{ font:'helvetica', fontSize:9, textColor: PDF_INK, cellPadding:{top:3.2,bottom:3.2,left:3,right:3}, lineColor: PDF_LINE, lineWidth:0.3 },
    headStyles:{ fillColor: PDF_BLUE_DEEP, textColor:255, fontStyle:'bold', fontSize:9 },
    alternateRowStyles:{ fillColor: [247,250,254] },
    columnStyles:{
      0:{cellWidth:26},
      2:{cellWidth:20, halign:'center'},
      3:{cellWidth:32, halign:'right'},
      4:{cellWidth:32, halign:'right'},
    },
    margin:{left:14, right:14},
  });

  let finalY = doc.lastAutoTable.finalY + 6;

  // Total box
  const total = invoiceRecord.total;
  doc.setFillColor(...PDF_BLUE_SOFT);
  doc.roundedRect(pageWidth-84, finalY, 70, 16, 2, 2, 'F');
  doc.setFont('helvetica','normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_INK_SOFT);
  doc.text('Total Tagihan', pageWidth-79, finalY+6.5);
  doc.setFont('helvetica','bold');
  doc.setFontSize(13);
  doc.setTextColor(...PDF_BLUE_DEEP);
  doc.text(formatRupiah(total), pageWidth-19, finalY+12.5, {align:'right'});

  finalY += 30;

  // Payment note + signature
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_INK_SOFT);
  doc.text('Mohon pembayaran dilakukan sesuai kesepakatan kerja sama.', 14, finalY);

  const sigY = finalY + 10;
  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_INK);
  doc.text('Hormat kami,', pageWidth-60, sigY, {align:'center'});
  doc.text('_____________________', pageWidth-60, sigY+22, {align:'center'});
  doc.text('Water Express', pageWidth-60, sigY+27, {align:'center'});

  pdfFooter(doc);
  doc.save(`Invoice-${invoiceRecord.nomor}-${ptName.replace(/\s+/g,'_')}.pdf`);
}

/* ---------------------------------------------------------
   SURAT JALAN PDF
   --------------------------------------------------------- */
function generateSuratJalanPDF(sjRecord, karyawanNama, ptName, opts){
  opts = opts || {};
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'mm', format:'a4'});
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = pdfHeader(doc, 'SURAT JALAN', sjRecord.nomor, formatTanggalPanjang(sjRecord.tanggal));

  // Info row: pengantar & tujuan
  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_INK);
  doc.text('Dikirim oleh:', 14, y);
  doc.text('Tujuan:', 110, y);

  doc.setFont('helvetica','bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...PDF_BLUE_DEEP);
  doc.text(karyawanNama, 14, y+6.5);
  doc.text(ptName, 110, y+6.5);

  y += 16;

  const rows = sjRecord.items.map((it,i) => [String(i+1), it.produkNama, String(it.jumlah), it.satuan||'']);

  doc.autoTable({
    startY: y,
    head: [['No', 'Nama Produk', 'Jumlah', 'Satuan']],
    body: rows,
    theme: 'plain',
    styles:{ font:'helvetica', fontSize:9.5, textColor: PDF_INK, cellPadding:{top:3.5,bottom:3.5,left:3,right:3}, lineColor: PDF_LINE, lineWidth:0.3 },
    headStyles:{ fillColor: PDF_BLUE_DEEP, textColor:255, fontStyle:'bold', fontSize:9.5 },
    alternateRowStyles:{ fillColor: [247,250,254] },
    columnStyles:{
      0:{cellWidth:14, halign:'center'},
      2:{cellWidth:28, halign:'center'},
      3:{cellWidth:28, halign:'center'},
    },
    margin:{left:14, right:14},
  });

  let finalY = doc.lastAutoTable.finalY + 8;

  if(sjRecord.catatan){
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_INK);
    doc.text('Catatan:', 14, finalY);
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_INK_SOFT);
    const noteLines = doc.splitTextToSize(sjRecord.catatan, pageWidth-28);
    doc.text(noteLines, 14, finalY+5.5);
    finalY += 5.5 + noteLines.length*4.6 + 6;
  }

  // Signature blocks
  const sigTop = Math.max(finalY+10, 210);
  const colW = (pageWidth-28)/2;

  [['Pengirim', 14], ['Penerima', 14+colW]].forEach(([label, x])=>{
    doc.setFont('helvetica','bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_INK);
    doc.text(label, x, sigTop);
    doc.setDrawColor(...PDF_LINE);
    doc.setLineWidth(0.4);
    doc.rect(x, sigTop+4, colW-10, 28);
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_INK_SOFT);
    doc.text('Nama & Tanda Tangan', x+3, sigTop+36);
  });

  pdfFooter(doc);

  if(opts.printDirect){
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(`SuratJalan-${sjRecord.nomor}-${ptName.replace(/\s+/g,'_')}.pdf`);
  }
}
