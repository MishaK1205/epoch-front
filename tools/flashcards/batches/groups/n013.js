(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "საბაზისო სიხშირის უგულებელყოფა", "back": "ადამიანი კონკრეტულ, ცოცხალ აღწერას უფრო ენდობა, ვიდრე იმას, რამდენად ხშირია ეს რამ საერთოდ. თუ დაავადება იშვიათია, დადებითი ტესტიც კი შეიძლება უფრო ხშირად მცდარი იყოს, ვიდრე ჭეშმარიტი, მაგრამ აღწერა ამ რიცხვს ფარავს. კარგი დასკვნა ჯერ საერთო სიხშირეს ამოწმებს და მხოლოდ მერე ამატებს კონკრეტულ ნიშანს."}];
  const expected = ["d1b771056a18"];
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