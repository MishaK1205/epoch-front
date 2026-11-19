(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ადელსონის ჩრდილის ილუზია", "back": "ჭადრაკის დაფის ორი უჯრა ერთი და იმავე ნაცრისფერია, მაგრამ ჩრდილში მყოფი გაცილებით ღიად ჩანს. ტვინი ფერს მარტო ლაქის სიკაშკაშით კი არა, ჩრდილითა და მეზობელი უჯრებით აფასებს და „ნამდვილ“ ფერს ცდილობს ამოიცნოს. ამიტომ ერთი და იგივე საღებავი სხვადასხვა ფერად აღიქმება. ილუზია ედუარდ ადელსონმა შექმნა."}, {"front": "პარეიდოლია", "back": "ადამიანი სახეებს, ცხოველებს ან ნაცნობ ფორმებს ხედავს იქ, სადაც მხოლოდ ლაქა, ღრუბელი ან კედლის ფაქტურაა. ტვინი არასრულ ნიმუშს ნაცნობ საგანამდე ავსებს, განსაკუთრებით სახემდე, რადგან სახის ამოცნობა სწრაფი და მნიშვნელოვანია. პარეიდოლია შეცდომაა მხოლოდ მაშინ, როცა ამ ფორმას ნამდვილ საგნად მივიჩნევთ."}, {"front": "აპოფენია", "back": "ადამიანი შემთხვევით მოვლენებში აზრს, კანონზომიერებას ან კავშირს ხედავს. პარეიდოლია მისი მხედველობითი სახეობაა, აპოფენია კი უფრო ფართოა: რიცხვებში, ამბებში და დამთხვევებშიც ვლინდება. ნიმუშის ძებნა სასარგებლოა, მაგრამ შემთხვევით ჯგუფს კანონად თუ ჩათვლი, ცრუ დასკვნამდე მიხვალ."}, {"front": "კოქტეილის ეფექტი", "back": "ხმაურიან ოთახში ადამიანი ერთ საუბარს მიჰყვება და დანარჩენ ხმებს ფონად ტოვებს. ამავე დროს, უყურადღებო საუბარშიც გაიგებს საკუთარ სახელს. ყურადღება ერთ ნაკადს არჩევს, მაგრამ მნიშვნელოვან სიგნალზე მაინც რჩება ღია. ეფექტი კოლინ ჩერმა მე-20 საუკუნის შუა წლებში აღწერა."}];
  const expected = ["0fc6c8106533", "4be889a7b2a3", "7c0fd6052567", "3eb0fdbb5a32"];
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