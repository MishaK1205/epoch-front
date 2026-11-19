(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ბრუკსის კანონი", "back": "დაგვიანებულ პროგრამულ პროექტს ახალი ადამიანების დამატება კიდევ უფრო აგვიანებს. ახალმა ადამიანმა უნდა ისწავლოს, ძველმა კი უნდა ასწავლოს, და გამრავლებული კავშირები კოორდინაციას აძვირებს. ფრედ ბრუკსმა ეს „მითურ ადამიანთვეში“ დაწერა. კანონი ყველა საქმეზე არ გადადის, მაგრამ კარგად ხსნის, რატომ ვერ იცვლება რთული გუნდური საქმე იმ სიჩქარით, რომლითაც ადამიანებს ამატებ."}];
  const expected = ["da0c82bf4c74"];
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