const { Section, RawMaterial, Supplier, Worker, Customer, FinishedGood } = require('../models');

// Generic CRUD operations factory
const createCRUDController = (Model, codePrefix) => {
  return {
    // Get all
    getAll: async (req, res) => {
      try {
        const query = { companyId: req.companyId };
        
        // Add filters
        if (req.query.type) query.materialType = req.query.type;
        if (req.query.status) query.status = req.query.status;
        if (req.query.sectionGroup) query.sectionGroup = req.query.sectionGroup;
        
        const data = await Model.find(query).sort({ createdAt: -1 });
        
        res.json({
          success: true,
          count: data.length,
          data
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Get by ID
    getById: async (req, res) => {
      try {
        const data = await Model.findOne({
          _id: req.params.id,
          companyId: req.companyId
        });

        if (!data) {
          return res.status(404).json({
            success: false,
            message: 'Record not found'
          });
        }

        res.json({
          success: true,
          data
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Create
    create: async (req, res) => {
      try {
        // Generate auto code
        const count = await Model.countDocuments({ companyId: req.companyId });
        const sequence = (count + 1).toString().padStart(3, '0');
        const name = req.body.name || req.body.subSection || 'Item';
        const code = `${codePrefix}-${sequence}-${name.replace(/\s+/g, '')}`;

        const data = await Model.create({
          ...req.body,
          companyId: req.companyId,
          code,
          createdBy: req.user.id,
          updatedBy: req.user.id
        });

        res.status(201).json({
          success: true,
          data
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Update
    update: async (req, res) => {
      try {
        const data = await Model.findOneAndUpdate(
          { _id: req.params.id, companyId: req.companyId },
          { ...req.body, updatedBy: req.user.id },
          { new: true, runValidators: true }
        );

        if (!data) {
          return res.status(404).json({
            success: false,
            message: 'Record not found'
          });
        }

        res.json({
          success: true,
          data
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Delete
    delete: async (req, res) => {
      try {
        const data = await Model.findOneAndDelete({
          _id: req.params.id,
          companyId: req.companyId
        });

        if (!data) {
          return res.status(404).json({
            success: false,
            message: 'Record not found'
          });
        }

        res.json({
          success: true,
          message: 'Record deleted successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    },

    // Search
    search: async (req, res) => {
      try {
        const { q } = req.query;
        const searchRegex = new RegExp(q, 'i');
        
        const data = await Model.find({
          companyId: req.companyId,
          $or: [
            { name: searchRegex },
            { code: searchRegex },
            { email: searchRegex }
          ]
        });

        res.json({
          success: true,
          count: data.length,
          data
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    }
  };
};

// Create controllers for each model
const sectionController = createCRUDController(Section, 'SEC');
const rawMaterialController = createCRUDController(RawMaterial, 'MAT');
const supplierController = createCRUDController(Supplier, 'SUP');
const workerController = createCRUDController(Worker, 'WRK');
const customerController = createCRUDController(Customer, 'CUST');
const finishedGoodController = createCRUDController(FinishedGood, 'FG');

// Additional methods for specific models

// Raw Material - Get low stock
rawMaterialController.getLowStock = async (req, res) => {
  try {
    const materials = await RawMaterial.find({
      companyId: req.companyId,
      $expr: { $lte: ['$stock', '$minStock'] }
    });

    res.json({
      success: true,
      count: materials.length,
      data: materials
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Customer - Check credit limit
customerController.checkCreditLimit = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const amount = parseFloat(req.query.amount) || 0;
    const allowed = !customer.isCreditLimitExceeded(amount);
    const remaining = customer.getRemainingCredit();

    res.json({
      success: true,
      data: { allowed, remaining, creditLimit: customer.creditLimit, currentBalance: customer.currentBalance }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Customer - Get ledger
customerController.getLedger = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // TODO: Implement actual ledger fetching from transactions
    res.json({
      success: true,
      data: {
        customer,
        transactions: [],
        openingBalance: customer.openingBalance,
        currentBalance: customer.currentBalance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Supplier - Get ledger
supplierController.getLedger = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: {
        supplier,
        transactions: [],
        openingBalance: supplier.openingBalance,
        currentBalance: supplier.currentBalance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Worker - Get active workers
workerController.getActive = async (req, res) => {
  try {
    const workers = await Worker.find({
      companyId: req.companyId,
      status: 'active'
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Worker - Get by section
workerController.getBySection = async (req, res) => {
  try {
    const workers = await Worker.find({
      companyId: req.companyId,
      sectionGroup: req.query.group
    });

    res.json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Finished Good - Get low stock
finishedGoodController.getLowStock = async (req, res) => {
  try {
    const items = await FinishedGood.find({
      companyId: req.companyId,
      $expr: { $lte: ['$stock', '$minStock'] }
    });

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  sectionController,
  rawMaterialController,
  supplierController,
  workerController,
  customerController,
  finishedGoodController
};
