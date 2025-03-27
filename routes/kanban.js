// server/routes/kanban.js
const express = require('express');
const router = express.Router();
const kanbanController = require('../controllers/KanbanController');
const { authMiddleware } = require('../middlewares/auth');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Rotas de quadros
router.get('/boards', kanbanController.getBoards);
router.post('/boards', kanbanController.createBoard);
router.get('/boards/:id', kanbanController.getBoardById);
router.put('/boards/:id', kanbanController.updateBoard);
router.delete('/boards/:id', kanbanController.deleteBoard);

// Rotas de colunas
router.post('/boards/:boardId/columns', kanbanController.createColumn);
router.put('/columns/:id', kanbanController.updateColumn);
router.delete('/columns/:id', kanbanController.deleteColumn);
router.patch('/boards/:boardId/columns/reorder', kanbanController.reorderColumns);

// Rotas de cartões
router.post('/columns/:columnId/cards', kanbanController.createCard);
router.put('/cards/:id', kanbanController.updateCard);
router.delete('/cards/:id', kanbanController.deleteCard);
router.patch('/cards/:id/move', kanbanController.moveCard);

// Rotas auxiliares
router.get('/budgets', kanbanController.getBudgetsForBoard);

module.exports = router;