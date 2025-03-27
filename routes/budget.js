// server/routes/budget.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authMiddleware } = require('../middlewares/auth');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Rotas
router.get('/', budgetController.getBudgets);
router.post('/', budgetController.upload.array('images', 20), budgetController.createBudget);
router.get('/selection', budgetController.getBudgetsForSelection);
router.get('/:id', budgetController.getBudgetById);
router.put('/:id', budgetController.upload.array('images', 20), budgetController.updateBudget);
router.patch('/:id/status', budgetController.updateBudgetStatus);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;