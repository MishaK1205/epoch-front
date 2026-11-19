(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "გამჭვირვალობის ილუზია", "back": "ადამიანი აჭარბებს, რამდენად კითხულობენ სხვები მის შინაგან მდგომარეობას. თუ ნერვიულობ, გგონია, რომ ეს ყველას ეტყობა; თუ ტყუილს ამბობ, გგონია, რომ სახე გღალატობს. შიგნით განცდა ძლიერია, გარეთ კი ნიშანი სუსტი. ამიტომ სხვები შენს შფოთსაც და შენს ტყუილსაც იმაზე ნაკლებად ხედავენ, ვიდრე გეჩვენება."}, {"front": "იმპოსტორის სინდრომი", "back": "წარმატებული ადამიანი თავს თაღლითად გრძნობს და წარმატებას იღბალს, დროს ან სხვის შეცდომას აბრალებს, არა საკუთარ უნარს. ის ელოდება, რომ „ნამდვილები“ ერთ დღესაც გამოაჩენენ მას. ეს ცალკე დიაგნოზი არ არის, არამედ გავრცელებული განცდაა, რომელსაც სახელი პოლინ კლანსმა და სუზან აიმსმა დაარქვეს. ის უფრო ხშირია იქ, სადაც შეფასება ბუნდოვანია და ადამიანი საკუთარ სტანდარტს მუდმივად იმაღლებს."}, {"front": "ბარნუმის ეფექტი", "back": "ბუნდოვანი, ზოგადი და უმეტესად მაამებელი დახასიათება ადამიანს პირადად მისთვის დაწერილად ეჩვენება. „ზოგჯერ საკუთარ თავში ეჭვი გეპარება, მაგრამ საჭირო დროს მტკიცე ხარ“ თითქმის ყველას ერგება. ეფექტი ბერტრამ ფორერის 1949 წლის ცდამ აჩვენა: სტუდენტებმა ერთი და იგივე ტექსტი საკუთარ ზუსტ ჰოროსკოპად ჩათვალეს. ამას ფორერის ეფექტსაც ეძახიან."}, {"front": "ჰალოს ეფექტი", "back": "ერთი კარგი თვისება დანარჩენ შეფასებასაც ანათებს. თუ ადამიანი სიმპათიურია, უფრო ჭკვიანად, პატიოსნად და კომპეტენტურადაც გვეჩვენება, თუნდაც ამის ცალკე საფუძველი არ გვქონდეს. სახელი ედუარდ თორნდაიკს ეკუთვნის. ერთი ნათელი შთაბეჭდილება დანარჩენ ნიშნებს თავის ფერს აძლევს."}];
  const expected = ["58942d166bf6", "7402f7753a72", "60296133a738", "2f21a9b8b521"];
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