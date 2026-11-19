(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "მატეის ეფექტი", "back": "ვისაც უკვე აქვს უპირატესობა, მას უფრო ადვილად ემატება ახალი უპირატესობა. ცნობილ მეცნიერს იმავე აღმოჩენისთვის უფრო მეტი ცნობა ხვდება, ვიდრე უცნობს, მდიდარს კი უფრო ადვილად ეძლევა ახალი შესაძლებლობა. რობერტ მერტონმა სახელი მათეს სახარებიდან აიღო: ვისაც აქვს, მას მიემატება. ასე პატარა საწყისი სხვაობა დროთა განმავლობაში დიდ უფსკრულად იქცევა."}, {"front": "მატილდას ეფექტი", "back": "ქალების სამეცნიერო შრომა ხშირად კაც კოლეგებს მიეწერებოდა ან ნაკლებად ჩანდა. სახელი მატილდა ჯოსლინ გეიჯს უკავშირდება, ცნება კი მარგარეტ როსიტერმა დაასახელა. ეს მატეის ეფექტის უსამართლო ვარიანტია: აღიარება მიდის არა მხოლოდ უკვე ცნობილისკენ, არამედ იმ ჯგუფისკენ, რომელსაც ავტორობას წინასწარ უფრო უჯერებენ."}, {"front": "სტრაისენდის ეფექტი", "back": "ინფორმაციის დამალვის ან აკრძალვის მცდელობამ შეიძლება სწორედ ის გაავრცელოს, რისი დამალვაც გინდოდა. სახელი 2003 წლიდან მოდის, როცა ბარბრა სტრაისენდის სარჩელმა იშვიათი ფოტო გაცილებით ცნობილი გახადა. აკრძალვა აქ ყურადღების ნიშანი ხდება. ეფექტი ყველა დახურულ ინფორმაციაზე არ მოქმედებს, მაგრამ ხმამაღალი აკრძალვა ხშირად თავად არის რეკლამა."}, {"front": "კობრის ეფექტი", "back": "წახალისებამ შეიძლება საპირისპირო შედეგი მოიტანოს, თუ ადამიანები ჯილდოს თავად პრობლემის გამრავლებით მიიღებენ. ცნობილი ამბავი ასე მიდის: კობრებზე დაწესებულმა პრემიამ ადამიანებს კობრების მოშენება დააწყებინა. ამ ამბის ისტორიული წყარო საეჭვოა, მაგრამ სახელი დარჩა ნამდვილ ნიმუშზე. ცუდად დაყენებული ჯილდო ზომავს არა მიზანს, არამედ იმ გზას, რომლითაც ჯილდოს მოპოვება ყველაზე ადვილია."}];
  const expected = ["676799638a54", "f0bce398936b", "75ac64959bd8", "a7816551103f"];
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