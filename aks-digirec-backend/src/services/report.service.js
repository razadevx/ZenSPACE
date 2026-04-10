const {
  RawMaterial, FinishedGood, ProcessedStock, SaleInvoice, PurchaseInvoice,
  WorkerPayment, ProductionBatch, LedgerEntry, LedgerAccount, Customer, Supplier
} = require('../models');
const AccountingService = require('./accounting.service');
const InventoryService = require('./inventory.service');
const ProductionService = require('./production.service');
const WorkerService = require('./worker.service');

class ReportService {
  /**
   * Get dashboard summary
   */
  static async getDashboardSummary(companyId) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      stockValuation,
      monthlySales,
      monthlyPurchases,
      pendingProduction,
      lowStock,
      receivables,
      payables
    ] = await Promise.all([
      InventoryService.getStockValuation(companyId),
      SaleInvoice.aggregate([
        { $match: { companyId: require('mongoose').Types.ObjectId(companyId), invoiceDate: { $gte: startOfMonth }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: null, total: { $sum: '$summary.grandTotal' } } }
      ]),
      PurchaseInvoice.aggregate([
        { $match: { companyId: require('mongoose').Types.ObjectId(companyId), invoiceDate: { $gte: startOfMonth }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: null, total: { $sum: '$summary.grandTotal' } } }
      ]),
      ProductionBatch.countDocuments({ companyId, status: { $in: ['in_progress', 'on_hold'] } }),
      InventoryService.getLowStockItems(companyId),
      Customer.aggregate([
        { $match: { companyId: require('mongoose').Types.ObjectId(companyId) } },
        { $group: { _id: null, total: { $sum: '$currentBalance.amount' } } }
      ]),
      Supplier.aggregate([
        { $match: { companyId: require('mongoose').Types.ObjectId(companyId) } },
        { $group: { _id: null, total: { $sum: '$currentBalance.amount' } } }
      ])
    ]);

    return {
      stock: stockValuation,
      sales: {
        monthly: monthlySales[0]?.total || 0
      },
      purchases: {
        monthly: monthlyPurchases[0]?.total || 0
      },
      production: {
        pendingBatches: pendingProduction
      },
      alerts: {
        lowStock: lowStock.rawMaterials.length + lowStock.finishedGoods.length
      },
      finances: {
        receivables: receivables[0]?.total || 0,
        payables: payables[0]?.total || 0
      }
    };
  }

  /**
   * Get stock report
   */
  static async getStockReport(companyId, filters = {}) {
    const { itemType, category } = filters;

    let rawMaterials = [];
    let finishedGoods = [];
    let processedStocks = [];

    if (!itemType || itemType === 'raw_material') {
      const query = { companyId, isActive: true };
      if (category) query.materialType = category;
      rawMaterials = await RawMaterial.find(query)
        .populate('materialType', 'name')
        .populate('unit', 'symbol');
    }

    if (!itemType || itemType === 'finished_good') {
      const query = { companyId, isActive: true };
      if (category) query.category = category;
      finishedGoods = await FinishedGood.find(query)
        .populate('unit', 'symbol');
    }

    if (!itemType || itemType === 'processed_stock') {
      processedStocks = await ProcessedStock.find({ companyId, isActive: true })
        .populate('unit', 'symbol');
    }

    return {
      rawMaterials: {
        count: rawMaterials.length,
        totalValue: rawMaterials.reduce((sum, m) => sum + (m.currentStock?.value || 0), 0),
        items: rawMaterials
      },
      finishedGoods: {
        count: finishedGoods.length,
        totalValue: finishedGoods.reduce((sum, p) => sum + (p.totalStock?.value || 0), 0),
        items: finishedGoods
      },
      processedStocks: {
        count: processedStocks.length,
        totalValue: processedStocks.reduce((sum, p) => sum + (p.currentStock?.value || 0), 0),
        items: processedStocks
      }
    };
  }

  /**
   * Get sales report
   */
  static async getSalesReport(companyId, fromDate, toDate, groupBy = 'day') {
    const query = {
      companyId,
      invoiceDate: { $gte: fromDate, $lte: toDate },
      status: { $nin: ['cancelled', 'draft'] }
    };

    const invoices = await SaleInvoice.find(query)
      .populate('customer', 'name businessName')
      .sort({ invoiceDate: 1 });

    // Group data
    const grouped = {};
    for (const invoice of invoices) {
      let key;
      const date = new Date(invoice.invoiceDate);

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = { sales: 0, count: 0, cost: 0 };
      }
      grouped[key].sales += invoice.summary.grandTotal;
      grouped[key].count += 1;
      grouped[key].cost += invoice.summary.totalCost;
    }

    const summary = {
      totalInvoices: invoices.length,
      totalSales: invoices.reduce((sum, i) => sum + i.summary.grandTotal, 0),
      totalCost: invoices.reduce((sum, i) => sum + i.summary.totalCost, 0),
      totalPaid: invoices.reduce((sum, i) => sum + i.payment.paidAmount, 0),
      totalDue: invoices.reduce((sum, i) => sum + i.payment.balanceDue, 0)
    };

    summary.grossProfit = summary.totalSales - summary.totalCost;
    summary.profitMargin = summary.totalSales > 0 ? (summary.grossProfit / summary.totalSales) * 100 : 0;

    return {
      summary,
      grouped: Object.entries(grouped).map(([key, value]) => ({ period: key, ...value })),
      invoices
    };
  }

  /**
   * Get purchase report
   */
  static async getPurchaseReport(companyId, fromDate, toDate) {
    const query = {
      companyId,
      invoiceDate: { $gte: fromDate, $lte: toDate },
      status: { $nin: ['cancelled', 'draft'] }
    };

    const invoices = await PurchaseInvoice.find(query)
      .populate('supplier', 'businessName')
      .sort({ invoiceDate: 1 });

    const summary = {
      totalInvoices: invoices.length,
      totalPurchases: invoices.reduce((sum, i) => sum + i.summary.grandTotal, 0),
      totalPaid: invoices.reduce((sum, i) => sum + i.payment.paidAmount, 0),
      totalDue: invoices.reduce((sum, i) => sum + i.payment.balanceDue, 0)
    };

    // Group by supplier
    const bySupplier = invoices.reduce((acc, invoice) => {
      const supplierId = invoice.supplier?._id?.toString();
      if (!supplierId) return acc;

      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplier: invoice.supplier,
          invoices: 0,
          amount: 0
        };
      }
      acc[supplierId].invoices++;
      acc[supplierId].amount += invoice.summary.grandTotal;
      return acc;
    }, {});

    return {
      summary,
      bySupplier: Object.values(bySupplier),
      invoices
    };
  }

  /**
   * Get customer statement
   */
  static async getCustomerStatement(companyId, customerId, fromDate, toDate) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const invoices = await SaleInvoice.find({
      companyId,
      customer: customerId,
      invoiceDate: { $gte: fromDate, $lte: toDate },
      status: { $nin: ['cancelled'] }
    }).sort({ invoiceDate: 1 });

    const transactions = invoices.map(inv => ({
      date: inv.invoiceDate,
      type: 'invoice',
      number: inv.invoiceNumber,
      description: 'Sale Invoice',
      debit: inv.summary.grandTotal,
      credit: 0,
      balance: 0 // Will calculate
    }));

    // Add payments
    for (const inv of invoices) {
      for (const payment of inv.paymentsReceived || []) {
        transactions.push({
          date: payment.date,
          type: 'payment',
          number: payment.reference,
          description: `Payment against ${inv.invoiceNumber}`,
          debit: 0,
          credit: payment.amount,
          balance: 0
        });
      }
    }

    // Sort and calculate running balance
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    for (const t of transactions) {
      balance += t.debit - t.credit;
      t.balance = balance;
    }

    return {
      customer: {
        id: customer._id,
        name: customer.name,
        businessName: customer.businessName,
        creditLimit: customer.creditTerms?.limit || 0
      },
      period: { from: fromDate, to: toDate },
      openingBalance: 0, // TODO: Calculate from before period
      transactions,
      closingBalance: balance,
      totalInvoiced: invoices.reduce((sum, i) => sum + i.summary.grandTotal, 0),
      totalPaid: invoices.reduce((sum, i) => sum + i.payment.paidAmount, 0)
    };
  }

  /**
   * Get supplier statement
   */
  static async getSupplierStatement(companyId, supplierId, fromDate, toDate) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const invoices = await PurchaseInvoice.find({
      companyId,
      supplier: supplierId,
      invoiceDate: { $gte: fromDate, $lte: toDate },
      status: { $nin: ['cancelled'] }
    }).sort({ invoiceDate: 1 });

    const transactions = invoices.map(inv => ({
      date: inv.invoiceDate,
      type: 'invoice',
      number: inv.invoiceNumber,
      description: 'Purchase Invoice',
      debit: 0,
      credit: inv.summary.grandTotal,
      balance: 0
    }));

    // Add payments
    for (const inv of invoices) {
      for (const payment of inv.paymentsMade || []) {
        transactions.push({
          date: payment.date,
          type: 'payment',
          number: payment.reference,
          description: `Payment against ${inv.invoiceNumber}`,
          debit: payment.amount,
          credit: 0,
          balance: 0
        });
      }
    }

    // Sort and calculate running balance
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    for (const t of transactions) {
      balance += t.credit - t.debit;
      t.balance = balance;
    }

    return {
      supplier: {
        id: supplier._id,
        businessName: supplier.businessName,
        creditLimit: supplier.creditTerms?.limit || 0
      },
      period: { from: fromDate, to: toDate },
      transactions,
      closingBalance: balance,
      totalPurchased: invoices.reduce((sum, i) => sum + i.summary.grandTotal, 0),
      totalPaid: invoices.reduce((sum, i) => sum + i.payment.paidAmount, 0)
    };
  }

  /**
   * Get aging report (receivables/payables)
   */
  static async getAgingReport(companyId, type = 'receivable') {
    const today = new Date();
    const buckets = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0
    };

    let items = [];

    if (type === 'receivable') {
      const customers = await Customer.find({ companyId, 'currentBalance.amount': { $gt: 0 } });
      for (const customer of customers) {
        const invoices = await SaleInvoice.find({
          companyId,
          customer: customer._id,
          'payment.balanceDue': { $gt: 0 }
        });

        for (const inv of invoices) {
          const dueDate = inv.dueDate || inv.invoiceDate;
          const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          const balance = inv.payment.balanceDue;

          if (daysOverdue <= 0) buckets.current += balance;
          else if (daysOverdue <= 30) buckets.days1to30 += balance;
          else if (daysOverdue <= 60) buckets.days31to60 += balance;
          else if (daysOverdue <= 90) buckets.days61to90 += balance;
          else buckets.over90 += balance;

          items.push({
            customer: customer.name,
            invoice: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            dueDate,
            daysOverdue,
            balance
          });
        }
      }
    } else {
      const suppliers = await Supplier.find({ companyId, 'currentBalance.amount': { $gt: 0 } });
      for (const supplier of suppliers) {
        const invoices = await PurchaseInvoice.find({
          companyId,
          supplier: supplier._id,
          'payment.balanceDue': { $gt: 0 }
        });

        for (const inv of invoices) {
          const dueDate = inv.dueDate || inv.invoiceDate;
          const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          const balance = inv.payment.balanceDue;

          if (daysOverdue <= 0) buckets.current += balance;
          else if (daysOverdue <= 30) buckets.days1to30 += balance;
          else if (daysOverdue <= 60) buckets.days31to60 += balance;
          else if (daysOverdue <= 90) buckets.days61to90 += balance;
          else buckets.over90 += balance;

          items.push({
            supplier: supplier.businessName,
            invoice: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            dueDate,
            daysOverdue,
            balance
          });
        }
      }
    }

    return {
      type,
      total: Object.values(buckets).reduce((sum, v) => sum + v, 0),
      buckets,
      items: items.sort((a, b) => b.daysOverdue - a.daysOverdue)
    };
  }
}

module.exports = ReportService;
