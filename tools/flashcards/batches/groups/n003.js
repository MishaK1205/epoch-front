(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ცვლილების სიბრმავე", "back": "ადამიანი დიდ ცვლილებასაც ვერ ამჩნევს, თუ ის ცვლილების წამს ხდება, ან სურათი მოკლედ წყდება, ან ყურადღება სხვაგან არის. კლასიკურ ცდებში ადამიანები ვერ ხედავენ, რომ საუბრისას თანამოსაუბრე შეეცვალათ, ან რომ ფოტოდან დიდი საგანი გაქრა. თვალს ყველაფრის უწყვეტი ჩანაწერი კი არა, იმის ჩანაწერი აქვს, რასაც ყურადღება ადევნებს."}, {"front": "უყურადღებობის სიბრმავე", "back": "როცა ადამიანი ერთ საქმეზეა თავჩაღებული, მოულოდნელ და თვალსაჩინო რამესაც შეიძლება ვერ ხედავდეს. ცნობილ ცდაში მაყურებლები კალათბურთელების პასებს ითვლიან და ვერ ამჩნევენ, რომ კადრში გორილის კოსტიუმში გამოწყობილი ადამიანი გადის. მიზეზი თვალის უუნარობა კი არა, ყურადღების ვიწროობაა."}, {"front": "შეპარდის ტონი", "back": "ბგერა, რომელიც თითქოს მუდმივად მაღლდება ან დაბლდება და მაინც არასოდეს მიდის არც სიმაღლის, არც სიღრმის ბოლომდე. ის რამდენიმე ოქტავის ერთდროული ტონებისგან შედგება, და სიმაღლის ცვლილებასთან ერთად მათი სიმძლავრეც ისე იცვლება, რომ ციკლი თავის თავს უბრუნდება. ილუზია როჯერ შეპარდის სახელს ატარებს და სმენითი ანალოგიაა პენროუზის კიბისა."}, {"front": "ტრიტონის პარადოქსი", "back": "ერთი და იგივე ტრიტონი, ანუ ექვსი ნახევარტონით დაშორებული ორი ბგერა, ზოგს აღმავალ ინტერვალად ესმის, ზოგს კი დაღმავალად. სხვაობა შემთხვევითი კი არა, მსმენელისთვის ჩვეული ბგერითი დიაპაზონით აიხსნება. ილუზია დაიანა დოიჩმა აღწერა და აჩვენა, რომ სიმაღლის მიმართულება მარტო ინტერვალში არ წერია."}];
  const expected = ["0026a640dc04", "ff19ef3ef438", "b69e9642d52a", "b574eb5caf90"];
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