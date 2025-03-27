// server/controllers/kanbanController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dados simulados para desenvolvimento rápido
const mockBudgets = [
  {
    id: '1',
    serviceNumber: '2503-0001',
    clientName: 'Empresa ABC',
    company: 'ABC Ltda',
    totalAmount: 2500.00,
    status: 'PENDING'
  },
  {
    id: '2',
    serviceNumber: '2503-0002',
    clientName: 'Empresa XYZ',
    company: 'XYZ Comércio',
    totalAmount: 3800.00,
    status: 'APPROVED'
  },
  {
    id: '3',
    serviceNumber: '2503-0003',
    clientName: 'João Silva',
    company: null,
    totalAmount: 1200.00,
    status: 'COMPLETED'
  }
];

const mockBoards = [
  {
    id: '1',
    title: 'Projetos Gráficos',
    description: 'Controle de projetos de design gráfico',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: '1',
    columns: [
      {
        id: '101',
        title: 'A Fazer',
        order: 0,
        boardId: '1',
        cards: [
          {
            id: '1001',
            title: 'Criar logo para cliente XYZ',
            description: 'Desenvolver 3 propostas de logo para o cliente',
            order: 0,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            columnId: '101',
            budgetId: '2',
            budget: mockBudgets[1]
          },
          {
            id: '1002',
            title: 'Banner para evento',
            description: 'Banner 2m x 1m para feira de negócios',
            order: 1,
            columnId: '101'
          }
        ]
      },
      {
        id: '102',
        title: 'Em Progresso',
        order: 1,
        boardId: '1',
        cards: [
          {
            id: '1003',
            title: 'Cartão de visita Empresa ABC',
            description: 'Finalizar arte do cartão de visita',
            order: 0,
            columnId: '102',
            budgetId: '1',
            budget: mockBudgets[0]
          }
        ]
      },
      {
        id: '103',
        title: 'Concluído',
        order: 2,
        boardId: '1',
        cards: [
          {
            id: '1004',
            title: 'Folder institucional',
            description: 'Folder 3 dobras para divulgação',
            order: 0,
            columnId: '103'
          }
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'Comunicação Visual',
    description: 'Projetos de comunicação visual e sinalização',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: '1',
    columns: [
      {
        id: '201',
        title: 'A Fazer',
        order: 0,
        boardId: '2',
        cards: []
      },
      {
        id: '202',
        title: 'Em Progresso',
        order: 1,
        boardId: '2',
        cards: [
          {
            id: '2001',
            title: 'Sinalização interna Shopping',
            description: 'Projeto de sinalização para novo shopping',
            order: 0,
            columnId: '202',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            budgetId: '3',
            budget: mockBudgets[2]
          }
        ]
      },
      {
        id: '203',
        title: 'Concluído',
        order: 2,
        boardId: '2',
        cards: []
      }
    ]
  }
];

// QUADROS KANBAN

// Obter todos os quadros do usuário
exports.getBoards = async (req, res) => {
  try {
    // Simulação para desenvolvimento rápido
    const boardsWithCounts = mockBoards.map(board => {
      const totalCards = board.columns.reduce((total, column) => total + column.cards.length, 0);
      return {
        id: board.id,
        title: board.title,
        description: board.description,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        userId: board.userId,
        totalCards,
        totalColumns: board.columns.length
      };
    });
    
    res.status(200).json(boardsWithCounts);
  } catch (error) {
    console.error('Erro ao obter quadros:', error);
    res.status(500).json({ message: 'Erro ao obter quadros', error: error.message });
  }
};

// Obter um quadro específico com colunas e cartões
exports.getBoardById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Simulação para desenvolvimento rápido
    const board = mockBoards.find(b => b.id === id);
    
    if (!board) {
      return res.status(404).json({ message: 'Quadro não encontrado' });
    }
    
    res.status(200).json(board);
  } catch (error) {
    console.error('Erro ao obter quadro:', error);
    res.status(500).json({ message: 'Erro ao obter quadro', error: error.message });
  }
};

// Criar um novo quadro
exports.createBoard = async (req, res) => {
  try {
    const { title, description, budgetId } = req.body;
    
    // Simulação para desenvolvimento rápido
    const newBoard = {
      id: Date.now().toString(),
      title,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: '1',
      columns: [
        {
          id: `col-${Date.now()}-1`,
          title: 'A Fazer',
          order: 0,
          boardId: Date.now().toString(),
          cards: []
        },
        {
          id: `col-${Date.now()}-2`,
          title: 'Em Progresso',
          order: 1,
          boardId: Date.now().toString(),
          cards: []
        },
        {
          id: `col-${Date.now()}-3`,
          title: 'Concluído',
          order: 2,
          boardId: Date.now().toString(),
          cards: []
        }
      ]
    };
    
    mockBoards.push(newBoard);
    
    const boardResponse = {
      ...newBoard,
      totalCards: 0,
      totalColumns: 3
    };
    
    res.status(201).json({
      message: 'Quadro criado com sucesso',
      board: boardResponse
    });
  } catch (error) {
    console.error('Erro ao criar quadro:', error);
    res.status(500).json({ message: 'Erro ao criar quadro', error: error.message });
  }
};

// Obter orçamentos disponíveis para o quadro
exports.getBudgetsForBoard = async (req, res) => {
  try {
    // Simulação para desenvolvimento rápido
    res.status(200).json(mockBudgets);
  } catch (error) {
    console.error('Erro ao obter orçamentos para o quadro:', error);
    res.status(500).json({ message: 'Erro ao obter orçamentos', error: error.message });
  }
};

// Simulação básica de CRUD para o restante das operações

exports.updateBoard = async (req, res) => {
  res.status(200).json({
    message: 'Quadro atualizado com sucesso',
    board: { id: req.params.id, ...req.body }
  });
};

exports.deleteBoard = async (req, res) => {
  res.status(200).json({
    message: 'Quadro excluído com sucesso'
  });
};

exports.createColumn = async (req, res) => {
  const column = {
    id: `col-${Date.now()}`,
    title: req.body.title,
    order: req.body.order || 0,
    boardId: req.params.boardId,
    cards: []
  };
  
  res.status(201).json({
    message: 'Coluna criada com sucesso',
    column
  });
};

exports.updateColumn = async (req, res) => {
  res.status(200).json({
    message: 'Coluna atualizada com sucesso',
    column: { id: req.params.id, title: req.body.title }
  });
};

exports.deleteColumn = async (req, res) => {
  res.status(200).json({
    message: 'Coluna excluída com sucesso'
  });
};

exports.createCard = async (req, res) => {
  const card = {
    id: `card-${Date.now()}`,
    title: req.body.title,
    description: req.body.description || '',
    order: 0,
    columnId: req.params.columnId,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate).toISOString() : null,
    budgetId: req.body.budgetId || null,
    budget: req.body.budgetId ? mockBudgets.find(b => b.id === req.body.budgetId) : null
  };
  
  res.status(201).json({
    message: 'Cartão criado com sucesso',
    card
  });
};

exports.updateCard = async (req, res) => {
  const updatedCard = {
    id: req.params.id,
    ...req.body,
    budget: req.body.budgetId ? mockBudgets.find(b => b.id === req.body.budgetId) : null
  };
  
  res.status(200).json({
    message: 'Cartão atualizado com sucesso',
    card: updatedCard
  });
};

exports.deleteCard = async (req, res) => {
  res.status(200).json({
    message: 'Cartão excluído com sucesso'
  });
};

exports.moveCard = async (req, res) => {
  res.status(200).json({
    message: 'Cartão movido com sucesso'
  });
};

exports.reorderColumns = async (req, res) => {
  res.status(200).json({
    message: 'Ordem das colunas atualizada com sucesso'
  });
};