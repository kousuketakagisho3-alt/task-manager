// Vercel Serverless Function: AIアドバイスの中継役
// ブラウザからのリクエストを受け、Anthropic APIへ安全に転送する。
// APIキーは環境変数 ANTHROPIC_API_KEY から読み込む（コードには含めない）。

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'APIキーが設定されていません（環境変数 ANTHROPIC_API_KEY を確認してください）。' });
    return;
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt がありません。' });
      return;
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(upstream.status).json({ error: 'AIリクエストに失敗しました。', detail });
      return;
    }

    const data = await upstream.json();
    const text = (data.content || []).map((c) => c.text || '').join('');
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: '内部エラーが発生しました。', detail: String(e) });
  }
}
