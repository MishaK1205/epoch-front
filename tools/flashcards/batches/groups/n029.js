(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "გოდვინის კანონი", "back": "ინტერნეტის დისკუსია რაც უფრო გრძელდება, მით უფრო უახლოვდება ალბათობა იმას, რომ ვიღაც ნაცისტურ შედარებას გამოიყენებს. მაიკ გოდვინმა ეს 1990 წელს იხუმრა. ეს ბუნების კანონი არ არის, არამედ დაკვირვებაა იმაზე, თუ როგორ ამოწურავს გრძელი კამათი ზომიერ შედარებებს. შედარების გამოჩენა არგუმენტს არც ამარცხებს და არც იმარჯვებს. ის მხოლოდ ხშირი ნიშანია იმისა, რომ საუბარი გადახურდა."}, {"front": "პოს კანონი", "back": "ექსტრემიზმის პაროდია და ნამდვილი ექსტრემიზმი ერთმანეთისგან ვერ გაირჩევა, თუ ავტორმა ხუმრობა ცხადად არ მონიშნა. ნათან პომ ეს ინტერნეტის განხილვებზე თქვა. როცა რეალური პოზიცია უკვე უკიდურესია, მისი გაზვიადებული ვერსია ვეღარ გამოიყოფა. კანონი იუმორისტულია, მაგრამ ხსნის, რატომ სჭირდება ირონიას ხანდახან ცხადი ნიშანი."}, {"front": "კანინგემის კანონი", "back": "ინტერნეტში სწორი პასუხის მიღების ყველაზე სწრაფი გზა ხშირად მცდარი პასუხის დაწერაა, რადგან ხალხი უფრო მოწადინებით ასწორებს შეცდომას, ვიდრე უპასუხებს კითხვას. წესი უორდ კანინგემს მიეწერება და იუმორისტულია. ის კარგად ერგება იმ გარემოს, სადაც შესწორება უფრო იაფია, ვიდრე ნულიდან ახსნა."}, {"front": "ბრენდოლინის კანონი", "back": "სისულელის გაბათილებას ბევრად მეტი ენერგია სჭირდება, ვიდრე მის წარმოებას. ერთი უსაფუძვლო წინადადება წუთში იწერება, მისი დაშლა კი წყაროებს, კონტექსტს და გრძელ ახსნას ითხოვს. ალბერტო ბრენდოლინიმ ამას სისულელის ასიმეტრია დაარქვა. კანონი ხსნის, რატომ ვრცელდება მცდარი მტკიცება უფრო სწრაფად, ვიდრე მისი შესწორება."}];
  const expected = ["a3fdd7aed2a4", "7129432e14cd", "de203904a30e", "0d3fb1f48f72"];
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