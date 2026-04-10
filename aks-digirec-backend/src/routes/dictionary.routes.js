const express = require('express');
const router = express.Router();
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// Get all translations
router.get('/translations', async (req, res) => {
  const Dictionary = require('../models/Dictionary');
  const { language = 'en' } = req.query;
  
  const translations = await Dictionary.getAllTranslations(req.companyId, language);
  
  res.json({ success: true, data: translations });
});

// Get dictionary entries
router.get('/', hasPermission('dictionary.view'), async (req, res) => {
  const Dictionary = require('../models/Dictionary');
  const { context, search, page = 1, limit = 100 } = req.query;
  
  const query = { 
    $or: [{ companyId: req.companyId }, { companyId: null, isSystem: true }],
    isActive: true
  };
  
  if (context) query.context = context;
  if (search) {
    query.$or = [
      { key: { $regex: search, $options: 'i' } },
      { 'defaultTranslations.en': { $regex: search, $options: 'i' } }
    ];
  }
  
  const entries = await Dictionary.find(query)
    .sort({ context: 1, key: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await Dictionary.countDocuments(query);
  
  res.json({
    success: true,
    data: entries,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

// Update translation
router.put('/:id', hasPermission('dictionary.edit'), async (req, res) => {
  const Dictionary = require('../models/Dictionary');
  const { customTranslations } = req.body;
  
  const entry = await Dictionary.findOneAndUpdate(
    { _id: req.params.id, $or: [{ companyId: req.companyId }, { companyId: null }] },
    { 
      customTranslations,
      updatedBy: req.user._id
    },
    { new: true }
  );
  
  if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
  
  res.json({ success: true, message: 'Translation updated', data: entry });
});

// Add new entry
router.post('/', hasPermission('dictionary.edit'), async (req, res) => {
  const Dictionary = require('../models/Dictionary');
  const { key, context, defaultTranslations } = req.body;
  
  const entry = await Dictionary.create({
    key,
    context,
    defaultTranslations,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  
  res.status(201).json({ success: true, message: 'Entry created', data: entry });
});

module.exports = router;
