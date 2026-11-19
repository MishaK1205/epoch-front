(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "კონიუნქციის ცდომილება", "back": "ადამიანი უფრო სავარაუდოდ თვლის ორ პირობას ერთად, ვიდრე ერთს მათგანს ცალკე, როცა წყვილი უფრო დამაჯერებელ ამბავს ქმნის. ცნობილ მაგალითში ლინდა უფრო ჰგავს „ბანკის მოლარეს და ფემინისტს“, ვიდრე უბრალოდ ბანკის მოლარეს, თუმცა ორივე თვისება ერთად ვერ იქნება უფრო ხშირი, ვიდრე მარტო მოლარეობა. დეტალური ამბავი აქ ალბათობას ანაცვლებს."}, {"front": "პროკურორის ცდომილება", "back": "ადამიანი ურევს ორ სხვადასხვა ალბათობას: რამდენად იშვიათია მტკიცებულება უდანაშაულოს შემთხვევაში, და რამდენად სავარაუდოა უდანაშაულობა ამ მტკიცებულების პირობებში. თუ კვალი ათასიდან ერთ უდანაშაულოსაც შეიძლება შეხვდეს, ეს არ ნიშნავს, რომ ბრალდებული 99.9 პროცენტით დამნაშავეა. ჯერ უნდა იცოდე, რამდენი ასეთი ადამიანია საერთოდ და რამდენი მათგანი მოხვდა ეჭვმიტანილებში."}, {"front": "ქუჩის ფარნის ეფექტი", "back": "ადამიანი პასუხს იქ ეძებს, სადაც ძებნა ადვილია, და არა იქ, სადაც პასუხი უფრო სავარაუდოა. სახელი იმ ხუმრობიდან მოდის, სადაც მთვრალი გასაღებს ფარნის ქვეშ ეძებს, რადგან იქაა სინათლე, თუმცა გასაღები სხვაგან დაკარგა. გაზომვადი და ხელმისაწვდომი მონაცემი ხშირად სწორედ ასეთი ფარანია."}, {"front": "მაკნამარას ცდომილება", "back": "გადაწყვეტილებას მხოლოდ იმას აბარებ, რაც ადვილად იზომება, და უგულებელყოფ იმას, რაც მნიშვნელოვანია, მაგრამ რიცხვში ცუდად ჯდება. რიცხვი სიზუსტის შთაბეჭდილებას ტოვებს მაშინაც, როცა ის საქმის მხოლოდ ვიწრო ნაწილს ფარავს. სახელი რობერტ მაკნამარას მართვის სტილს დაუკავშირეს. კარგი საზომი დამხმარეა, მაგრამ საზომის სია მიზნის სია არ არის."}];
  const expected = ["9e2ab2bb8975", "36698d6ca349", "f4059e27054e", "e7d913d2252b"];
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