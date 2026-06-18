const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

const SLA_HOURS = { High: 2, Medium: 8, Low: 24 };

const ticketSchema = new mongoose.Schema({
  title: String,
  description: String,
  priority: { type: String, default: 'Low' },
  category: { type: String, default: 'Software' },
  status: { type: String, default: 'Open' },
  slaDeadline: { type: Date },
  assignee: { type: String, default: 'Unassigned' },
  activityLog: [{ action: String, timestamp: { type: Date, default: Date.now } }],
  comments: [{ text: String, author: { type: String, default: 'Agent' }, timestamp: { type: Date, default: Date.now } }],
}, { timestamps: true });

const Ticket = mongoose.model('Ticket', ticketSchema);

// AI Categorize route
app.post('/ai/categorize', async (req, res) => {
  try {
    const { title, description } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{ role: 'user', content: `You are an IT support classifier. Respond ONLY with JSON like {"priority":"High","category":"Network"}. Priority: Low/Medium/High. Category: Software/Hardware/Network. Title: "${title}" Description: "${description}"` }]
      })
    });
    const data = await response.json();
    const text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (e) {
    res.status(500).json({ error: 'AI failed' });
  }
});

// AI Summarize route
app.post('/ai/summarize', async (req, res) => {
  try {
    const { ticket } = req.body;
    const comments = ticket.comments && ticket.comments.length > 0
      ? ticket.comments.map(c => `${c.author}: ${c.text}`).join('\n')
      : 'No comments yet.';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: `You are an IT support expert. Summarize this ticket and suggest a fix in 3-4 sentences.\n\nTicket: ${ticket.title}\nDescription: ${ticket.description || 'N/A'}\nPriority: ${ticket.priority}\nCategory: ${ticket.category}\nStatus: ${ticket.status}\nComments:\n${comments}` }]
      })
    });
    const data = await response.json();
    res.json({ summary: data.content[0].text });
  } catch (e) {
    res.status(500).json({ error: 'AI failed' });
  }
});

app.get('/tickets', async (req, res) => {
  const tickets = await Ticket.find().sort({ createdAt: -1 });
  res.json(tickets);
});

app.post('/tickets', async (req, res) => {
  const hours = SLA_HOURS[req.body.priority] || 24;
  const slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);
  const ticket = new Ticket({ ...req.body, slaDeadline, activityLog: [{ action: 'Ticket created' }] });
  await ticket.save();
  res.json(ticket);
});

app.patch('/tickets/:id', async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  const updateFields = { ...req.body };
  const logEntry = [];
  if (req.body.status && req.body.status !== ticket.status) logEntry.push({ action: `Status changed to "${req.body.status}"` });
  if (req.body.priority && req.body.priority !== ticket.priority) {
    updateFields.slaDeadline = new Date(Date.now() + (SLA_HOURS[req.body.priority] || 24) * 60 * 60 * 1000);
    logEntry.push({ action: `Priority changed to "${req.body.priority}"` });
  }
  if (req.body.title && req.body.title !== ticket.title) logEntry.push({ action: 'Title updated' });
  if (req.body.assignee && req.body.assignee !== ticket.assignee) logEntry.push({ action: `Assigned to "${req.body.assignee}"` });
  await Ticket.updateOne({ _id: req.params.id }, { ...updateFields, ...(logEntry.length > 0 ? { $push: { activityLog: { $each: logEntry } } } : {}) });
  res.json(await Ticket.findById(req.params.id));
});

app.post('/ai/summarize', async (req, res) => {
  try {
    const { ticket } = req.body;
    const comments = ticket.comments && ticket.comments.length > 0
      ? ticket.comments.map(c => `${c.author}: ${c.text}`).join('\n')
      : 'No comments yet.';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: `Summarize this IT ticket and suggest a fix in 3-4 sentences. Ticket: ${ticket.title}. Description: ${ticket.description || 'N/A'}. Priority: ${ticket.priority}. Category: ${ticket.category}.` }]
      })
    });
    const data = await response.json();
    console.log("Anthropic response:", JSON.stringify(data));
    if (data.error) return res.status(500).json({ error: data.error.message });
    res.json({ summary: data.content[0].text });
  } catch (e) {
    console.error("Summarize error:", e);
    res.status(500).json({ error: e.message });
  }

app.delete('/tickets/:id/comments/:commentIndex', async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  ticket.comments.splice(req.params.commentIndex, 1);
  await ticket.save();
  res.json(ticket);
});

app.delete('/tickets/:id', async (req, res) => {
  await Ticket.findByIdAndDelete(req.params.id);
  res.json({ message: 'Ticket deleted' });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(5000, () => console.log('Server running on port 5000')))
  .catch(err => console.log(err));