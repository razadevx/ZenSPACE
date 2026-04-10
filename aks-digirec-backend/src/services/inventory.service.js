const { StockLedger, RawMaterial, FinishedGood, ProcessedStock } = require('../models');
const logger = require('../config/logger');

class InventoryService {
  /**
   * Record stock movement
   */
  static async recordMovement(data) {
    const {
      companyId,
      itemType,
      itemId,
      variantId,
      movementType,
      quantity,
      unitCost,
      reference,
      location,
      batchInfo,
      movementDate,
      userId
    } = data;

    // Get current stock for running balance
    const currentStock = await StockLedger.getCurrentStock(companyId, itemType, itemId, variantId);
    const newQuantity = currentStock.quantity + quantity;
    const newValue = currentStock.value + (quantity * (unitCost || 0));

    // Create stock ledger entry
    const entry = await StockLedger.create({
      companyId,
      itemType,
      itemId,
      variantId,
      movementType,
      quantity,
      unitCost: unitCost || 0,
      totalCost: quantity * (unitCost || 0),
      runningBalance: {
        quantity: newQuantity,
        value: newValue
      },
      reference,
      location,
      batchInfo,
      movementDate: movementDate || new Date(),
      createdBy: userId
    });

    // Update item stock
    await this.updateItemStock(itemType, itemId, variantId, quantity, quantity * (unitCost || 0));

    logger.info(`Stock movement recorded: ${movementType} ${quantity} for ${itemType} ${itemId}`);
    return entry;
  }

  /**
   * Update item stock
   */
  static async updateItemStock(itemType, itemId, variantId, quantity, value) {
    if (itemType === 'raw_material') {
      const material = await RawMaterial.findById(itemId);
      if (material) {
        material.currentStock.quantity += quantity;
        material.currentStock.value += value;
        material.currentStock.lastUpdated = new Date();

        // Update average cost
        if (material.currentStock.quantity > 0) {
          material.costing.averageCost = material.currentStock.value / material.currentStock.quantity;
        }

        await material.save();
      }
    } else if (itemType === 'finished_good') {
      const product = await FinishedGood.findById(itemId);
      if (product) {
        const variant = product.currentStock.find(s => s.variantId === variantId);
        if (variant) {
          variant.quantity += quantity;
          variant.value += value;
          variant.lastUpdated = new Date();
        } else if (quantity > 0) {
          product.currentStock.push({
            variantId,
            quantity,
            value,
            lastUpdated: new Date()
          });
        }

        // Recalculate totals
        product.totalStock.quantity = product.currentStock.reduce((sum, s) => sum + s.quantity, 0);
        product.totalStock.value = product.currentStock.reduce((sum, s) => sum + s.value, 0);

        await product.save();
      }
    } else if (itemType === 'processed_stock') {
      const stock = await ProcessedStock.findById(itemId);
      if (stock) {
        stock.currentStock.quantity += quantity;
        stock.currentStock.value += value;
        stock.currentStock.lastUpdated = new Date();

        // Update average cost
        if (stock.currentStock.quantity > 0) {
          stock.costing.averageCost = stock.currentStock.value / stock.currentStock.quantity;
        }

        await stock.save();
      }
    }
  }

  /**
   * Get stock valuation
   */
  static async getStockValuation(companyId) {
    const [rawMaterials, finishedGoods, processedStocks] = await Promise.all([
      RawMaterial.find({ companyId, isActive: true }),
      FinishedGood.find({ companyId, isActive: true }),
      ProcessedStock.find({ companyId, isActive: true })
    ]);

    const rawMaterialValue = rawMaterials.reduce((sum, m) => sum + (m.currentStock?.value || 0), 0);
    const finishedGoodsValue = finishedGoods.reduce((sum, p) => sum + (p.totalStock?.value || 0), 0);
    const processedStockValue = processedStocks.reduce((sum, p) => sum + (p.currentStock?.value || 0), 0);

    return {
      rawMaterials: {
        count: rawMaterials.length,
        totalQuantity: rawMaterials.reduce((sum, m) => sum + (m.currentStock?.quantity || 0), 0),
        totalValue: rawMaterialValue
      },
      finishedGoods: {
        count: finishedGoods.length,
        totalQuantity: finishedGoods.reduce((sum, p) => sum + (p.totalStock?.quantity || 0), 0),
        totalValue: finishedGoodsValue
      },
      processedStocks: {
        count: processedStocks.length,
        totalQuantity: processedStocks.reduce((sum, p) => sum + (p.currentStock?.quantity || 0), 0),
        totalValue: processedStockValue
      },
      totalValue: rawMaterialValue + finishedGoodsValue + processedStockValue
    };
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(companyId) {
    const materials = await RawMaterial.find({
      companyId,
      isActive: true,
      $expr: { $lte: ['$currentStock.quantity', '$inventory.reorderLevel'] }
    }).populate('unit', 'symbol');

    const products = await FinishedGood.find({
      companyId,
      isActive: true,
      $expr: { $lte: ['$totalStock.quantity', '$inventory.reorderLevel'] }
    }).populate('unit', 'symbol');

    return {
      rawMaterials: materials,
      finishedGoods: products
    };
  }

  /**
   * Get stock movements report
   */
  static async getStockMovements(companyId, filters = {}) {
    const { itemType, itemId, fromDate, toDate } = filters;

    const query = { companyId };
    if (itemType) query.itemType = itemType;
    if (itemId) query.itemId = itemId;
    if (fromDate || toDate) {
      query.movementDate = {};
      if (fromDate) query.movementDate.$gte = new Date(fromDate);
      if (toDate) query.movementDate.$lte = new Date(toDate);
    }

    const movements = await StockLedger.find(query)
      .populate('itemId', 'name code')
      .populate('unit', 'symbol')
      .sort({ movementDate: -1 });

    // Group by movement type
    const grouped = movements.reduce((acc, m) => {
      if (!acc[m.movementType]) {
        acc[m.movementType] = { count: 0, quantity: 0, value: 0 };
      }
      acc[m.movementType].count++;
      acc[m.movementType].quantity += Math.abs(m.quantity);
      acc[m.movementType].value += Math.abs(m.totalCost);
      return acc;
    }, {});

    return {
      movements,
      summary: grouped
    };
  }

  /**
   * Adjust stock
   */
  static async adjustStock(companyId, itemType, itemId, adjustment, reason, userId) {
    const { quantity, unitCost } = adjustment;

    const entry = await this.recordMovement({
      companyId,
      itemType,
      itemId,
      movementType: 'adjustment',
      quantity,
      unitCost,
      reference: {
        documentType: 'stock_adjustment',
        documentNumber: `ADJ-${Date.now()}`
      },
      movementDate: new Date(),
      userId
    });

    logger.info(`Stock adjusted for ${itemType} ${itemId}: ${quantity} - ${reason}`);
    return entry;
  }

  /**
   * Transfer stock between locations
   */
  static async transferStock(companyId, itemType, itemId, fromLocation, toLocation, quantity, userId) {
    // Out from source
    await this.recordMovement({
      companyId,
      itemType,
      itemId,
      movementType: 'transfer_out',
      quantity: -quantity,
      reference: {
        documentType: 'transfer_note',
        documentNumber: `TRF-${Date.now()}`
      },
      location: { warehouse: fromLocation },
      movementDate: new Date(),
      userId
    });

    // In to destination
    await this.recordMovement({
      companyId,
      itemType,
      itemId,
      movementType: 'transfer_in',
      quantity,
      reference: {
        documentType: 'transfer_note',
        documentNumber: `TRF-${Date.now()}`
      },
      location: { warehouse: toLocation },
      movementDate: new Date(),
      userId
    });

    logger.info(`Stock transferred: ${quantity} from ${fromLocation} to ${toLocation}`);
  }

  /**
   * Get item stock history
   */
  static async getItemStockHistory(companyId, itemType, itemId, variantId = null) {
    const query = { companyId, itemType, itemId };
    if (variantId) query.variantId = variantId;

    const movements = await StockLedger.find(query)
      .sort({ movementDate: 1, createdAt: 1 });

    return movements;
  }
}

module.exports = InventoryService;
