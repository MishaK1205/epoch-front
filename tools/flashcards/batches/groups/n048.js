(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ბოლცმანის ტვინი", "back": "ზოგ კოსმოლოგიურ სურათში შემთხვევითმა რყევამ უფრო ადვილად შეიძლება შექმნას ერთი მოკლე ტვინი, თავისი ცრუ მოგონებებით, ვიდრე მთელი მოწესრიგებული სამყარო. თუ ასეთი ტვინები დამკვირვებლებზე მეტია, მაშინ შენც უფრო სავარაუდოდ შემთხვევითი ტვინი ხარ, ვიდრე ნამდვილი ისტორიის მქონე ადამიანი. ეს დასკვნა აბსურდულად ითვლება და იმ თეორიების წინააღმდეგ მუშაობს, რომლებიც მას გარდაუვალს ხდის. სახელი ლუდვიგ ბოლცმანის სტატისტიკურ ფიზიკას უკავშირდება."}];
  const expected = ["201ce0e4ff37"];
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