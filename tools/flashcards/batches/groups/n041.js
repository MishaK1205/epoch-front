(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "სანქტ-პეტერბურგის პარადოქსი", "back": "მონეტას ყრიან, სანამ საფასური არ ამოვა. თუ ეს პირველ ჯერზე მოხდა, იღებ 1-ს, მეორეზე 2-ს, მესამეზე 4-ს და ასე, ყოველ ჯერზე გაორმაგებულს. მოგების საშუალო მნიშვნელობა უსასრულოა, მაგრამ გონიერი ადამიანი თამაშში მხოლოდ მცირე თანხას იხდის. დანიელ ბერნულიმ ეს უსასრულო საშუალო შეარიგა მოკრძალებულ ფასს იმ აზრით, რომ ფულის ყოველი ახალი ერთეული ნაკლებ სარგებელს მატებს."}];
  const expected = ["fb80ffad5292"];
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