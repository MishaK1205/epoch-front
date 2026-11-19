(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ფალსიფიცირებადობა", "back": "კარლ პოპერის კრიტერიუმი: სამეცნიერო თეორია ისეთი უნდა იყოს, რომ შესაძლო დაკვირვებამ შეიძლება ის დაარღვიოს. თეორია, რომელიც ყოველ შედეგს თავისთან დაიტევს, არაფერს წინასწარმეტყველებს. ფალსიფიცირებადობა არ ნიშნავს, რომ თეორია უკვე მცდარია. ის ნიშნავს, რომ თეორიას აქვს რისკი: სამყაროს შეუძლია მას „არა“ უთხრას."}, {"front": "შავი გედი", "back": "იშვიათი მოვლენა, რომელსაც დიდი შედეგი აქვს და რომელიც შემდეგ, უკან რომ ვიხედებით, თითქოს ახსნადი და მოსალოდნელი ჩანს. სახელი ნასიმ ტალების წიგნიდან გავრცელდა. ძველად შავი გედი შეუძლებლობის მაგალითი იყო, სანამ ავსტრალიაში იპოვეს. აზრი ის არის, რომ წარსულის ჩვეულებრივი გამოცდილება მომავლის იშვიათ, მძიმე მოვლენას ცუდად ხედავს."}, {"front": "რუკა ტერიტორია არ არის", "back": "მოდელი, სიტყვა ან რუკა საგანს აღწერს და თავად საგანი არ არის. რუკა სასარგებლოა, რადგან ამარტივებს, და სწორედ ამ გამარტივებაში კარგავს დეტალს. ალფრედ კორჟიბსკიმ ეს ფორმულა გაავრცელა. შეცდომა იწყება მაშინ, როცა რუკაზე არმყოფს სამყაროშიც შეუძლებლად თვლი, ან რუკის ხაზს თავად მდინარედ მიიჩნევ."}, {"front": "სისტემა 1 და სისტემა 2", "back": "დანიელ კანემანის სახელები აზროვნების ორი რეჟიმისთვის. პირველი სწრაფი, ავტომატური და მცდელობის გარეშეა: სახეს ცნობს, ინტუიციას იძლევა, ხშირად მიკერძოებასაც. მეორე ნელი, შეგნებული და დამქანცველია: ითვლის, ამოწმებს, ეჭვს სვამს. ეს ორი ცალკე ორგანო ტვინში არ არის. ეს გამოსადეგი მოდელია იმისა, თუ როდის ვენდობით სწრაფ შთაბეჭდილებას და როდის გვჭირდება შემოწმება."}];
  const expected = ["b7f7ac751807", "6f6f4cbe3fbc", "80ea2d99c8ec", "fbbd23137c42"];
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