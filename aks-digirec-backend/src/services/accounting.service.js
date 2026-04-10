const { LedgerAccount, LedgerTransaction, LedgerEntry, FiscalYear, AccountGroup } = require('../models');
const logger = require('../config/logger');

class AccountingService {
  /**
   * Create a journal entry with automatic double-entry posting
   */
  static async createJournalEntry(data, userId) {
    const { companyId, date, description, entries, type = 'journal', sourceDocument } = data;

    // Validate entries balance
    const totalDebit = entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.amount, 0);
    const totalCredit = entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + e.amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Transaction not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    // Get current fiscal year
    const fiscalYear = await FiscalYear.getCurrent(companyId);
    if (!fiscalYear) {
      throw new Error('No active fiscal year found');
    }

    // Create transaction
    const transaction = await LedgerTransaction.create({
      companyId,
      date,
      type,
      description,
      entries,
      sourceDocument,
      fiscalYearId: fiscalYear._id,
      createdBy: userId
    });

    return transaction;
  }

  /**
   * Post a transaction to ledger (create entries and update balances)
   */
  static async postTransaction(transactionId, userId) {
    const transaction = await LedgerTransaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'draft') {
      throw new Error('Transaction already posted');
    }

    // Create ledger entries and update account balances
    for (const entry of transaction.entries) {
      const account = await LedgerAccount.findById(entry.accountId);
      if (!account) {
        throw new Error(`Account not found: ${entry.accountId}`);
      }

      // Calculate running balance
      const currentDebit = account.currentBalance.debit;
      const currentCredit = account.currentBalance.credit;
      const newDebit = entry.entryType === 'debit' ? currentDebit + entry.amount : currentDebit;
      const newCredit = entry.entryType === 'credit' ? currentCredit + entry.amount : currentCredit;

      // Create ledger entry
      await LedgerEntry.create({
        companyId: transaction.companyId,
        transactionId: transaction._id,
        accountId: entry.accountId,
        entryType: entry.entryType,
        amount: entry.amount,
        amountInBase: entry.amount,
        description: { en: entry.description || transaction.description.en },
        runningBalance: {
          debit: newDebit,
          credit: newCredit,
          net: newDebit - newCredit
        },
        costCenter: entry.costCenter,
        reference: {
          type: transaction.sourceDocument?.type,
          documentType: transaction.sourceDocument?.type,
          documentId: transaction.sourceDocument?.documentId,
          documentNumber: transaction.sourceDocument?.documentNumber
        },
        fiscalYearId: transaction.fiscalYearId,
        entryDate: transaction.date,
        createdBy: userId
      });

      // Update account balance
      await account.updateBalance(
        entry.entryType === 'debit' ? entry.amount : 0,
        entry.entryType === 'credit' ? entry.amount : 0
      );
    }

    // Update transaction status
    transaction.status = 'posted';
    transaction.postedAt = new Date();
    transaction.postedBy = userId;
    await transaction.save();

    logger.info(`Transaction posted: ${transaction.transactionNumber}`);
    return transaction;
  }

  /**
   * Create auto-posting for sales invoice
   */
  static async postSaleInvoice(companyId, invoice, userId) {
    const entries = [];

    // Dr Customer (or Cash/Bank)
    const customerAccount = await this.getOrCreateEntityAccount(
      companyId, 'customer', invoice.customer._id, invoice.customer.name, '1120'
    );
    entries.push({
      accountId: customerAccount._id,
      entryType: 'debit',
      amount: invoice.summary.grandTotal,
      description: `Sale Invoice ${invoice.invoiceNumber}`
    });

    // Cr Sales Revenue
    const salesAccount = await LedgerAccount.findOne({ companyId, code: '410001' });
    entries.push({
      accountId: salesAccount._id,
      entryType: 'credit',
      amount: invoice.summary.subtotal,
      description: `Sale Invoice ${invoice.invoiceNumber}`
    });

    // Cr Tax Payable (if applicable)
    if (invoice.summary.totalTax > 0) {
      const taxAccount = await LedgerAccount.findOne({ companyId, code: '211003' }) ||
        await LedgerAccount.create({
          companyId,
          code: '211003',
          name: { en: 'Tax Payable', ur: 'ٹیکس قابل ادائیگی' },
          accountGroup: (await AccountGroup.findOne({ companyId, code: '2100' }))?._id,
          type: 'liability'
        });
      entries.push({
        accountId: taxAccount._id,
        entryType: 'credit',
        amount: invoice.summary.totalTax,
        description: `Tax on Sale ${invoice.invoiceNumber}`
      });
    }

    // Dr COGS, Cr Inventory (for cost)
    if (invoice.summary.totalCost > 0) {
      const cogsAccount = await LedgerAccount.findOne({ companyId, code: '510001' });
      const inventoryAccount = await LedgerAccount.findOne({ companyId, code: '113003' });

      entries.push({
        accountId: cogsAccount._id,
        entryType: 'debit',
        amount: invoice.summary.totalCost,
        description: `COGS for ${invoice.invoiceNumber}`
      });
      entries.push({
        accountId: inventoryAccount._id,
        entryType: 'credit',
        amount: invoice.summary.totalCost,
        description: `Inventory issue for ${invoice.invoiceNumber}`
      });
    }

    const transaction = await this.createJournalEntry({
      companyId,
      date: invoice.invoiceDate,
      description: { en: `Sale Invoice ${invoice.invoiceNumber}`, ur: `فروخت انوائس ${invoice.invoiceNumber}` },
      entries,
      type: 'sale',
      sourceDocument: {
        type: 'sale_invoice',
        documentId: invoice._id,
        documentNumber: invoice.invoiceNumber
      }
    }, userId);

    await this.postTransaction(transaction._id, userId);
    return transaction;
  }

  /**
   * Create auto-posting for purchase invoice
   */
  static async postPurchaseInvoice(companyId, invoice, userId) {
    const entries = [];

    // Dr Inventory/Expense
    const inventoryAccount = await LedgerAccount.findOne({ companyId, code: '113001' });
    entries.push({
      accountId: inventoryAccount._id,
      entryType: 'debit',
      amount: invoice.summary.subtotal,
      description: `Purchase Invoice ${invoice.invoiceNumber}`
    });

    // Dr Tax (if applicable)
    if (invoice.summary.totalTax > 0) {
      const inputTaxAccount = await LedgerAccount.findOne({ companyId, code: '112003' }) ||
        await LedgerAccount.create({
          companyId,
          code: '112003',
          name: { en: 'Input Tax', ur: 'ان پٹ ٹیکس' },
          accountGroup: (await AccountGroup.findOne({ companyId, code: '1100' }))?._id,
          type: 'asset'
        });
      entries.push({
        accountId: inputTaxAccount._id,
        entryType: 'debit',
        amount: invoice.summary.totalTax,
        description: `Tax on Purchase ${invoice.invoiceNumber}`
      });
    }

    // Cr Supplier
    const supplierAccount = await this.getOrCreateEntityAccount(
      companyId, 'supplier', invoice.supplier._id, invoice.supplier.businessName, '2110'
    );
    entries.push({
      accountId: supplierAccount._id,
      entryType: 'credit',
      amount: invoice.summary.grandTotal,
      description: `Purchase Invoice ${invoice.invoiceNumber}`
    });

    const transaction = await this.createJournalEntry({
      companyId,
      date: invoice.invoiceDate,
      description: { en: `Purchase Invoice ${invoice.invoiceNumber}`, ur: `خریداری انوائس ${invoice.invoiceNumber}` },
      entries,
      type: 'purchase',
      sourceDocument: {
        type: 'purchase_invoice',
        documentId: invoice._id,
        documentNumber: invoice.invoiceNumber
      }
    }, userId);

    await this.postTransaction(transaction._id, userId);
    return transaction;
  }

  /**
   * Create auto-posting for worker payment
   */
  static async postWorkerPayment(companyId, payment, userId) {
    const entries = [];

    // Dr Labour Expense
    const labourExpenseAccount = await LedgerAccount.findOne({ companyId, code: '521001' });
    entries.push({
      accountId: labourExpenseAccount._id,
      entryType: 'debit',
      amount: payment.netPayment,
      description: `Worker Payment ${payment.paymentNumber}`
    });

    // Cr Cash/Bank
    const cashAccount = await LedgerAccount.findOne({ companyId, code: '111001' });
    entries.push({
      accountId: cashAccount._id,
      entryType: 'credit',
      amount: payment.netPayment,
      description: `Worker Payment ${payment.paymentNumber}`
    });

    const transaction = await this.createJournalEntry({
      companyId,
      date: payment.paymentDate,
      description: { en: `Worker Payment ${payment.paymentNumber}`, ur: `مزدوری کی ادائیگی ${payment.paymentNumber}` },
      entries,
      type: 'labour',
      sourceDocument: {
        type: 'worker_payment',
        documentId: payment._id,
        documentNumber: payment.paymentNumber
      }
    }, userId);

    await this.postTransaction(transaction._id, userId);
    return transaction;
  }

  /**
   * Get or create entity account (customer, supplier, worker)
   */
  static async getOrCreateEntityAccount(companyId, entityType, entityId, entityName, groupCode) {
    let account = await LedgerAccount.findOne({ companyId, entityType, entityId });

    if (account) {
      return account;
    }

    const accountGroup = await AccountGroup.findOne({ companyId, code: groupCode });
    if (!accountGroup) {
      throw new Error(`Account group ${groupCode} not found`);
    }

    const count = await LedgerAccount.countDocuments({ companyId, code: new RegExp(`^${groupCode}`) });
    const code = `${groupCode}${String(count + 1).padStart(3, '0')}`;

    account = await LedgerAccount.create({
      companyId,
      code,
      name: { en: entityName, ur: entityName },
      accountGroup: accountGroup._id,
      type: accountGroup.type,
      entityType,
      entityId,
      isSystem: false
    });

    logger.info(`Entity account created: ${code} for ${entityName}`);
    return account;
  }

  /**
   * Get trial balance
   */
  static async getTrialBalance(companyId, asOfDate = new Date()) {
    const accounts = await LedgerAccount.find({ companyId, isActive: true });

    const trialBalance = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of accounts) {
      const entries = await LedgerEntry.find({
        companyId,
        accountId: account._id,
        entryDate: { $lte: asOfDate }
      });

      const debit = entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.amount, 0);
      const credit = entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + e.amount, 0);
      const balance = debit - credit;

      if (debit > 0 || credit > 0) {
        trialBalance.push({
          account: {
            id: account._id,
            code: account.code,
            name: account.name,
            type: account.type
          },
          debit: balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0
        });

        totalDebit += balance > 0 ? balance : 0;
        totalCredit += balance < 0 ? Math.abs(balance) : 0;
      }
    }

    return {
      asOfDate,
      accounts: trialBalance,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    };
  }

  /**
   * Get balance sheet
   */
  static async getBalanceSheet(companyId, asOfDate = new Date()) {
    const accounts = await LedgerAccount.find({ companyId, isActive: true });

    const assets = [];
    const liabilities = [];
    const equity = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const account of accounts) {
      const entries = await LedgerEntry.find({
        companyId,
        accountId: account._id,
        entryDate: { $lte: asOfDate }
      });

      const debit = entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.amount, 0);
      const credit = entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + e.amount, 0);
      const balance = debit - credit;

      if (Math.abs(balance) < 0.01) continue;

      const accountData = {
        id: account._id,
        code: account.code,
        name: account.name,
        balance: Math.abs(balance)
      };

      if (account.type === 'asset') {
        assets.push(accountData);
        totalAssets += balance;
      } else if (account.type === 'liability') {
        liabilities.push(accountData);
        totalLiabilities += Math.abs(balance);
      } else if (account.type === 'equity') {
        equity.push(accountData);
        totalEquity += balance;
      }
    }

    return {
      asOfDate,
      assets: { items: assets, total: totalAssets },
      liabilities: { items: liabilities, total: totalLiabilities },
      equity: { items: equity, total: totalEquity },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    };
  }

  /**
   * Get profit and loss
   */
  static async getProfitLoss(companyId, fromDate, toDate) {
    const revenueAccounts = await LedgerAccount.find({ companyId, type: 'revenue' });
    const expenseAccounts = await LedgerAccount.find({ companyId, type: 'expense' });

    let totalRevenue = 0;
    let totalExpense = 0;
    const revenue = [];
    const expenses = [];

    for (const account of revenueAccounts) {
      const entries = await LedgerEntry.find({
        companyId,
        accountId: account._id,
        entryDate: { $gte: fromDate, $lte: toDate }
      });

      const credit = entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + e.amount, 0);
      const debit = entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.amount, 0);
      const net = credit - debit;

      if (Math.abs(net) > 0.01) {
        revenue.push({
          id: account._id,
          code: account.code,
          name: account.name,
          amount: net
        });
        totalRevenue += net;
      }
    }

    for (const account of expenseAccounts) {
      const entries = await LedgerEntry.find({
        companyId,
        accountId: account._id,
        entryDate: { $gte: fromDate, $lte: toDate }
      });

      const debit = entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.amount, 0);
      const credit = entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + e.amount, 0);
      const net = debit - credit;

      if (Math.abs(net) > 0.01) {
        expenses.push({
          id: account._id,
          code: account.code,
          name: account.name,
          amount: net
        });
        totalExpense += net;
      }
    }

    const netProfit = totalRevenue - totalExpense;

    return {
      fromDate,
      toDate,
      revenue: { items: revenue, total: totalRevenue },
      expenses: { items: expenses, total: totalExpense },
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    };
  }
}

module.exports = AccountingService;
