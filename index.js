const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Rota básica de teste
app.get('/', (req, res) => {
  res.json({ message: 'WhatsApp Finance Assistant está funcionando!' });
});

// Rota para listar usuários (exemplo com Prisma)
app.post('/users', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email é obrigatório' });
    }

    const user = await prisma.user.create({
      data: { email, name },
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
