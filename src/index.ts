import express from 'express';
import cors from 'cors';
import path from 'path';
import { scrapeIndustrialData } from './scraper';

const app = express();
app.use(express.json());
app.use(cors());

const OLLAMA_URL = 'http://localhost:11434/api/generate';

// Route 1: Serve your visual HTML dashboard file
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Route 2: Scrape web data and process with your open-source AI engine
app.post('/api/analyze-link', async (req, res) => {
  const { url, question } = req.body;
  if (!url || !question) return res.status(400).json({ error: 'Both url and question fields are required' });

  const data = await scrapeIndustrialData(url);
  if (!data) return res.status(500).json({ error: 'Could not extract text from the provided link.' });

  try {
    const systemPrompt = `You are a private industrial brain. Analyze this documentation text carefully:\n\n"${data.content}"\n\nNow, answer this specific question using only that text: ${question}`;
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'hermes3:8b', prompt: systemPrompt, stream: false })
    });
    const result: any = await response.json();
    res.json({ source_title: data.title, reply: result.response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to communicate with local Docker model.' });
  }
});

app.listen(3000, () => console.log('🚀 Local Industrial Brain online at http://localhost:3000'));
