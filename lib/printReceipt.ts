export interface PrintOrderInfo {
    id: number;
    invoice_number: string;
    created_at: string;
    cashier: string;
    payment_method: string;
    total: number;
    amount_paid: number;
    change_amount: number;
    items: {
        product_name: string;
        quantity: number;
        price: number;
        subtotal: number;
    }[];
}

export const printReceipt = (order: PrintOrderInfo, onComplete?: () => void) => {
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) { 
        console.error('Cannot open print window'); 
        if (onComplete) onComplete();
        return; 
    }

    const items = order.items || [];
    const itemsHtml = items.map(item => `
        <tr>
            <td style="text-align:left;padding:2px 0;font-size:12px">${item.product_name}</td>
            <td style="text-align:center;font-size:12px">${item.quantity}</td>
            <td style="text-align:right;font-size:12px">${item.price.toLocaleString()}</td>
            <td style="text-align:right;font-size:12px">${item.subtotal.toLocaleString()}</td>
        </tr>
    `).join('');

    const invoiceCode = order.invoice_number || `INV-${order.id}`;

    printWindow.document.write(`
<!DOCTYPE html>
<html><head><title>ໃບບິນ ${invoiceCode}</title>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"><\/script>
<style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Phetsarath OT', monospace; width: 80mm; padding: 4mm; }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .bold { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    .total-row td { padding: 3px 0; font-size: 13px; }
    .qr-wrap { text-align: center; margin: 8px 0; }
</style></head>
<body>
    <div class="center">
        <div style="font-size:16px;font-weight:bold">ຮ້ານສະດວກຊື້</div>
        <div style="font-size:11px;color:#666">ນະຄອນຫຼວງວຽງຈັນ</div>
        <div style="font-size:11px;margin-top:4px">ເລກທີ່: <strong>${invoiceCode}</strong></div>
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;display:flex;justify-content:space-between">
        <span>📅 ${new Date(order.created_at).toLocaleString('lo-LA')}</span>
    </div>
    <div style="font-size:11px">👤 ພະນັກງານ: ${order.cashier || '-'}</div>
    <div style="font-size:11px">💳 ຊຳລະ: ${order.payment_method === 'cash' ? 'ເງິນສົດ' : 'ເງິນໂອນ'}</div>
    <div class="divider"></div>
    <table>
        <thead><tr style="font-size:11px;font-weight:bold;border-bottom:1px solid #000">
            <td style="text-align:left;padding:3px 0">ສິນຄ້າ</td>
            <td style="text-align:center">ຈນ.</td>
            <td style="text-align:right">ລາຄາ</td>
            <td style="text-align:right">ລວມ</td>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
    </table>
    <div class="divider"></div>
    <table>
        <tr class="total-row"><td>ລວມທັງໝົດ:</td><td style="text-align:right" class="bold">${order.total.toLocaleString()} ກີບ</td></tr>
        <tr class="total-row"><td>ຮັບມາ:</td><td style="text-align:right">${order.amount_paid.toLocaleString()} ກີບ</td></tr>
        <tr class="total-row"><td>ເງິນທອນ:</td><td style="text-align:right">${order.change_amount.toLocaleString()} ກີບ</td></tr>
    </table>
    <div class="divider"></div>
    <div class="qr-wrap" id="qr"></div>
    <div class="center" style="font-size:10px;margin-top:4px">${invoiceCode}</div>
    <div class="divider"></div>
    <div class="center" style="font-size:11px">ຂອບໃຈທີ່ມາອຸດໜູນ</div>
    <div class="center" style="font-size:10px;color:#999;margin-top:4px">ກະລຸນາກັບມາໃໝ່</div>
    <script>
        try {
            var qr = qrcode(0, 'M');
            qr.addData('${invoiceCode}');
            qr.make();
            document.getElementById('qr').innerHTML = qr.createImgTag(3, 8);
        } catch(e) {
            document.getElementById('qr').innerHTML = '<div style="font-size:10px;color:#999">QR: ${invoiceCode}</div>';
        }
        setTimeout(function() { window.print(); }, 600);
    <\/script>
</body></html>`);
    printWindow.document.close();
    
    setTimeout(() => {
        if (onComplete) onComplete();
    }, 1000);
};
