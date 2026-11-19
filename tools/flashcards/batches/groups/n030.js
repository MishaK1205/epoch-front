(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "პეპლის ეფექტი", "back": "ქაოსურ სისტემაში საწყისი პირობის პატარა სხვაობამ შეიძლება დროთა განმავლობაში ძალიან განსხვავებული შედეგი გამოიღოს. სახელი ედუარდ ლორენცის მეტაფორიდან მოდის: პეპლის ფრთის დაქნევამ შეიძლება, თვეების შემდეგ, სხვაგან ქარიშხლის გზა შეცვალოს. ეს არ ნიშნავს, რომ კონკრეტული პეპელა კონკრეტულ ქარიშხალს იწვევს. ის ნიშნავს, რომ ზოგ სისტემაში შორეული პროგნოზი საწყისი სიზუსტის ზღვარს ვერ სცდება."}, {"front": "ქსელის ეფექტი", "back": "პროდუქტი ან სერვისი უფრო ღირებული ხდება, როცა მას უფრო მეტი ადამიანი იყენებს. ტელეფონი ერთ მომხმარებელს თითქმის არაფერს აძლევს, მილიონ მომხმარებელს კი ყველასთან კავშირს. ზრდა ხშირად უფრო სწრაფია, ვიდრე მომხმარებელთა რიცხვი, რადგან იზრდება შესაძლო კავშირებიც. ზუსტი მათემატიკური ფორმულა მოდელია, თავად მიმართულება კი ბევრ ქსელში ნამდვილია."}, {"front": "მცირე სამყაროს ეფექტი", "back": "დიდ ქსელშიც ორ ადამიანს შორის გზა ხშირად გასაკვირად მოკლეა. ცნობილი ფორმულა „ექვსი ხელჩაკიდება“ სტენლი მილგრემის წერილების ცდიდან მოდის, რომლის მეთოდიც შეზღუდული იყო. უფრო გვიანდელმა კვლევებმა მაინც დაადასტურა მთავარი აზრი: ბევრ სოციალურ და ინფორმაციულ ქსელში მოკლე გზები არსებობს, თუნდაც ყოველი წყვილი პირადად არ იცნობდეს ერთმანეთს."}, {"front": "საერთო საძოვრის ტრაგედია", "back": "როცა რესურსი საერთოა, მისი გამოყენების შეზღუდვა ძნელია და სარგებელი პირადია, თითოეულს აწყობს ცოტა მეტის აღება. თუ ყველა ასე მოიქცევა, საძოვარი, თევზი ან სუფთა ჰაერი იწურება და ყველა ზარალდება. გარეტ ჰარდინმა ეს ტრაგედია დაასახელა. ეს აუცილებელი ბედი არ არის: ელინორ ოსტრომმა აჩვენა, რომ საერთო რესურსი ხშირად გადარჩება, როცა მომხმარებლებს აქვთ ნათელი წესი, ზღვარი და ზედამხედველობა."}];
  const expected = ["81c841ab3e4f", "02a556fc720a", "b07edb4d4fc6", "522df9fd549e"];
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