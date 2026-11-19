(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "აბილენის პარადოქსი", "back": "ჯგუფი ირჩევს იმას, რაც არც ერთ წევრს არ სურს, რადგან თითოეულს ჰგონია, რომ დანარჩენებს სურთ. სახელი ამბიდან მოდის, სადაც ოჯახი აბილენში მიდის ცხელ, მოსაწყენ გზაზე და ბოლოს ირკვევა, რომ წასვლა არავის უნდოდა. პარადოქსი ჯერი ჰარვიმ აღწერა. ის პლურალისტურ უმეცრებას ენათესავება: საერთო სურვილი კი არა, საერთო დუმილი წყვეტს."}];
  const expected = ["fcd8e2934717"];
  const actual = [];
  for (const card of cards) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(card.back));
    actual.push([...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12));
  }
  if (actual.join(',') !== expected.join(',')) return { ok: false, actual, expected };
  const categoryId = '6afc2730a7cf5e24b11c0829';
  const errors = [];
  let created = 0;
  for (const card of cards) {
    const res = await fetch('https://api.epoch.ge/flashcards', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ front: card.front, back: card.back, categoryId })
    });
    if (!res.ok) {
      const body = await res.text();
      errors.push({ front: card.front, status: res.status, body: body.slice(0, 160) });
      if (res.status === 401 || res.status === 403) break;
    } else created++;
  }
  return { created, errors, count: cards.length, fronts: cards.map(c => c.front) };
})()