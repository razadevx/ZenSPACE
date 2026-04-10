const { CashTransaction } = require('../models');

// Generate sample data for demonstration
const generateSampleData = () => {
  const today = new Date();
  const sampleTransactions = [
    {
      type: 'sale',
      documentNo: 'INV-2024-001',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
      party: 'ABC Ceramics Store',
      amount: 15000,
      paymentMode: 'cash',
      status: 'completed',
      description: 'Sale of ceramic tiles'
    },
    {
      type: 'sale',
      documentNo: 'INV-2024-002',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 15),
      party: 'XYZ Construction',
      amount: 25000,
      paymentMode: 'bank_transfer',
      status: 'completed',
      description: 'Bulk order of ceramic plates'
    },
    {
      type: 'purchase',
      documentNo: 'PUR-2024-001',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
      party: 'Clay Suppliers Ltd',
      amount: 8000,
      paymentMode: 'cheque',
      status: 'completed',
      description: 'Raw clay material purchase'
    },
    {
      type: 'expense',
      documentNo: 'EXP-2024-001',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30),
      party: 'Electric Company',
      amount: 3500,
      paymentMode: 'bank_transfer',
      status: 'completed',
      description: 'Monthly electricity bill'
    },
    {
      type: 'sales_return',
      documentNo: 'RET-2024-001',
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
      party: 'ABC Ceramics Store',
      amount: 2000,
      paymentMode: 'cash',
      status: 'completed',
      description: 'Return of damaged items'
    }
  ];

  return sampleTransactions;
};

// Get daily cash summary
exports.getDailySummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Check if we have data for today, if not, create sample data
    const existingTransactions = await CashTransaction.countDocuments({
      date: { $gte: startOfDay, $lt: endOfDay },
      company: req.user.company
    });

    if (existingTransactions === 0) {
      // Create sample data for demonstration
      const sampleData = generateSampleData();
      const transactionsWithCompany = sampleData.map(transaction => ({
        ...transaction,
        company: req.user.company,
        createdBy: req.user._id
      }));

      await CashTransaction.insertMany(transactionsWithCompany);
    }

    // Calculate daily summary
    const summary = await CashTransaction.aggregate([
      {
        $match: {
          date: { $gte: startOfDay, $lt: endOfDay },
          company: req.user.company,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    let totalSales = 0;
    let totalPurchases = 0;
    let totalExpenses = 0;

    summary.forEach(item => {
      switch (item._id) {
        case 'sale':
          totalSales += item.totalAmount;
          break;
        case 'purchase':
          totalPurchases += item.totalAmount;
          break;
        case 'expense':
          totalExpenses += item.totalAmount;
          break;
        case 'sales_return':
          totalSales -= item.totalAmount;
          break;
        case 'purchase_return':
          totalPurchases -= item.totalAmount;
          break;
      }
    });

    const netCash = totalSales - totalPurchases - totalExpenses;

    res.json({
      success: true,
      data: {
        totalSales,
        totalPurchases,
        totalExpenses,
        netCash
      }
    });
  } catch (error) {
    console.error('Error in getDailySummary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily summary',
      error: error.message
    });
  }
};

// Get all transactions for today
exports.getTransactions = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Ensure we have sample data
    const existingTransactions = await CashTransaction.countDocuments({
      date: { $gte: startOfDay, $lt: endOfDay },
      company: req.user.company
    });

    if (existingTransactions === 0) {
      const sampleData = generateSampleData();
      const transactionsWithCompany = sampleData.map(transaction => ({
        ...transaction,
        company: req.user.company,
        createdBy: req.user._id
      }));

      await CashTransaction.insertMany(transactionsWithCompany);
    }

    const transactions = await CashTransaction.find({
      date: { $gte: startOfDay, $lt: endOfDay },
      company: req.user.company
    })
    .populate('createdBy', 'name')
    .sort({ date: -1 });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error in getTransactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// Create new transaction
exports.createTransaction = async (req, res) => {
  try {
    const transactionData = {
      ...req.body,
      company: req.user.company,
      createdBy: req.user._id
    };

    const transaction = new CashTransaction(transactionData);
    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error in createTransaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
};
