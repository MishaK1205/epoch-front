// Run in the browser on http://localhost:4200 (`npm run start:prod-api`) while logged in as a
// moderator or admin, and while serve.py is running. Creates every article from
// build/payloads.json as a draft; titles that already exist are skipped. Nothing is published.
(async () => {
  const API = 'https://api.epoch.ge';
  const BUILD = 'http://127.0.0.1:4399';
  const token = localStorage.getItem('epoch_access_token');
  if (!token) return 'Not logged in';
  const auth = { Authorization: `Bearer ${token}` };

  const getJson = async (url, init) => {
    const res = await fetch(url, init);
    const body = await res.json();
    if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} -> ${res.status} ${JSON.stringify(body)}`);
    return body;
  };

  const payloads = await getJson(`${BUILD}/payloads.json`);
  const categories = await getJson(`${API}/categories`);
  const existing = new Set();
  for (let page = 1, total = Infinity; (page - 1) * 100 < total; page++) {
    const list = await getJson(`${API}/articles/manage?limit=100&page=${page}`, { headers: auth });
    list.items.forEach((a) => existing.add(a.title));
    total = list.total;
  }

  const log = [];
  for (const p of payloads) {
    if (existing.has(p.title)) {
      log.push(`skip (exists): ${p.title}`);
      continue;
    }
    const category = categories.find((c) => c.name === p.category || c.slug === p.category);
    if (!category) {
      log.push(`FAIL ${p.title}: no category "${p.category}"`);
      continue;
    }
    const blob = await (await fetch(`${BUILD}/images/${p.imageFile}`)).blob();
    const form = new FormData();
    form.append('file', new File([blob], p.imageFile, { type: p.imageType }));
    form.append('alt', p.alt);
    const image = await getJson(`${API}/images`, { method: 'POST', headers: auth, body: form });
    const article = await getJson(`${API}/articles`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: p.title,
        content: p.content,
        coverImageId: image.id,
        categoryId: category.id,
        tags: p.tags,
      }),
    });
    const intact = article.content === p.content ? 'content intact' : 'CONTENT CHANGED BY SERVER';
    log.push(`${article.status}: ${article.title} (${article.id}, /${article.slug}) — ${intact}`);
  }
  return log.join('\n');
})();
