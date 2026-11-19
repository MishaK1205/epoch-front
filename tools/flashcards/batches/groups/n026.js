(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ჰიჩენსის სამართებელი", "back": "რაც მტკიცებულების გარეშე ითქმის, მტკიცებულების გარეშეც შეიძლება უკუაგდო. ტვირთი იმაზეა, ვინც რამეს ამტკიცებს, და არა იმაზე, ვინც ამ მტკიცებას ვერ უარყოფს. წესი კრისტოფერ ჰიჩენსის სახელს ატარებს. ის არ ამბობს, რომ დაუმტკიცებელი აზრი აუცილებლად მცდარია. ის ამბობს, რომ ასეთი აზრი ჯერ სარწმუნოდ მიღებას არ იმსახურებს."}, {"front": "ჩესტერტონის ღობე", "back": "ნუ მოხსნი ღობეს, სანამ არ გაიგებ, რატომ დადგეს. ძველი წესი, ინსტიტუტი ან ჩვევა შეიძლება უცნაურად გამოჩნდეს, მაგრამ მას შეიძლება ჰქონდეს მიზეზი, რომელიც პირველ შეხედვაზე არ ჩანს. გილბერტ კიტ ჩესტერტონი ამბობდა, რომ რეფორმა მაშინ უნდა დაიწყოს, როცა ღობის დანიშნულება უკვე გასაგებია. წესი ყველაფრის შენარჩუნებას კი არ ითხოვს, არამედ ჯერ გაგებას და მერე შეცვლას."}, {"front": "პარკინსონის კანონი", "back": "საქმე იჭიმება იმდენ ხანს, რამდენიც მისთვის არის გამოყოფილი. თუ წერილს დღე აქვს, ის დღის ბოლოსკენ მთავრდება; თუ საათი, ხშირად საათშიც ეტევა. სახელი სირილ ნორთკოტ პარკინსონს ეკუთვნის და პარკინსონის დაავადებას არ უკავშირდება. კანონი იუმორისტული დაკვირვებაა იმაზე, თუ როგორ ავსებს ბიუროკრატია და ყოყმანი ხელმისაწვდომ დროს."}, {"front": "წვრილმანის კანონი", "back": "ჯგუფი არაპროპორციულად დიდ დროს ხარჯავს მარტივ, ყველასთვის გასაგებ წვრილმანზე და ჩქარობს რთულ, მნიშვნელოვან საკითხს. კლასიკურ მაგალითში კომიტეტი ატომურ რეაქტორს სწრაფად ამტკიცებს, ველოსიპედის ფარდულის ფერზე კი დიდხანს კამათობს. ესეც სირილ პარკინსონის დაკვირვებაა. მარტივ საკითხში ყველა თავს კომპეტენტურად გრძნობს, რთულში კი ჩუმდება."}];
  const expected = ["41149674cfeb", "b1433cbcb5e7", "b6a18fd10b56", "7e015de76891"];
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