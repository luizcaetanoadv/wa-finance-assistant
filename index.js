const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Rota básica de teste
app.get('/', (req, res) => {
  res.json({ message: 'WhatsApp Finance Assistant está funcionando!' });
});

// Lista usuários (teste do banco)
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cria usuário (teste do banco)
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

// Verificação do webhook (Meta chama via GET com hub.*)
app.get('/webhook', (req, res) => {
  console.log('GET /webhook query:', req.query);

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso');
    return res.status(200).send(challenge);
  }

  console.log(
    'Falha na verificação do webhook. Token recebido:',
    token,
    'Token esperado:',
    process.env.VERIFY_TOKEN
  );
  return res.sendStatus(403);
});

// Recebimento de mensagens (Meta chama via POST)
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Meta exige resposta rápida
    res.sendStatus(200);

    console.log('POST /webhook body:', JSON.stringify(body));

    if (!body?.entry?.length) return;

    const changes = body.entry[0]?.changes?.[0];
    const value = changes?.value;

    const messages = value?.messages;
    if (!messages || !messages.length) return;

    const msg = messages[0];
    const from = msg.from; // número do usuário (formato internacional, sem +)
    const text = msg?.text?.body;

    if (!from || !text) return;

    // Resposta simples (echo)
    await sendWhatsAppText(from, `Recebi sua mensagem: ${text}`);
  } catch (error) {
    console.error('Webhook error:', error);
  }
});

// Envia mensagem via WhatsApp Cloud API
async function sendWhatsAppText(to, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error('Faltam WHATSAPP_TOKEN ou PHONE_NUMBER_ID');
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    text: { body: message },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error('Erro ao enviar WhatsApp:', data);
  } else {
    console.log('Mensagem enviada com sucesso:', data);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
