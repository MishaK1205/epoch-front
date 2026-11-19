(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "უკანდახედვის ცდომილება", "back": "მას შემდეგ, რაც შედეგი უკვე ვიცით, გვეჩვენება, რომ ის თავიდანვე აშკარა იყო. „ვიცოდი, რომ ასე მოხდებოდა“ ხშირად იმის შემდეგ ჩნდება, რაც მოხდა. ცოდნა ძველ გაურკვევლობას შლის და წარსულ შეფასებას დღევანდელი პასუხით ცვლის. ამიტომ ძველი პროგნოზი უნდა ჩაიწეროს მანამ, სანამ შედეგს ნახავ."}, {"front": "დაგეგმვის ცდომილება", "back": "ადამიანი საქმის ვადას ნაკლებად აფასებს, თუნდაც იცოდეს, რომ მსგავსი საქმეები ადრეც გაჭიანურდა. გეგმა საუკეთესო მსვლელობას ჰგავს, დაბრკოლება კი ცალკე, გარე შემთხვევად რჩება. შენი წარსული ვადები უფრო სანდო საზომია, ვიდრე შიგნიდან დანახული ოპტიმისტური ნაბიჯები. ცდომილება კანემანმა და ტვერსკიმ აღწერეს."}, {"front": "ცოდნის წყევლა", "back": "როცა რამე უკვე იცი, გიჭირს წარმოიდგინო, როგორია ამის არცოდნა. ნაცნობი სიტყვა, ხუმრობა ან ინსტრუქცია შენთვის გამჭვირვალეა და სხვასაც ისეთივე გამჭვირვალედ გგონია. ამიტომ ექსპერტი ხშირად ცუდი მასწავლებელი ხდება, თუ შეგნებულად არ დაუბრუნდება დამწყების კითხვებს. ცოდნა აქ უკან, უცოდინრობისკენ, ცუდად ბრუნდება."}, {"front": "ილუზორული ჭეშმარიტება", "back": "გამეორებული დებულება უფრო ჭეშმარიტად გვეჩვენება, თუნდაც მტკიცებულება არ გაზრდილიყო. ნაცნობი ფრაზა ადვილად მუშავდება, სიმარტივე კი სისწორის შეგრძნებად იქცევა. ამიტომ ხშირად გაგონილი სიტყვა, მცდარიც კი, დროთა განმავლობაში უფრო სანდო ხდება. ეფექტი გამეორების რაოდენობაზე დგას და არა არგუმენტის სიძლიერეზე."}];
  const expected = ["03b801036743", "f46cd8c61071", "0fe904807195", "3899800f7fc0"];
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