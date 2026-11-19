(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "პიტერის პრინციპი", "back": "იერარქიაში ადამიანი იმაღლებს იქამდე, სანამ იმ თანამდებობას არ მიაღწევს, რომელსაც უკვე ვეღარ ართმევს თავს, და იქ რჩება. დაწინაურება აქ წინა საქმეში წარმატებას მოსდევს, ახალი საქმე კი სხვა უნარს ითხოვს. ლორენს პიტერმა ეს სატირულ პრინციპად ჩამოაყალიბა. ის კანონი არ არის, მაგრამ კარგად ხსნის, რატომ შეიძლება კარგი სპეციალისტი სუსტი ხელმძღვანელი გახდეს."}];
  const expected = ["e25ab80ea524"];
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