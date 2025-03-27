// server/controllers/invoiceController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Gerar número de nota fiscal único
const generateInvoiceNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Encontrar a última nota fiscal do mês atual
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `NF${year}${month}`
      }
    },
    orderBy: {
      invoiceNumber: 'desc'
    }
  });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `NF${year}${month}${sequence.toString().padStart(4, '0')}`;
};

// Criar nota fiscal a partir de um orçamento
exports.createInvoice = async (req, res) => {
  try {
    const { budgetId, dueDate, notes } = req.body;
    const userId = req.user.id;
    
    // Verificar se o orçamento existe e pertence ao usuário
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId
      },
      include: {
        invoice: true
      }
    });
    
    if (!budget) {
      return res.status(404).json({ message: 'Orçamento não encontrado' });
    }
    
    // Verificar se já existe uma nota fiscal para este orçamento
    if (budget.invoice) {
      return res.status(400).json({ message: 'Este orçamento já possui uma nota fiscal' });
    }
    
    // Gerar número de nota fiscal
    const invoiceNumber = await generateInvoiceNumber();
    
    // Criar nota fiscal
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        dueDate: new Date(dueDate),
        notes,
        totalAmount: budget.totalAmount,
        budgetId,
        userId
      }
    });
    
    // Atualizar status do orçamento para COMPLETED
    await prisma.budget.update({
      where: { id: budgetId },
      data: { status: 'COMPLETED' }
    });
    
    res.status(201).json({
      message: 'Nota fiscal criada com sucesso',
      invoice
    });
  } catch (error) {
    console.error('Erro ao criar nota fiscal:', error);
    res.status(500).json({ message: 'Erro ao criar nota fiscal', error: error.message });
  }
};

// Obter todas as notas fiscais do usuário
exports.getInvoices = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentStatus } = req.query;
    
    const whereClause = { userId };
    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
    }
    
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        budget: {
          include: {
            items: true
          }
        }
      },
      orderBy: { issueDate: 'desc' }
    });
    
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Erro ao obter notas fiscais:', error);
    res.status(500).json({ message: 'Erro ao obter notas fiscais', error: error.message });
  }
};

// Obter nota fiscal por ID
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId
      },
      include: {
        budget: {
          include: {
            items: true
          }
        }
      }
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Nota fiscal não encontrada' });
    }
    
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Erro ao obter nota fiscal:', error);
    res.status(500).json({ message: 'Erro ao obter nota fiscal', error: error.message });
  }
};

// Atualizar status de pagamento da nota fiscal
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const userId = req.user.id;
    
    // Verificar se a nota fiscal existe e pertence ao usuário
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Nota fiscal não encontrada' });
    }
    
    // Atualizar status de pagamento
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { paymentStatus },
      include: {
        budget: {
          include: {
            items: true
          }
        }
      }
    });
    
    res.status(200).json({
      message: 'Status de pagamento atualizado com sucesso',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Erro ao atualizar status de pagamento:', error);
    res.status(500).json({ message: 'Erro ao atualizar status de pagamento', error: error.message });
  }
};
