(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ჯევონსის პარადოქსი", "back": "რესურსის უფრო ეფექტურმა გამოყენებამ შეიძლება მისი საერთო ხარჯი კი არა, ხარჯი გაზარდოს. თუ ძრავა ნაკლებ ნახშირს წვავს ერთი საქმისთვის, ნახშირი იაფდება და ადამიანები მას უფრო მეტ საქმეში იყენებენ. უილიამ სტენლი ჯევონსმა ეს მე-19 საუკუნის ნახშირზე თქვა. ეფექტურობა ერთეულზე ზოგავს, მასშტაბმა კი შეიძლება ეს დანაზოგი გადაფაროს."}, {"front": "ბრესის პარადოქსი", "back": "ახალმა გზამ შეიძლება ყველას მგზავრობა გაახანგრძლივოს. თუ მძღოლები მხოლოდ საკუთარ დროს ამცირებენ და ერთმანეთის შეფერხებას არ ითვალისწინებენ, მოკლე ახალი გზა შეიძლება საერთო საცობში გადაიზარდოს. დიტრიხ ბრესმა ეს ქსელის მაგალითზე აჩვენა. პირადი უმოკლესი გზა აქ საერთო უმოკლეს გზას არ ემთხვევა."}, {"front": "ნეშის წონასწორობა", "back": "სიტუაცია, სადაც არც ერთ მოთამაშეს არ აწყობს მხოლოდ საკუთარი გადაწყვეტილების შეცვლა, თუ დანარჩენები თავიანთს არ შეცვლიან. ეს აუცილებლად საუკეთესო საერთო შედეგი არ არის: პატიმრის დილემაში ორმხრივი გაცემა წონასწორობაა, თუმცა ორმხრივი დუმილი ორივესთვის უკეთესი იქნებოდა. სახელი ჯონ ნეშს ეკუთვნის."}, {"front": "ნულოვანი ჯამის თამაში", "back": "თამაში, სადაც ერთის მოგება ზუსტად მეორის წაგებაა და საერთო ჯამი არ იცვლება. ჭადრაკი, დავა ფიქსირებულ ბიუჯეტზე ან ერთი ადგილისთვის ბრძოლა ასეთია. ბევრი რეალური საქმე ნულოვანი ჯამის არ არის: ვაჭრობამ, თანამშრომლობამ ან ახალმა ცოდნამ შეიძლება ორივე მხარე გაზარდოს. შეცდომა ის არის, რომ არანულოვან საქმესაც მაინც გამარჯვებულად და დამარცხებულად კითხულობ."}];
  const expected = ["398ed764b828", "7d96fce167b8", "1725b6ee20f8", "56e4a384d04a"];
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