import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs'; // <--- Handles offline file reading
import { scrapeIndustrialData } from './scraper';

const app = express();
app.use(express.json());
app.use(cors());

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const VALID_LICENSES = ['BRAIN-PRO-999', 'LEAN-CRAFT-2026', 'SOLO-DEV-FREE'];

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.post('/api/verify-license', (req, res) => {
  const { licenseKey } = req.body;
  if (!licenseKey) return res.status(400).json({ valid: false, error: 'Key is missing.' });
  if (VALID_LICENSES.includes(licenseKey.toUpperCase().trim())) return res.json({ valid: true });
  return res.status(401).json({ valid: false, error: 'Invalid license key.' });
});

// ROUTE 1: 100% Offline Folder Scanner Engine
app.post('/api/analyze-local', async (req, res) => {
  const { question, licenseKey } = req.body;

  // License Guard
  if (!licenseKey || !VALID_LICENSES.includes(licenseKey.toUpperCase().trim())) {
    return res.status(403).json({ error: 'Feature locked. Active premium license required.' });
  }

  try {
    const targetDir = path.join(process.cwd(), 'data/manuals');
    if (!fs.existsSync(targetDir)) return res.status(500).json({ error: 'Data repository directory missing.' });

    // Read all raw documents inside our local offline directory
    const files = fs.readdirSync(targetDir);
    let aggregatedContext = '';

    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.csv')) {
        const fileContent = fs.readFileSync(path.join(targetDir, file), 'utf-8');
        aggregatedContext += `\n[Document: ${file}]\n${fileContent}\n`;
      }
    }

    if (!aggregatedContext) return res.status(400).json({ error: 'No offline text manuals found inside data/manuals/ folder.' });

    // Stream the localized raw text directly to your local Docker AI
    const systemPrompt = `You are an air-gapped industrial private brain. Analyze these corporate offline files:\n${aggregatedContext}\nNow answer this query using only the provided metrics: ${question}`;

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'hermes3:8b', prompt: systemPrompt, stream: false })
    });
    
    const result: any = await response.json();
    res.json({ reply: result.response, fileCount: files.length });

  } catch (error) {
    res.status(500).json({ error: 'Local AI pipeline failure.' });
  }
});

// ROUTE 2: Web Scraping Path (Kept for online fallback use cases)
app.post('/api/analyze-link', async (req, res) => {
  const { url, question, licenseKey } = req.body;
  if (!licenseKey || !VALID_LICENSES.includes(licenseKey.toUpperCase().trim())) return res.status(403).json({ error: 'Feature locked.' });
  if (!url || !question) return res.status(400).json({ error: 'Missing parameters.' });

  const data = await scrapeIndustrialData(url);
  if (!data) return res.status(500).json({ error: 'Scraper failed.' });

  try {
    const systemPrompt = `You are a private industrial brain. Analyze this documentation text:\n"${data.content}"\nAnswer: ${question}`;
    const response = await fetch(OLLAMA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'hermes3:8b', prompt: systemPrompt, stream: false }) });
    const result: any = await response.json();
    res.json({ source_title: data.title, reply: result.response });
  } catch (error) {
    res.status(500).json({ error: 'Local AI pipeline failure.' });
  }
});

app.listen(3000, () => console.log('🚀 Local Industrial Brain online at http://localhost:3000'));
