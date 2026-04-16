const ProductionService = require('../services/production.service');
const ProductionBatch = require('../models/ProductionBatch');
const logger = require('../config/logger');

class ProductionController {
  /**
   * Get all production batches
   */
  async getBatches(req, res, next) {
    try {
      const { finishedGood, status, from, to, page = 1, limit = 50 } = req.query;
      
      const query = { companyId: req.companyId };
      if (finishedGood) query.finishedGood = finishedGood;
      if (status) query.status = status;
      if (from || to) {
        query.productionDate = {};
        if (from) query.productionDate.$gte = new Date(from);
        if (to) query.productionDate.$lte = new Date(to);
      }
      
      const batches = await ProductionBatch.find(query)
        .populate('finishedGood', 'name code')
        .populate('stages.stage', 'name code')
        .sort({ productionDate: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const count = await ProductionBatch.countDocuments(query);
      
      res.json({
        success: true,
        data: batches,
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total: count, 
          pages: Math.ceil(count / limit) 
        }
      });
    } catch (error) {
      logger.error('Get batches error:', error);
      next(error);
    }
  }

  /**
   * Create new production batch
   */
  async createBatch(req, res, next) {
    try {
      const batch = await ProductionService.createBatch(
        { ...req.body, companyId: req.companyId },
        req.user._id
      );
      
      res.status(201).json({
        success: true,
        message: 'Production batch created successfully',
        data: batch
      });
    } catch (error) {
      logger.error('Create batch error:', error);
      next(error);
    }
  }

  /**
   * Get single batch by ID
   */
  async getBatchById(req, res, next) {
    try {
      const batch = await ProductionBatch.findOne({ 
        _id: req.params.id, 
        companyId: req.companyId 
      })
        .populate('finishedGood', 'name code variants')
        .populate('stages.stage', 'name code')
        .populate('stages.workers', 'firstName lastName name')
        .populate('materialsConsumed.material', 'name code');
      
      if (!batch) {
        return res.status(404).json({ 
          success: false, 
          message: 'Batch not found' 
        });
      }
      
      res.json({ success: true, data: batch });
    } catch (error) {
      logger.error('Get batch error:', error);
      next(error);
    }
  }

  /**
   * Start production batch
   */
  async startBatch(req, res, next) {
    try {
      const batch = await ProductionBatch.findOneAndUpdate(
        { _id: req.params.id, companyId: req.companyId },
        { status: 'in_progress', startedAt: new Date() },
        { new: true }
      ).populate('finishedGood', 'name code');
      
      if (!batch) {
        return res.status(404).json({ 
          success: false, 
          message: 'Batch not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Production started', 
        data: batch 
      });
    } catch (error) {
      logger.error('Start batch error:', error);
      next(error);
    }
  }

  /**
   * Update production stage
   */
  async updateStage(req, res, next) {
    try {
      const { outputQuantity, rejectedQuantity, workers, notes } = req.body;
      
      const batch = await ProductionService.updateStage(
        req.companyId,
        req.params.id,
        parseInt(req.params.stageNumber),
        { outputQuantity, rejectedQuantity, workers, notes },
        req.user._id
      );
      
      res.json({
        success: true,
        message: 'Stage updated successfully',
        data: batch
      });
    } catch (error) {
      logger.error('Update stage error:', error);
      if (error.message === 'Production batch not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message === 'Stage not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  /**
   * Complete production batch
   */
  async completeBatch(req, res, next) {
    try {
      const { actualOutput, quality } = req.body;
      
      const batch = await ProductionService.completeBatch(
        req.companyId,
        req.params.id,
        { actualOutput, quality },
        req.user._id
      );
      
      res.json({
        success: true,
        message: 'Production completed successfully',
        data: batch
      });
    } catch (error) {
      logger.error('Complete batch error:', error);
      if (error.message === 'Production batch not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  /**
   * Get production pipeline/stages
   */
  async getProductionStages(req, res, next) {
    try {
      const Section = require('../models/Section');
      
      // Get unique production stages from sections
      const sections = await Section.find({ 
        companyId: req.companyId,
        status: 'active'
      }).select('sectionGroup mainSection subSection').lean();
      
      // Define standard production stages
      const standardStages = [
        { id: 'clay', name: 'Clay Forming', order: 1 },
        { id: 'glaze', name: 'Glaze & Color', order: 2 },
        { id: 'kiln', name: 'Kiln Firing', order: 3 },
        { id: 'flower', name: 'Flower Application', order: 4 },
        { id: 'sticker', name: 'Sticker Application', order: 5 },
        { id: 'packing', name: 'Packing', order: 6 }
      ];
      
      res.json({
        success: true,
        data: standardStages
      });
    } catch (error) {
      logger.error('Get stages error:', error);
      next(error);
    }
  }

  /**
   * Get production statistics
   */
  async getProductionStats(req, res, next) {
    try {
      const { from, to } = req.query;
      
      const query = { companyId: req.companyId };
      if (from || to) {
        query.productionDate = {};
        if (from) query.productionDate.$gte = new Date(from);
        if (to) query.productionDate.$lte = new Date(to);
      }
      
      const stats = await ProductionBatch.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$targetQuantity' },
            totalOutput: { $sum: '$actualOutput.approved' }
          }
        }
      ]);
      
      const summary = {
        planned: 0,
        in_progress: 0,
        completed: 0,
        totalBatches: 0,
        totalProduced: 0
      };
      
      stats.forEach(stat => {
        summary[stat._id] = stat.count;
        summary.totalBatches += stat.count;
        if (stat._id === 'completed') {
          summary.totalProduced = stat.totalOutput || 0;
        }
      });
      
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('Get stats error:', error);
      next(error);
    }
  }
}

module.exports = new ProductionController();
