// server/index.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Importar rotas
const authRoutes = require('./routes/auth');
// Descomentar quando os arquivos estiverem prontos
const kanbanRoutes = require('./routes/kanban');
const budgetRoutes = require('./routes/budget');
// const invoiceRoutes = require('./routes/invoice');
// const dashboardRoutes = require('./routes/dashboard');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/budgets', express.static(path.join(__dirname, '..', 'budgets')));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('API do Kaban Compilação está funcionando!');
});

// Rota de teste para Kanban
app.get('/api/test', (req, res) => {
  res.json({ message: 'Rota de teste funcionando!' });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/budgets', budgetRoutes);
// app.use('/api/invoices', invoiceRoutes);
// app.use('/api/dashboard', dashboardRoutes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ 
    message: 'Erro interno no servidor',
    error: err.message 
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  console.log(`Rota não encontrada: ${req.originalUrl}`);
  res.status(404).json({ message: 'Endpoint não encontrado' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Teste o servidor em: http://localhost:${PORT}`);
  console.log(`Verifique se a rota de teste está funcionando: http://localhost:${PORT}/api/test`);
});

// Capturar exceções não tratadas
process.on('uncaughtException', (error) => {
  console.error('Erro não tratado:', error);
});

// Lidar com o encerramento do processo
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});