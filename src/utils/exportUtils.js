/**
 * Utility functions for exporting data to PDF and Excel.
 */

// Generate Invoice PDF
export function generateInvoice(order, customer, product, businessInfo = {}) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const logoBase64 = businessInfo.logo || ''; // Base64 logo
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text(businessInfo.name || 'SUPPLYNEST', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(businessInfo.address || '123 Business Road, Wholesale City', 105, 27, { align: 'center' });
    doc.text(`Contact: ${businessInfo.phone || '+91 9876543210'} | Email: ${businessInfo.email || 'contact@supplynest.com'}`, 105, 33, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);
    
    // Invoice Info
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('PAYMENT INVOICE', 20, 50);
    
    doc.setFontSize(10);
    doc.text(`Order ID: #${order.id}`, 20, 60);
    doc.text(`Date: ${order.date}`, 20, 65);
    doc.text(`Payment Mode: ${order.paymentMethod || 'Cash'}`, 20, 70);
    
    // Customer Info
    doc.setFontSize(12);
    doc.text('Bill To:', 140, 50);
    doc.setFontSize(10);
    doc.text(customer?.name || 'Walk-in Customer', 140, 55);
    doc.text(customer?.phone || '', 140, 60);
    doc.text(customer?.email || '', 140, 65);
    
    // Table
    const tableData = [
        [
            product?.name || 'Product',
            order.quantity.toString(),
            `₹${product?.price?.toLocaleString() || 0}`,
            `${order.discount}%`,
            `₹${order.total?.toLocaleString() || 0}`
        ]
    ];
    
    doc.autoTable({
        startY: 80,
        head: [['Product Details', 'Qty', 'Unit Price', 'Discount', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] },
        styles: { fontSize: 10 }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Amount: ₹${order.total?.toLocaleString() || 0}`, 190, finalY + 10, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Thank you for your business!', 105, finalY + 30, { align: 'center' });
    
    doc.save(`Invoice_Order_${order.id}.pdf`);
}

// Export to Excel
export function exportToExcel(data, fileName) {
    const { utils, writeFile } = window.XLSX;
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    writeFile(wb, `${fileName}.xlsx`);
}
