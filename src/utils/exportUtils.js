// Helper to load image as base64
async function getBase64ImageFromUrl(imageUrl) {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to load image'));
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        return null;
    }
}

// Generate a full business report PDF
export async function generateBusinessReport(summary, trends, categories) {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF();
    
    const primaryColor = [63, 81, 181]; // SupplyNest Indigo
    
    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SupplyNest Business Report', 20, 30);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 38);
    
    // Summary Section
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text('Key Performance Indicators', 20, 55);
    
    const summaryData = [
        ['Total Revenue', `₹${summary.total_revenue.toLocaleString()}`],
        ['Total Orders', summary.total_orders.toString()],
        ['Total Profit', `₹${summary.total_profit.toLocaleString()}`],
        ['Best Selling Product', summary.best_product],
        ['Most Active Customer', summary.best_customer]
    ];
    
    doc.autoTable({
        startY: 60,
        body: summaryData,
        theme: 'striped',
        styles: { fontSize: 11, cellPadding: 5 }
    });
    
    // Monthly Trends Section
    let currentY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Monthly Revenue Trends', 20, currentY);
    
    const trendRows = trends.monthly.map(t => [t.month, `₹${t.revenue.toLocaleString()}`, t.orders]);
    
    doc.autoTable({
        startY: currentY + 5,
        head: [['Month', 'Revenue', 'Orders']],
        body: trendRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor }
    });

    // Category Section
    currentY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text('Sales by Category', 20, currentY);
    
    const categoryRows = categories.map(c => [c.category, `₹${c.sales.toLocaleString()}`]);
    
    doc.autoTable({
        startY: currentY + 5,
        head: [['Category', 'Total Sales']],
        body: categoryRows,
        theme: 'plain',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] }
    });
    
    doc.save(`SupplyNest_Business_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Generate Staff Performance PDF Report
export function generateStaffPerformanceReport(staffs = [], performance = []) {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF();
    const primaryColor = [63, 81, 181];

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SupplyNest Staff Performance Report', 20, 24);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 32);

    const rows = staffs.map((s) => {
        const p = performance.find((x) => x.staff_id === s.id) || {};
        return [
            s.name || '—',
            s.username || '—',
            s.email || '—',
            (p.total_orders || 0).toString(),
            `₹${Number(p.total_sales_amount || 0).toLocaleString()}`,
            (p.total_payments || 0).toString(),
            p.last_updated ? new Date(p.last_updated).toLocaleDateString() : '—'
        ];
    });

    doc.autoTable({
        startY: 40,
        head: [['Staff Name', 'Username', 'Email', 'Orders', 'Sales', 'Payments', 'Last Updated']],
        body: rows.length ? rows : [['—', '—', '—', '0', '₹0', '0', '—']],
        theme: 'grid',
        headStyles: { fillColor: primaryColor },
        styles: { fontSize: 10, cellPadding: 3 }
    });

    doc.save(`SupplyNest_Staff_Performance_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Generate Invoice PDF
export async function generateInvoice(order, customer, product) {
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF();
    
    // Load Logo
    const logoBase64 = await getBase64ImageFromUrl('/assets/logo.png');
    
    const primaryColor = [96, 142, 132]; // Teal/Sage from template image
    const secondaryColor = [100, 100, 100];
    
    // --- 1. Top Header Section ---
    // Left: Company Info
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text('SupplyNest', 20, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('No.57, Shanthi Nagar, Madhavaram', 20, 26);
    doc.text('Chennai - 600060', 20, 31);
    doc.text('8925136089', 20, 36);
    doc.text('supplynest@gmail.com', 20, 41);
    doc.text('www.supplynest.com', 20, 46);
    
    // Right: Logo
    if (logoBase64) {
        // Logo in a box like the template
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.1);
        doc.rect(140, 15, 50, 25);
        doc.addImage(logoBase64, 'PNG', 152, 17, 25, 21);
    }
    
    // --- 2. Title Section ---
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('INVOICE', 190, 65, { align: 'right' });
    
    // --- 3. Billing & Invoice Info ---
    // Left: Bill To
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Bill To', 20, 80);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(customer?.name || 'Walk-in Customer', 20, 88);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(customer?.address || 'Customer Address Not Provided', 20, 93);
    doc.text(customer?.phone || '', 20, 98);
    
    // Right: Invoice Metadata
    const metaX = 140;
    const valueX = 190;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    
    doc.text('Invoice #', metaX, 80);
    doc.text('Invoice date', metaX, 88);
    doc.text('Payment mode', metaX, 96);
    doc.text('Placed by', metaX, 104);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(order.id.toString().padStart(7, '0'), valueX, 80, { align: 'right' });
    doc.text(order.date, valueX, 88, { align: 'right' });
    doc.text(order.paymentMethod || 'Cash', valueX, 96, { align: 'right' });
    doc.text(order.staffName || '—', valueX, 104, { align: 'right' });
    
    // --- 4. Items Table ---
    const tableData = [
        [
            '1.00',
            product?.name || 'General Product',
            order.quantity.toString(),
            `₹${product?.price?.toLocaleString() || 0}`,
            `₹${order.total?.toLocaleString() || 0}`
        ]
    ];
    
    doc.autoTable({
        startY: 116,
        head: [['QTY', 'Description', 'Unit Price', 'Discount', 'Amount']],
        body: [
            [
                order.quantity.toFixed(2),
                product?.name || 'Product',
                product?.price?.toFixed(2) || '0.00',
                `${order.discount}%`,
                `₹${order.total?.toLocaleString() || 0}`
            ]
        ],
        theme: 'plain',
        headStyles: { 
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: { 
            fontSize: 10, 
            cellPadding: 4,
            lineColor: [240, 240, 240],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 20 },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
        }
    });
    
    let currentY = doc.lastAutoTable.finalY + 10;
    
    // --- 5. Calculation Summary ---
    const summaryX = 140;
    const summaryValX = 190;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    
    doc.text('Subtotal', summaryX, currentY);
    doc.text(`₹${(product?.price * order.quantity).toLocaleString()}`, summaryValX, currentY, { align: 'right' });
    
    currentY += 8;
    doc.text(`Discount (${order.discount}%)`, summaryX, currentY);
    doc.text(`-₹${(order.discountAmt || 0).toLocaleString()}`, summaryValX, currentY, { align: 'right' });
    
    currentY += 10;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(summaryX, currentY - 5, summaryValX, currentY - 5);
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(12);
    doc.text('Total (INR)', summaryX, currentY);
    doc.text(`₹${order.total?.toLocaleString()}`, summaryValX, currentY, { align: 'right' });
    
    // Bottom border for total like in template
    doc.setLineWidth(1);
    doc.line(summaryX, currentY + 2, summaryValX, currentY + 2);
    
    // --- 6. Footer section (Terms & Conditions) ---
    const footerY = doc.internal.pageSize.height - 40;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Terms and Conditions', 20, footerY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Payment is due in 30 days.', 20, footerY + 6);
    doc.text('Please contact us for any discrepancy in the invoice.', 20, footerY + 11);
    
    doc.save(`Invoice_Order_${order.id}.pdf`);
}

// Export to Excel
export function exportToExcel(data, fileName) {
    try {
        const { utils, writeFile } = window.XLSX;
        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        writeFile(wb, `${fileName}.xlsx`);
    } catch (err) {
        console.error("Excel export failed:", err);
    }
}
