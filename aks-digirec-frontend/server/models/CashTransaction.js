const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['sale', 'purchase', 'sales_return', 'purchase_return', 'expense']
  },
  documentNo: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  party: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMode: {
    type: String,
    required: true,
    enum: ['cash', 'bank_transfer', 'cheque', 'card', 'online']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  description: {
    type: String,
    required: false
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
cashTransactionSchema.index({ date: -1 });
cashTransactionSchema.index({ type: 1 });
cashTransactionSchema.index({ company: 1 });

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
