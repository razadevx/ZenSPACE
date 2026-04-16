const { ProductionBatch, RawMaterial, ProcessedStock, FinishedGood, WorkerActivity, StockLedger } = require('../models');
const InventoryService = require('./inventory.service');
const AccountingService = require('./accounting.service');
const logger = require('../config/logger');

class ProductionService {
  /**
   * Create production batch
   */
  static async createBatch(data, userId) {
    const { companyId, finishedGood, variant, targetQuantity, materialsConsumed, stages, expectedCompletion } = data;

    // Calculate material costs
    let materialCost = 0;
    for (const material of materialsConsumed) {
      const rm = await RawMaterial.findById(material.material);
      if (rm) {
        const unitCost = rm.costing.averageCost || rm.costing.lastPurchaseCost || 0;
        material.unitCost = unitCost;
        material.totalCost = material.quantity * unitCost;
        materialCost += material.totalCost;
      }
    }

    const batch = await ProductionBatch.create({
      companyId,
      finishedGood,
      variant,
      targetQuantity,
      materialsConsumed,
      stages: stages.map((s, i) => ({
        ...s,
        stageNumber: i + 1,
        status: i === 0 ? 'in_progress' : 'pending',
        startTime: i === 0 ? new Date() : null,
        inputQuantity: i === 0 ? targetQuantity : 0
      })),
      currentStage: 1,
      expectedCompletion,
      cost: { materialCost },
      status: 'in_progress',
      startedAt: new Date(),
      createdBy: userId
    });

    // Deduct raw materials from stock
    for (const material of materialsConsumed) {
      await InventoryService.recordMovement({
        companyId,
        itemType: 'raw_material',
        itemId: material.material,
        movementType: 'production_out',
        quantity: -material.quantity,
        unitCost: material.unitCost,
        reference: {
          documentType: 'production_order',
          documentId: batch._id,
          documentNumber: batch.batchNumber
        },
        userId
      });
    }

    logger.info(`Production batch created: ${batch.batchNumber}`);
    return batch;
  }

  /**
   * Update production stage
   */
  static async updateStage(companyId, batchId, stageNumber, data, userId) {
    const { outputQuantity, rejectedQuantity, workers, notes } = data;

    const batch = await ProductionBatch.findOne({ _id: batchId, companyId });
    if (!batch) {
      throw new Error('Production batch not found');
    }

    const stage = batch.stages.find(s => s.stageNumber === stageNumber);
    if (!stage) {
      throw new Error('Stage not found');
    }

    // Update stage
    stage.outputQuantity = outputQuantity;
    stage.rejectedQuantity = rejectedQuantity;
    stage.workers = workers;
    stage.notes = notes;
    stage.status = 'completed';
    stage.endTime = new Date();

    // Calculate labour cost for this stage
    let stageLabourCost = 0;
    for (const workerId of workers) {
      const activities = await WorkerActivity.find({
        companyId,
        workerId,
        'production.batchId': batchId
      });
      stageLabourCost += activities.reduce((sum, a) => sum + (a.wages?.totalWages || 0), 0);
    }
    batch.cost.labourCost += stageLabourCost;

    // Update next stage
    const nextStage = batch.stages.find(s => s.stageNumber === stageNumber + 1);
    if (nextStage) {
      nextStage.status = 'in_progress';
      nextStage.startTime = new Date();
      nextStage.inputQuantity = outputQuantity;
      batch.currentStage = stageNumber + 1;
    }

    // Track loss
    if (rejectedQuantity > 0) {
      batch.loss.reasons.push({
        stage: stage.name,
        reason: notes || 'Quality rejection',
        quantity: rejectedQuantity
      });
    }

    // Calculate total cost
    batch.cost.totalCost = batch.cost.materialCost + batch.cost.labourCost + batch.cost.overheadCost;

    await batch.save();

    logger.info(`Production stage ${stageNumber} completed for batch ${batch.batchNumber}`);
    return batch;
  }

  /**
   * Complete production batch
   */
  static async completeBatch(companyId, batchId, data, userId) {
    const { actualOutput, quality } = data;

    const batch = await ProductionBatch.findOne({ _id: batchId, companyId });
    if (!batch) {
      throw new Error('Production batch not found');
    }

    // Update batch
    batch.actualOutput = actualOutput;
    batch.quality = quality;
    batch.status = 'completed';
    batch.completedAt = new Date();

    // Calculate final cost per piece
    batch.cost.costPerPiece = actualOutput.approved > 0
      ? batch.cost.totalCost / actualOutput.approved
      : 0;

    // Calculate loss
    const totalInput = batch.targetQuantity;
    batch.loss.totalLoss = totalInput - actualOutput.approved;
    batch.loss.lossPercentage = totalInput > 0
      ? (batch.loss.totalLoss / totalInput) * 100
      : 0;

    await batch.save();

    // Add finished goods to stock
    const finishedGood = await FinishedGood.findById(batch.finishedGood);
    if (finishedGood) {
      const variantId = batch.variant
        ? `${batch.variant.color || ''}-${batch.variant.size || ''}`
        : 'default';

      await InventoryService.recordMovement({
        companyId,
        itemType: 'finished_good',
        itemId: batch.finishedGood,
        variantId,
        movementType: 'production_in',
        quantity: actualOutput.approved,
        unitCost: batch.cost.costPerPiece,
        reference: {
          documentType: 'production_order',
          documentId: batch._id,
          documentNumber: batch.batchNumber
        },
        userId
      });

      // Update finished good costing
      const currentQty = finishedGood.totalStock.quantity;
      const currentValue = finishedGood.totalStock.value;
      const newQty = currentQty + actualOutput.approved;
      const newValue = currentValue + (actualOutput.approved * batch.cost.costPerPiece);

      finishedGood.costing.materialCost = (finishedGood.costing.materialCost * currentQty + batch.cost.materialCost * actualOutput.approved) / newQty;
      finishedGood.costing.labourCost = (finishedGood.costing.labourCost * currentQty + batch.cost.labourCost * actualOutput.approved) / newQty;
      finishedGood.costing.overheadCost = (finishedGood.costing.overheadCost * currentQty + batch.cost.overheadCost * actualOutput.approved) / newQty;
      finishedGood.costing.totalCost = finishedGood.costing.materialCost + finishedGood.costing.labourCost + finishedGood.costing.overheadCost;
      finishedGood.costing.lastCalculated = new Date();

      await finishedGood.save();
    }

    // Create ledger entry for production
    await this.postProductionToLedger(companyId, batch, userId);

    logger.info(`Production batch completed: ${batch.batchNumber}`);
    return batch;
  }

  /**
   * Post production to ledger
   */
  static async postProductionToLedger(companyId, batch, userId) {
    try {
      // Dr Finished Goods Inventory
      // Cr WIP / Production Cost
      const entries = [
        {
          accountId: (await require('../models').LedgerAccount.findOne({ companyId, code: '113003' }))?._id,
          entryType: 'debit',
          amount: batch.cost.totalCost,
          description: `Production ${batch.batchNumber}`
        },
        {
          accountId: (await require('../models').LedgerAccount.findOne({ companyId, code: '113002' }))?._id,
          entryType: 'credit',
          amount: batch.cost.totalCost,
          description: `WIP for ${batch.batchNumber}`
        }
      ];

      await AccountingService.createJournalEntry({
        companyId,
        date: batch.completedAt,
        description: { en: `Production Completion ${batch.batchNumber}`, ur: `پروڈکشن مکمل ${batch.batchNumber}` },
        entries,
        type: 'production',
        sourceDocument: {
          type: 'production_order',
          documentId: batch._id,
          documentNumber: batch.batchNumber
        }
      }, userId);
    } catch (error) {
      logger.error(`Failed to post production to ledger: ${error.message}`);
    }
  }

  /**
   * Get production report
   */
  static async getProductionReport(companyId, fromDate, toDate) {
    // Include completed batches by completion date, and in-progress/planned by start date
    const query = {
      companyId,
      $or: [
        { status: 'completed', completedAt: { $gte: fromDate, $lte: toDate } },
        { status: { $in: ['in_progress', 'planned', 'on_hold'] }, startedAt: { $gte: fromDate, $lte: toDate } },
        { status: { $in: ['in_progress', 'planned', 'on_hold'] }, createdAt: { $gte: fromDate, $lte: toDate } }
      ]
    };

    const batches = await ProductionBatch.find(query)
      .populate('finishedGood', 'name code')
      .sort({ completedAt: -1, createdAt: -1 });

    const summary = {
      totalBatches: batches.length,
      totalTarget: batches.reduce((sum, b) => sum + b.targetQuantity, 0),
      totalProduced: batches.reduce((sum, b) => sum + (b.actualOutput?.approved || 0), 0),
      totalRejected: batches.reduce((sum, b) => sum + (b.actualOutput?.rejected || 0), 0),
      totalCost: batches.reduce((sum, b) => sum + (b.cost?.totalCost || 0), 0),
      avgMaterialCost: batches.length > 0
        ? batches.reduce((sum, b) => sum + (b.cost?.materialCost || 0), 0) / batches.length
        : 0,
      avgLabourCost: batches.length > 0
        ? batches.reduce((sum, b) => sum + (b.cost?.labourCost || 0), 0) / batches.length
        : 0,
      avgLossPercentage: batches.length > 0
        ? batches.reduce((sum, b) => sum + (b.loss?.lossPercentage || 0), 0) / batches.length
        : 0
    };

    // Group by finished good
    const byProduct = batches.reduce((acc, batch) => {
      const productId = batch.finishedGood?._id?.toString();
      if (!productId) return acc;

      if (!acc[productId]) {
        acc[productId] = {
          product: batch.finishedGood,
          batches: 0,
          quantity: 0,
          cost: 0
        };
      }
      acc[productId].batches++;
      acc[productId].quantity += batch.actualOutput?.approved || 0;
      acc[productId].cost += batch.cost?.totalCost || 0;
      return acc;
    }, {});

    return {
      summary,
      byProduct: Object.values(byProduct),
      batches
    };
  }

  /**
   * Get WIP (Work in Progress) report
   */
  static async getWIPReport(companyId) {
    const batches = await ProductionBatch.find({
      companyId,
      status: { $in: ['in_progress', 'on_hold'] }
    })
      .populate('finishedGood', 'name code')
      .populate('stages.stage', 'name');

    const totalWIPValue = batches.reduce((sum, b) => sum + (b.cost?.totalCost || 0), 0);

    return {
      batches,
      count: batches.length,
      totalWIPValue
    };
  }

  /**
   * Get production efficiency report
   */
  static async getEfficiencyReport(companyId, fromDate, toDate) {
    const batches = await ProductionBatch.find({
      companyId,
      status: 'completed',
      completedAt: { $gte: fromDate, $lte: toDate }
    });

    const efficiency = batches.map(batch => ({
      batchNumber: batch.batchNumber,
      target: batch.targetQuantity,
      produced: batch.actualOutput?.approved || 0,
      efficiency: batch.targetQuantity > 0
        ? ((batch.actualOutput?.approved || 0) / batch.targetQuantity) * 100
        : 0,
      lossPercentage: batch.loss?.lossPercentage || 0,
      costPerPiece: batch.cost?.costPerPiece || 0
    }));

    const avgEfficiency = efficiency.length > 0
      ? efficiency.reduce((sum, e) => sum + e.efficiency, 0) / efficiency.length
      : 0;

    return {
      efficiency,
      averageEfficiency: avgEfficiency
    };
  }
}

module.exports = ProductionService;
