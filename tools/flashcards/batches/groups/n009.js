(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ღუზის ეფექტი", "back": "პირველი რიცხვი, თუნდაც შემთხვევითი, მომდევნო შეფასებას თავისკენ იწევს. თუ ჯერ გკითხეს, ჰომეროსი 25 წლის შემდეგ დაიბადა თუ მანამდე, და მერე გთხოვეს წელი, პასუხი იმ შემთხვევით რიცხვთან ახლოს დარჩება. ადამიანი ღუზიდან ასწორებს შეფასებას, მაგრამ ასწორებს არასაკმარისად. ეფექტი ამოს ტვერსკიმ და დანიელ კანემანმა აღწერეს."}, {"front": "ჩარჩოს ეფექტი", "back": "ერთი და იგივე არჩევანი იცვლება იმის მიხედვით, დანაკარგად არის მოთხრობილი თუ მოგებად. „ათიდან ცხრა გადარჩება“ და „ათიდან ერთი მოკვდება“ ერთსა და იმავეს ამბობს, მაგრამ პირველი უფრო მისაღებად ჟღერს. ფაქტები არ შეცვლილა, შეიცვალა ჩარჩო, და ჩარჩომ ყურადღება მოგებაზე ან დანაკარგზე გადაიტანა."}, {"front": "ხელმისაწვდომობის ევრისტიკა", "back": "ადამიანი მოვლენის სიხშირეს იმით აფასებს, რამდენად ადვილად ახსენდება მაგალითი. ხმამაღალი, ახალი და ემოციური ამბავი ადვილად მოდის გონებაში, ამიტომ იშვიათი საფრთხე უფრო ხშირად გვეჩვენება, ჩუმი და ჩვეულებრივი კი უფრო იშვიათად. ეს სწრაფი წესია და ხშირად გამოსადეგია, მაგრამ მეხსიერების სიკაშკაშე სტატისტიკის მაგივრობა არ არის."}, {"front": "წარმომადგენლობითობის ევრისტიკა", "back": "ადამიანი ალბათობას იმით აფასებს, რამდენად ჰგავს აღწერა ნაცნობ ტიპს, და უგულებელყოფს, რამდენად ხშირია ეს ტიპი საერთოდ. თუ ვიღაც მშვიდია, წიგნებს კითხულობს და წესრიგს იცავს, ბიბლიოთეკარად უფრო გვეჩვენება, ვიდრე გამყიდველად, თუნდაც გამყიდველი გაცილებით მეტი იყოს. მსგავსება აქ საბაზისო სიხშირეს ანაცვლებს."}];
  const expected = ["91b6f6bc203a", "d406613e285b", "3e7193112383", "e957b33f345e"];
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