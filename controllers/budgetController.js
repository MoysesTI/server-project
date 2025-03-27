// server/controllers/budgetController.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// Configuração do diretório base para orçamentos
const BUDGETS_DIR = process.env.BUDGETS_DIR || path.join(__dirname, '..', '..', 'budgets');

// Garantir que o diretório base exista
if (!fs.existsSync(BUDGETS_DIR)) {
  fs.mkdirSync(BUDGETS_DIR, { recursive: true });
}

// Dados simulados para desenvolvimento rápido
const mockBudgets = [
  {
    id: '1',
    serviceNumber: '2503-0001',
    clientName: 'Empresa ABC',
    clientEmail: 'contato@abc.com',
    clientPhone: '11987654321',
    company: 'ABC Ltda',
    totalAmount: 2500.00,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: '1',
    items: [
      {
        id: '101',
        description: 'Design de logo',
        quantity: 1,
        unitPrice: 1500.00,
        totalPrice: 1500.00,
        imageUrl: null,
        budgetId: '1'
      },
      {
        id: '102',
        description: 'Cartão de visita',
        quantity: 1000,
        unitPrice: 1.00,
        totalPrice: 1000.00,
        imageUrl: null,
        budgetId: '1'
      }
    ]
  },
  {
    id: '2',
    serviceNumber: '2503-0002',
    clientName: 'Empresa XYZ',
    clientEmail: 'contato@xyz.com',
    clientPhone: '11912345678',
    company: 'XYZ Comércio',
    totalAmount: 3800.00,
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: '1',
    items: [
      {
        id: '201',
        description: 'Site institucional',
        quantity: 1,
        unitPrice: 3800.00,
        totalPrice: 3800.00,
        imageUrl: null,
        budgetId: '2'
      }
    ]
  },
  {
    id: '3',
    serviceNumber: '2503-0003',
    clientName: 'João Silva',
    clientEmail: 'joao@email.com',
    clientPhone: '11998765432',
    company: null,
    totalAmount: 1200.00,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: '1',
    items: [
      {
        id: '301',
        description: 'Folder promocional',
        quantity: 500,
        unitPrice: 2.40,
        totalPrice: 1200.00,
        imageUrl: null,
        budgetId: '3'
      }
    ]
  }
];

// Upload simulado
exports.upload = {
  array: () => (req, res, next) => {
    req.files = [];
    next();
  }
};

// Obter todos os orçamentos do usuário
exports.getBudgets = async (req, res) => {
  try {
    // Simulação para desenvolvimento rápido
    const { status, limit } = req.query;
    
    // Filtrar por status se fornecido
    let filteredBudgets = [...mockBudgets];
    if (status) {
      filteredBudgets = filteredBudgets.filter(b => b.status === status);
    }
    
    // Limitar resultados se fornecido
    if (limit) {
      filteredBudgets = filteredBudgets.slice(0, parseInt(limit));
    }
    
    res.status(200).json(filteredBudgets);
  } catch (error) {
    console.error('Erro ao obter orçamentos:', error);
    res.status(500).json({ message: 'Erro ao obter orçamentos', error: error.message });
  }
};

// Obter orçamento por ID
exports.getBudgetById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Simulação para desenvolvimento rápido
    const budget = mockBudgets.find(b => b.id === id);
    
    if (!budget) {
      return res.status(404).json({ message: 'Orçamento não encontrado' });
    }
    
    res.status(200).json(budget);
  } catch (error) {
    console.error('Erro ao obter orçamento:', error);
    res.status(500).json({ message: 'Erro ao obter orçamento', error: error.message });
  }
};

// Criar orçamento
exports.createBudget = async (req, res) => {
  try {
    const { clientName, clientEmail, clientPhone, company, items } = req.body;
    
    // Simulação de número de serviço
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequenceNumber = Math.floor(1000 + Math.random() * 9000);
    const serviceNumber = `${year}${month}${sequenceNumber}`;
    
    // Criar diretório para o orçamento
    const budgetDir = path.join(BUDGETS_DIR, serviceNumber);
    if (!fs.existsSync(budgetDir)) {
      fs.mkdirSync(budgetDir, { recursive: true });
    }
    
    // Preparar itens e calcular valor total
    let totalAmount = 0;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : (items || []);
    
    // Criar novos itens
    const budgetItems = parsedItems.map(item => {
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      
      return {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: item.description,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice,
        imageUrl: null,
        budgetId: `budget-${Date.now()}`
      };
    });
    
    // Criar novo orçamento
    const newBudget = {
      id: `budget-${Date.now()}`,
      serviceNumber,
      clientName,
      clientEmail,
      clientPhone,
      company,
      totalAmount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: req.user.id,
      items: budgetItems
    };
    
    // Adicionar à lista simulada
    mockBudgets.push(newBudget);
    
    // Criar arquivo JSON com os dados do orçamento
    fs.writeFileSync(
      path.join(budgetDir, 'budget.json'),
      JSON.stringify(newBudget, null, 2)
    );
    
    res.status(201).json({
      message: 'Orçamento criado com sucesso',
      budget: newBudget
    });
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    res.status(500).json({ message: 'Erro ao criar orçamento', error: error.message });
  }
};

// Atualizar status do orçamento
exports.updateBudgetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Simulação para desenvolvimento rápido
    const budgetIndex = mockBudgets.findIndex(b => b.id === id);
    
    if (budgetIndex === -1) {
      return res.status(404).json({ message: 'Orçamento não encontrado' });
    }
    
    // Atualizar status
    mockBudgets[budgetIndex].status = status;
    mockBudgets[budgetIndex].updatedAt = new Date().toISOString();
    
    res.status(200).json({
      message: 'Status do orçamento atualizado com sucesso',
      budget: mockBudgets[budgetIndex]
    });
  } catch (error) {
    console.error('Erro ao atualizar status do orçamento:', error);
    res.status(500).json({ message: 'Erro ao atualizar status', error: error.message });
  }
};

// Atualizar orçamento
exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, clientEmail, clientPhone, company, items } = req.body;
    
    // Simulação para desenvolvimento rápido
    const budgetIndex = mockBudgets.findIndex(b => b.id === id);
    
    if (budgetIndex === -1) {
      return res.status(404).json({ message: 'Orçamento não encontrado' });
    }
    
    // Atualizar dados do cliente
    if (clientName) mockBudgets[budgetIndex].clientName = clientName;
    if (clientEmail !== undefined) mockBudgets[budgetIndex].clientEmail = clientEmail;
    if (clientPhone !== undefined) mockBudgets[budgetIndex].clientPhone = clientPhone;
    if (company !== undefined) mockBudgets[budgetIndex].company = company;
    
    // Atualizar itens se fornecidos
    if (items) {
      const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
      
      let totalAmount = 0;
      const newItems = parsedItems.map(item => {
        const totalPrice = item.quantity * item.unitPrice;
        totalAmount += totalPrice;
        
        return {
          id: item.id || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          description: item.description,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice,
          imageUrl: item.imageUrl || null,
          budgetId: id
        };
      });
      
      mockBudgets[budgetIndex].items = newItems;
      mockBudgets[budgetIndex].totalAmount = totalAmount;
    }
    
    mockBudgets[budgetIndex].updatedAt = new Date().toISOString();
    
    res.status(200).json({
      message: 'Orçamento atualizado com sucesso',
      budget: mockBudgets[budgetIndex]
    });
  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error);
    res.status(500).json({ message: 'Erro ao atualizar orçamento', error: error.message });
  }
};

// Excluir orçamento
exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Simulação para desenvolvimento rápido
    const budgetIndex = mockBudgets.findIndex(b => b.id === id);
    
    if (budgetIndex === -1) {
      return res.status(404).json({ message: 'Orçamento não encontrado' });
    }
    
    // Remover da lista simulada
    mockBudgets.splice(budgetIndex, 1);
    
    res.status(200).json({
      message: 'Orçamento excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    res.status(500).json({ message: 'Erro ao excluir orçamento', error: error.message });
  }
};

// Obter orçamentos para seleção no Kanban
exports.getBudgetsForSelection = async (req, res) => {
  try {
    // Simulação para desenvolvimento rápido
    const filteredBudgets = mockBudgets
      .filter(b => b.status !== 'CANCELED' && b.status !== 'REJECTED')
      .map(b => ({
        id: b.id,
        serviceNumber: b.serviceNumber,
        clientName: b.clientName,
        company: b.company,
        totalAmount: b.totalAmount,
        status: b.status
      }));
    
    res.status(200).json(filteredBudgets);
  } catch (error) {
    console.error('Erro ao obter orçamentos para seleção:', error);
    res.status(500).json({ message: 'Erro ao obter orçamentos', error: error.message });
  }
};