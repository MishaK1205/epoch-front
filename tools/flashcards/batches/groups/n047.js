(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ტალღა-ნაწილაკის ორმაგობა", "back": "სინათლე და მატერია ზოგ ცდაში ტალღასავით იქცევა, ზოგში კი ნაწილაკივით. ელექტრონიც კი, სათითაოდ გაშვებული, ორ ჭრილში ინტერფერენციის ზოლებს კრავს, თითქოს ორივე გზა ერთდროულად ჰქონდეს. თუ გაზომავ, რომელ ჭრილში გაიარა, ზოლები ქრება. ორმაგობა ნიშნავს, რომ არც მარტო ტალღა და არც მარტო პატარა ბურთი კმარა ამ საგნების აღსაწერად."}, {"front": "ჰაიზენბერგის განუსაზღვრელობის პრინციპი", "back": "ნაწილაკის ადგილი და იმპულსი ერთდროულად სასურველი სიზუსტით ვერ განისაზღვრება: რაც უფრო ვიწროვდება ერთის გაურკვევლობა, მით უფრო ფართოვდება მეორის. ეს მხოლოდ ხელსაწყოს უხეშობა არ არის და არც ის, რომ გაზომვა ნაწილაკს „შეხებით“ შლის. ეს თავად კვანტური მდგომარეობის თვისებაა. ვერნერ ჰაიზენბერგმა პრინციპი 1927 წელს ჩამოაყალიბა."}, {"front": "ანთროპული პრინციპი", "back": "სამყარო, რომელსაც ვაკვირდებით, თავსებადი უნდა იყოს დამკვირვებლის არსებობასთან, რადგან სხვაგვარ სამყაროში ამ კითხვას ვერ დავსვამდით. სუსტი ფორმა ამას აღწერს და არაფერს ამბობს იმაზე, რომ სამყარო ჩვენთვის შეგნებულად არის აწყობილი. ის გვაფრთხილებს, რომ დაკვირვებული პირობები შეიძლება შერჩევითი იყოს: ჩვენ მხოლოდ იქ ვართ, სადაც ცხოვრება შესაძლებელია."}, {"front": "დიდი ფილტრი", "back": "ფერმის პარადოქსის ერთ-ერთი ახსნა: სიცოცხლიდან გალაქტიკაში შესამჩნევ ცივილიზაციამდე გზაზე ძალიან ძნელი საფეხურია. ეს საფეხური შეიძლება უკან იყოს, მაგალითად სიცოცხლის გაჩენა, ან წინ, მაგალითად ტექნოლოგიური ცივილიზაციის დიდხანს გადარჩენა. თუ ფილტრი წინ არის, დუმილი საფრთხის ნიშანია. თუ უკან არის, დედამიწა იშვიათი გამონაკლისია. რომელი ვარიანტია მართალი, ამ სახელმა არ იცის."}];
  const expected = ["555b9be042b1", "e38a8112526e", "1ce2ec2426a8", "b906a7f76575"];
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