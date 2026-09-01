import * as cheerio from 'cheerio';

interface ScrapedData {
  title: string;
  content: string;
  source: string;
}

export async function scrapeIndustrialData(url: string): Promise<ScrapedData | null> {
  try {
    console.log(`🔍 Scraping industrial documentation from: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Compatible; IndustrialBrainBot/1.0)' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header').remove();
    const title = $('title').text().trim() || 'Untitled Manual';
    const content = $('p, li, h1, h2, h3')
      .map((_, el) => $(el).text().trim())
      .get()
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, 4000);

    return { title, content, source: url };
  } catch (error) {
    console.error(`❌ Failed to scrape ${url}:`, error);
    return null;
  }
}
