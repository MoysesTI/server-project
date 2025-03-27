// server/controllers/KanbanController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// QUADROS KANBAN

// Obter todos os quadros do usuário
exports.getBoards = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const boards = await prisma.kanbanBoard.findMany({
      where: {
        OR: [
          { userId },
          { 
            members: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        _count: {
          select: {
            columns: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    // Contar cartões para cada quadro
    const boardsWithCounts = await Promise.all(boards.map(async (board) => {
      const cardCount = await prisma.kanbanCard.count({
        where: {
          column: {
            boardId: board.id
          }
        }
      });
      
      return {
        ...board,
        totalCards: cardCount,
        totalColumns: board._count.columns
      };
    }));
    
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
    const userId = req.user.id;
    
    // Verificar se o usuário tem acesso ao quadro
    const board = await prisma.kanbanBoard.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { 
            members: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        columns: {
          orderBy: {
            order: 'asc'
          },
          include: {
            cards: {
              orderBy: {
                order: 'asc'
              },
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true
                  }
                },
                budget: true
              }
            }
          }
        }
      }
    });
    
    if (!board) {
      return res.status(404).json({ message: 'Quadro não encontrado ou acesso não autorizado' });
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
    const { title, description, color } = req.body;
    const userId = req.user.id;
    
    // Criar o quadro
    const board = await prisma.kanbanBoard.create({
      data: {
        title,
        description: description || null,
        color: color || "#5664d2", // Cor padrão se não especificada
        user: {
          connect: { id: userId }
        },
        // Criar automaticamente três colunas padrão
        columns: {
          create: [
            {
              title: 'A Fazer',
              order: 0,
              color: "#f8f9fa",
              user: {
                connect: { id: userId }
              }
            },
            {
              title: 'Em Progresso',
              order: 1,
              color: "#e9ecef",
              user: {
                connect: { id: userId }
              }
            },
            {
              title: 'Concluído',
              order: 2,
              color: "#dee2e6",
              user: {
                connect: { id: userId }
              }
            }
          ]
        }
      },
      include: {
        columns: true
      }
    });
    
    res.status(201).json({
      message: 'Quadro criado com sucesso',
      board: {
        ...board,
        totalCards: 0,
        totalColumns: 3
      }
    });
  } catch (error) {
    console.error('Erro ao criar quadro:', error);
    res.status(500).json({ message: 'Erro ao criar quadro', error: error.message });
  }
};

// Atualizar um quadro existente
exports.updateBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, color } = req.body;
    const userId = req.user.id;
    
    // Verificar se o usuário tem permissão para editar
    const existingBoard = await prisma.kanbanBoard.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingBoard) {
      return res.status(404).json({ message: 'Quadro não encontrado ou você não tem permissão para editá-lo' });
    }
    
    // Atualizar o quadro
    const board = await prisma.kanbanBoard.update({
      where: { id },
      data: {
        title,
        description,
        color,
        updatedAt: new Date()
      }
    });
    
    res.status(200).json({
      message: 'Quadro atualizado com sucesso',
      board
    });
  } catch (error) {
    console.error('Erro ao atualizar quadro:', error);
    res.status(500).json({ message: 'Erro ao atualizar quadro', error: error.message });
  }
};

// Excluir um quadro
exports.deleteBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar se o usuário tem permissão para excluir
    const existingBoard = await prisma.kanbanBoard.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingBoard) {
      return res.status(404).json({ message: 'Quadro não encontrado ou você não tem permissão para excluí-lo' });
    }
    
    // Excluir o quadro e seus relacionamentos (cascade delete configurado no schema)
    await prisma.kanbanBoard.delete({
      where: { id }
    });
    
    res.status(200).json({
      message: 'Quadro excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir quadro:', error);
    res.status(500).json({ message: 'Erro ao excluir quadro', error: error.message });
  }
};

// COLUNAS DO QUADRO

// Criar uma nova coluna
exports.createColumn = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, color } = req.body;
    const userId = req.user.id;
    
    // Verificar se o usuário tem permissão
    const board = await prisma.kanbanBoard.findFirst({
      where: {
        id: boardId,
        userId
      }
    });
    
    if (!board) {
      return res.status(404).json({ message: 'Quadro não encontrado ou você não tem permissão' });
    }
    
    // Encontrar o maior valor de ordem atual para posicionar a nova coluna ao final
    const maxOrder = await prisma.kanbanColumn.aggregate({
      where: { boardId },
      _max: { order: true }
    });
    
    const order = (maxOrder._max.order ?? -1) + 1;
    
    // Criar a coluna
    const column = await prisma.kanbanColumn.create({
      data: {
        title,
        order,
        color: color || "#f8f9fa",
        board: {
          connect: { id: boardId }
        },
        user: {
          connect: { id: userId }
        }
      }
    });
    
    res.status(201).json({
      message: 'Coluna criada com sucesso',
      column
    });
  } catch (error) {
    console.error('Erro ao criar coluna:', error);
    res.status(500).json({ message: 'Erro ao criar coluna', error: error.message });
  }
};

// Atualizar uma coluna existente
exports.updateColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, color } = req.body;
    const userId = req.user.id;
    
    // Verificar se o usuário tem permissão
    const column = await prisma.kanbanColumn.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            board: {
              userId
            }
          }
        ]
      }
    });
    
    if (!column) {
      return res.status(404).json({ message: 'Coluna não encontrada ou você não tem permissão' });
    }
    
    // Atualizar a coluna
    const updatedColumn = await prisma.kanbanColumn.update({
      where: { id },
      data: {
        title,
        color,
        updatedAt: new Date()
      }
    });
    
    res.status(200).json({
      message: 'Coluna atualizada com sucesso',
      column: updatedColumn
    });
  } catch (error) {
    console.error('Erro ao atualizar coluna:', error);
    res.status(500).json({ message: 'Erro ao atualizar coluna', error: error.message });
  }
};

// Excluir uma coluna
exports.deleteColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar se o usuário tem permissão
    const column = await prisma.kanbanColumn.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            board: {
              userId
            }
          }
        ]
      }
    });
    
    if (!column) {
      return res.status(404).json({ message: 'Coluna não encontrada ou você não tem permissão' });
    }
    
    // Excluir a coluna e seus cartões (cascade delete configurado no schema)
    await prisma.kanbanColumn.delete({
      where: { id }
    });
    
    // Reordenar as colunas restantes
    const columnsToUpdate = await prisma.kanbanColumn.findMany({
      where: {
        boardId: column.boardId,
        order: {
          gt: column.order
        }
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    // Atualizar a ordem das colunas restantes
    for (const col of columnsToUpdate) {
      await prisma.kanbanColumn.update({
        where: { id: col.id },
        data: { order: col.order - 1 }
      });
    }
    
    res.status(200).json({
      message: 'Coluna excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir coluna:', error);
    res.status(500).json({ message: 'Erro ao excluir coluna', error: error.message });
  }
};

// Reordenar colunas
exports.reorderColumns = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { columnIds } = req.body; // Array de IDs na nova ordem
    const userId = req.user.id;
    
    // Verificar se o usuário tem permissão
    const board = await prisma.kanbanBoard.findFirst({
      where: {
        id: boardId,
        userId
      }
    });
    
    if (!board) {
      return res.status(404).json({ message: 'Quadro não encontrado ou você não tem permissão' });
    }
    
    // Atualizar a ordem de cada coluna
    for (let i = 0; i < columnIds.length; i++) {
      await prisma.kanbanColumn.update({
        where: { id: columnIds[i] },
        data: { order: i }
      });
    }
    
    res.status(200).json({
      message: 'Ordem das colunas atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao reordenar colunas:', error);
    res.status(500).json({ message: 'Erro ao reordenar colunas', error: error.message });
  }
};

// CARTÕES DO QUADRO

// Criar um novo cartão
exports.createCard = async (req, res) => {
  try {
    const { columnId } = req.params;
    const { title, description, dueDate, budgetId, assigneeId, color, labels } = req.body;
    const userId = req.user.id;
    
    // Verificar se a coluna existe e o usuário tem acesso
    const column = await prisma.kanbanColumn.findFirst({
      where: {
        id: columnId,
        OR: [
          { userId },
          {
            board: {
              OR: [
                { userId },
                { 
                  members: {
                    some: { userId }
                  }
                }
              ]
            }
          }
        ]
      },
      include: {
        cards: true
      }
    });
    
    if (!column) {
      return res.status(404).json({ message: 'Coluna não encontrada ou você não tem permissão' });
    }
    
    // Encontrar a ordem mais alta para adicionar ao final
    const maxOrder = await prisma.kanbanCard.aggregate({
      where: { columnId },
      _max: { order: true }
    });
    
    const order = (maxOrder._max.order ?? -1) + 1;
    
    // Preparar os dados do cartão
    const cardData = {
      title,
      description: description || null,
      order,
      color: color || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      column: { connect: { id: columnId } },
      user: { connect: { id: userId } }
    };
    
    // Adicionar conexão com orçamento se fornecido
    if (budgetId) {
      cardData.budget = { 
        connect: { id: budgetId }
      };
    }
    
    // Adicionar atribuição ao usuário se fornecido
    if (assigneeId) {
      cardData.assignee = {
        connect: { id: assigneeId }
      };
    }
    
    // Criar o cartão
    const card = await prisma.kanbanCard.create({
      data: cardData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        budget: true
      }
    });
    
    // Se houver labels, conectá-los ao cartão
    if (labels && labels.length > 0) {
      for (const labelId of labels) {
        await prisma.cardLabel.create({
          data: {
            card: { connect: { id: card.id } },
            label: { connect: { id: labelId } }
          }
        });
      }
      
      // Recarregar o cartão com as labels
      const updatedCard = await prisma.kanbanCard.findUnique({
        where: { id: card.id },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          },
          budget: true,
          labels: {
            include: {
              label: true
            }
          }
        }
      });
      
      res.status(201).json({
        message: 'Cartão criado com sucesso',
        card: updatedCard
      });
    } else {
      res.status(201).json({
        message: 'Cartão criado com sucesso',
        card
      });
    }
  } catch (error) {
    console.error('Erro ao criar cartão:', error);
    res.status(500).json({ message: 'Erro ao criar cartão', error: error.message });
  }
};

// Atualizar um cartão existente
exports.updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, budgetId, assigneeId, color, labels } = req.body;
    const userId = req.user.id;
    
    // Verificar se o cartão existe e o usuário tem acesso
    const card = await prisma.kanbanCard.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            column: {
              board: {
                OR: [
                  { userId },
                  { 
                    members: {
                      some: { userId }
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Cartão não encontrado ou você não tem permissão' });
    }
    
    // Preparar os dados para atualização
    const cardData = {
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      color,
      updatedAt: new Date()
    };
    
    // Atualizar conexão com orçamento
    if (budgetId !== undefined) {
      if (budgetId) {
        cardData.budget = { connect: { id: budgetId } };
      } else {
        cardData.budget = { disconnect: true };
      }
    }
    
    // Atualizar atribuição ao usuário
    if (assigneeId !== undefined) {
      if (assigneeId) {
        cardData.assignee = { connect: { id: assigneeId } };
      } else {
        cardData.assignee = { disconnect: true };
      }
    }
    
    // Atualizar o cartão
    const updatedCard = await prisma.kanbanCard.update({
      where: { id },
      data: cardData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        budget: true,
        labels: {
          include: {
            label: true
          }
        }
      }
    });
    
    // Se houver labels, atualizar as conexões
    if (labels) {
      // Primeiro, remover todas as conexões existentes
      await prisma.cardLabel.deleteMany({
        where: { cardId: id }
      });
      
      // Depois, adicionar as novas conexões
      if (labels.length > 0) {
        for (const labelId of labels) {
          await prisma.cardLabel.create({
            data: {
              card: { connect: { id } },
              label: { connect: { id: labelId } }
            }
          });
        }
      }
      
      // Recarregar o cartão com as novas labels
      const cardWithLabels = await prisma.kanbanCard.findUnique({
        where: { id },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          },
          budget: true,
          labels: {
            include: {
              label: true
            }
          }
        }
      });
      
      res.status(200).json({
        message: 'Cartão atualizado com sucesso',
        card: cardWithLabels
      });
    } else {
      res.status(200).json({
        message: 'Cartão atualizado com sucesso',
        card: updatedCard
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar cartão:', error);
    res.status(500).json({ message: 'Erro ao atualizar cartão', error: error.message });
  }
};

// Excluir um cartão
exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar se o cartão existe e o usuário tem acesso
    const card = await prisma.kanbanCard.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            column: {
              board: {
                OR: [
                  { userId },
                  { 
                    members: {
                      some: { userId }
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Cartão não encontrado ou você não tem permissão' });
    }
    
    // Excluir o cartão
    await prisma.kanbanCard.delete({
      where: { id }
    });
    
    // Reordenar os cartões restantes
    const cardsToUpdate = await prisma.kanbanCard.findMany({
      where: {
        columnId: card.columnId,
        order: {
          gt: card.order
        }
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    // Atualizar a ordem dos cartões restantes
    for (const cardItem of cardsToUpdate) {
      await prisma.kanbanCard.update({
        where: { id: cardItem.id },
        data: { order: cardItem.order - 1 }
      });
    }
    
    res.status(200).json({
      message: 'Cartão excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir cartão:', error);
    res.status(500).json({ message: 'Erro ao excluir cartão', error: error.message });
  }
};

// Mover um cartão entre colunas
exports.moveCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { columnId, position } = req.body;
    const userId = req.user.id;
    
    // Verificar se o cartão existe e o usuário tem acesso
    const card = await prisma.kanbanCard.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            column: {
              board: {
                OR: [
                  { userId },
                  { 
                    members: {
                      some: { userId }
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    });
    
    if (!card) {
      return res.status(404).json({ message: 'Cartão não encontrado ou você não tem permissão' });
    }
    
    // Verificar se está movendo para outra coluna
    if (card.columnId !== columnId) {
      // Se estiver movendo para outra coluna, primeiro fazer espaço na coluna de destino
      await prisma.$transaction(async (prisma) => {
        // Obter cartões na coluna de destino com ordem >= posição desejada
        const cardsToUpdate = await prisma.kanbanCard.findMany({
          where: {
            columnId,
            order: {
              gte: position
            }
          },
          orderBy: {
            order: 'asc'
          }
        });
        
        // Mover todos os cartões uma posição para baixo
        for (const cardItem of cardsToUpdate) {
          await prisma.kanbanCard.update({
            where: { id: cardItem.id },
            data: { order: cardItem.order + 1 }
          });
        }
        
        // Reordenar cartões na coluna de origem
        const sourceCardsToUpdate = await prisma.kanbanCard.findMany({
          where: {
            columnId: card.columnId,
            order: {
              gt: card.order
            }
          },
          orderBy: {
            order: 'asc'
          }
        });
        
        // Mover cartões na coluna de origem
        for (const cardItem of sourceCardsToUpdate) {
          await prisma.kanbanCard.update({
            where: { id: cardItem.id },
            data: { order: cardItem.order - 1 }
          });
        }
        
        // Finalmente mover o cartão para a nova coluna e posição
        await prisma.kanbanCard.update({
          where: { id },
          data: {
            columnId,
            order: position
          }
        });
      });
    } else {
      // Se for na mesma coluna, ajustar a ordem
      await prisma.$transaction(async (prisma) => {
        if (card.order < position) {
          // Mover para baixo
          const cardsToUpdate = await prisma.kanbanCard.findMany({
            where: {
              columnId,
              order: {
                gt: card.order,
                lte: position
              }
            },
            orderBy: {
              order: 'asc'
            }
          });
          
          for (const cardItem of cardsToUpdate) {
            await prisma.kanbanCard.update({
              where: { id: cardItem.id },
              data: { order: cardItem.order - 1 }
            });
          }
        } else if (card.order > position) {
          // Mover para cima
          const cardsToUpdate = await prisma.kanbanCard.findMany({
            where: {
              columnId,
              order: {
                gte: position,
                lt: card.order
              }
            },
            orderBy: {
              order: 'asc'
            }
          });
          
          for (const cardItem of cardsToUpdate) {
            await prisma.kanbanCard.update({
              where: { id: cardItem.id },
              data: { order: cardItem.order + 1 }
            });
          }
        }
        
        // Atualizar o cartão para a nova posição
        await prisma.kanbanCard.update({
          where: { id },
          data: { order: position }
        });
      });
    }
    
    res.status(200).json({
      message: 'Cartão movido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao mover cartão:', error);
    res.status(500).json({ message: 'Erro ao mover cartão', error: error.message });
  }
};

// ROTAS AUXILIARES

// Obter usuários disponíveis para atribuição
exports.getAvailableUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obter usuários da mesma organização (exemplo simplificado)
    // Em um ambiente real, você precisaria de lógica mais complexa para determinar os usuários disponíveis
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Erro ao obter usuários disponíveis:', error);
    res.status(500).json({ message: 'Erro ao obter usuários disponíveis', error: error.message });
  }
};

// Obter orçamentos disponíveis para vincular aos cartões
exports.getBudgetsForBoard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obter orçamentos não completados
    const budgets = await prisma.budget.findMany({
      where: {
        OR: [
          { userId },
          { 
            // Exemplo: orçamentos compartilhados com o usuário
            assignees: {
              some: { userId }
            }
          }
        ],
        status: {
          notIn: ['COMPLETED', 'CANCELED']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(budgets);
  } catch (error) {
    console.error('Erro ao obter orçamentos:', error);
    res.status(500).json({ message: 'Erro ao obter orçamentos', error: error.message });
  }
};

// Obter etiquetas disponíveis para os cartões
exports.getLabels = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;
    
    // Obter etiquetas específicas do quadro
    const boardLabels = await prisma.kanbanLabel.findMany({
      where: {
        boardId
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // Se não houver etiquetas para este quadro, criar algumas etiquetas padrão
    if (boardLabels.length === 0) {
      const defaultLabels = [
        { name: 'Prioridade Alta', color: '#f44336' }, // Vermelho
        { name: 'Prioridade Média', color: '#ff9800' }, // Laranja
        { name: 'Prioridade Baixa', color: '#4caf50' }, // Verde
        { name: 'Bug', color: '#9c27b0' }, // Roxo
        { name: 'Melhoria', color: '#2196f3' } // Azul
      ];
      
      const createdLabels = [];
      
      for (const label of defaultLabels) {
        const newLabel = await prisma.kanbanLabel.create({
          data: {
            name: label.name,
            color: label.color,
            board: {
              connect: { id: boardId }
            },
            user: {
              connect: { id: userId }
            }
          }
        });
        
        createdLabels.push(newLabel);
      }
      
      res.status(200).json(createdLabels);
    } else {
      res.status(200).json(boardLabels);
    }
  } catch (error) {
    console.error('Erro ao obter etiquetas:', error);
    res.status(500).json({ message: 'Erro ao obter etiquetas', error: error.message });
  }
};

// Criar uma nova etiqueta
exports.createLabel = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, color } = req.body;
    const userId = req.user.id;
    
    // Verificar permissão
    const board = await prisma.kanbanBoard.findFirst({
      where: {
        id: boardId,
        OR: [
          { userId },
          { 
            members: {
              some: { userId }
            }
          }
        ]
      }
    });
    
    if (!board) {
      return res.status(404).json({ message: 'Quadro não encontrado ou acesso não autorizado' });
    }
    
    // Criar a etiqueta
    const label = await prisma.kanbanLabel.create({
      data: {
        name,
        color,
        board: {
          connect: { id: boardId }
        },
        user: {
          connect: { id: userId }
        }
      }
    });
    
    res.status(201).json({
      message: 'Etiqueta criada com sucesso',
      label
    });
  } catch (error) {
    console.error('Erro ao criar etiqueta:', error);
    res.status(500).json({ message: 'Erro ao criar etiqueta', error: error.message });
  }
};