(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "პროსპექტის თეორია", "back": "კანემანისა და ტვერსკის თეორია იმაზე, თუ როგორ ირჩევენ ადამიანები რისკის ქვეშ. ადამიანი შედეგს საბოლოო სიმდიდრით კი არა, საწყის წერტილთან შედარებით, მოგებითა და დანაკარგით აფასებს. დანაკარგი უფრო მძიმეა, ვიდრე იმავე ოდენობის მოგება, ხოლო პატარა ალბათობებს ადამიანი ხშირად აზვიადებს. თეორია ხსნის, რატომ იცვლება არჩევანი ჩარჩოს მიხედვით."}, {"front": "კლებადი ზღვრული სარგებლიანობა", "back": "ყოველი მომდევნო ერთეული, როგორც წესი, ნაკლებ დამატებით სარგებელს იძლევა, ვიდრე წინა. პირველი ჭიქა წყალი მწყურვალს ბევრს აძლევს, მეხუთე კი ცოტას. ამიტომ ადამიანი მრავალფეროვნებას უფრო აფასებს, ვიდრე ერთი საქონლის უსასრულო მარაგს, და ფულის ახალი ერთეულიც მდიდართან ნაკლებ ახალ შესაძლებლობას მატებს, ვიდრე ღარიბთან."}, {"front": "რასელის პარადოქსი", "back": "წარმოიდგინე სიმრავლე, რომელიც აერთიანებს ყველა ისეთ სიმრავლეს, რომელიც საკუთარ თავს არ შეიცავს. შეიცავს თუ არა ეს სიმრავლე საკუთარ თავს? თუ შეიცავს, მაშინ არ უნდა შეიცავდეს; თუ არ შეიცავს, მაშინ უნდა შეიცავდეს. ბერტრან რასელმა ეს წინააღმდეგობა 1901 წელს აჩვენა. მან დაანგრია გულუბრყვილო აზრი, რომ ყოველ გასაგებ პირობას თავისი სიმრავლე შეესაბამება."}, {"front": "მატყუარას პარადოქსი", "back": "წინადადება „ეს წინადადება მცდარია“ ვერ დგას არც ჭეშმარიტად, არც მცდარად. თუ ჭეშმარიტია, მაშინ ის მართლა მცდარია; თუ მცდარია, მაშინ მისი თქმა, რომ მცდარია, ჭეშმარიტი გამოდის. პარადოქსი თვითმინიშნებაში და ჭეშმარიტების ცნებაში ზის. მისი ნათესავებია „ყველა კრეტელი მატყუარაა“, თუ ამას კრეტელი ამბობს, და სხვა წინადადებები, რომლებიც საკუთარ სიმცდარეს ამტკიცებენ."}];
  const expected = ["b971562c0a1c", "51910ea17dc9", "382771bed1f5", "51975b598088"];
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