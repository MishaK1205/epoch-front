(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "დანაკარგის ზიზღი", "back": "ერთი და იგივე ოდენობის დანაკარგი უფრო მძაფრად გვაწუხებს, ვიდრე იმავე ოდენობის მოგება გვახარებს. ამიტომ ადამიანი ხშირად უფრო მეტს აკეთებს ასი ლარის შესანარჩუნებლად, ვიდრე ასი ლარის მოსაგებად. ზუსტი თანაფარდობა სიტუაციის მიხედვით იცვლება, მიმართულება კი მდგრადია: დანაკარგი ფსიქოლოგიურ სასწორზე უფრო მძიმეა."}, {"front": "ფლობის ეფექტი", "back": "ნივთს უფრო მეტად ვაფასებთ მას შემდეგ, რაც ის ჩვენი გახდა. ცდებში ადამიანი უფრო მაღალ ფასს ითხოვს ჭიქაში, რომელიც ახლახან მიიღო, ვიდრე თავად გადაიხდიდა იმავე ჭიქაში მანამდე. საკუთრება ნივთს დამატებით ღირებულებას კი არ მატებს, გაყრას ხდის ფსიქოლოგიურად ძვირს. ეფექტი დანაკარგის ზიზღს ენათესავება."}, {"front": "ჩაძირული ხარჯის ცდომილება", "back": "ადამიანი აგრძელებს საქმეს იმიტომ, რომ უკვე ბევრი დრო, ფული ან ძალა დახარჯა, თუმცა ეს დანახარჯი უკან აღარ ბრუნდება. გადაწყვეტილებას მხოლოდ მომავალი სარგებელი და მომავალი ფასი უნდა წყვეტდეს. „ეს რაღაც ტყუილად არ ჩაივლოს“ ხშირად კიდევ უფრო დიდ ზარალს ამატებს. იგივე აზრს კონკორდის ცდომილებასაც ეძახიან, თვითმფრინავის პროექტის გამო, რომელიც ზარალის მიუხედავად გრძელდებოდა."}, {"front": "მოთამაშის ცდომილება", "back": "ადამიანი ფიქრობს, რომ შემთხვევითი მწკრივის შემდეგ საპირისპირო შედეგი „ვალად“ არის. ხუთი წითლის შემდეგ შავი უფრო მოსალოდნელი არ ხდება, თუ გათამაშება კვლავ დამოუკიდებელია. მონეტას მეხსიერება არ აქვს. ცდომილება სამართლიანი ბალანსის მოლოდინს ერთ ცალკეულ ჯერზე გადმოაქვს."}];
  const expected = ["1afdaabb1461", "32d35b945357", "9cb17d29bbcb", "979b6de74532"];
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