(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "პატიმრის დილემა", "back": "ორი პატიმარი ცალ-ცალკე წყვეტს, გასცეს მეორე თუ გაჩუმდეს. თითოეულისთვის გაცემა უფრო მომგებიანია, როგორც არ უნდა მოიქცეს მეორე, მაგრამ თუ ორივე გასცემს, ორივე უფრო ცუდად რჩება, ვიდრე ორმხრივი დუმილის შემთხვევაში. პირადი ანგარიში აქ საერთო სიკეთეს აშორებს. დილემა თამაშთა თეორიის საფუძველია და ჩანს შეიარაღებაში, გარემოში და ნდობის ბევრ სხვა საქმეში."}, {"front": "უფასო მხედარი", "back": "ადამიანი სარგებლობს საერთო სიკეთით და თავის წილ გადასახადს ან შრომას არ იხდის, რადგან სიკეთე მის გარეშეც იარსებებს. ერთი ასეთი მხედარი სისტემას არ ანგრევს, ბევრი კი შლის იმ მარაგს, რომლითაც სიკეთე იქმნება. პრობლემა ძლიერდება იქ, სადაც ადამიანს სიკეთიდან ვერ გამოყოფ და მისი წვლილი არც ჩანს."}, {"front": "უხილავი ხელი", "back": "ადამ სმითის მეტაფორა: ადამიანი საკუთარ სარგებელს მისდევს და, ბაზრის ფასების გავლით, შეიძლება საზოგადოებასაც სარგებელი მოუტანოს, თუნდაც ეს მისი მიზანი არ იყოს. მეპურე პურს შენთვის კი არა, თავისი შემოსავლისთვის აცხობს, შენ კი მაინც იღებ პურს. ეს ყოველთვის და ყველა ბაზარზე მოქმედი გარანტია არ არის. ის აღწერს კოორდინაციას იქ, სადაც ფასი, კონკურენცია და წესი მუშაობს."}, {"front": "შედარებითი უპირატესობა", "back": "ორ მხარეს ვაჭრობა მაშინაც აწყობს, როცა ერთი მათგანი ყველა საქმეში უფრო ნაყოფიერია. მთავარია არა აბსოლუტური სისწრაფე, არამედ ის, თუ რა უნდა დათმოს თითოეულმა ერთი საქონლის საწარმოებლად. თუ შენი უპირატესობა პურში უფრო დიდია, ვიდრე ქსოვილში, შეიძლება გეწყობოდეს პურის კეთება და ქსოვილის ყიდვა. აზრი დეივიდ რიკარდოს ეკუთვნის."}];
  const expected = ["8b0b089ac9ca", "98a231299008", "ef00161e691a", "91fd12e79734"];
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