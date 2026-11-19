(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ფეხი კარში", "back": "პატარა დათანხმება ზრდის შანსს, რომ ადამიანი მერე უფრო დიდ თხოვნაზეც დაგთანხმდეს. ვინც ჯერ პატარა სტიკერს დაკიდებს, უფრო ხშირად თანხმდება მერე დიდ აბრასაც. ჯონათან ფრიდმანმა და სკოტ ფრეიზერმა ეს 1966 წელს აჩვენეს. პირველი „დიახ“ საკუთარ თავზე ახალ სურათს ქმნის: ადამიანი თავს ისეთად ხედავს, ვინც ასეთ საქმეებს თანხმდება."}, {"front": "კარი სახეში", "back": "ჯერ შეგნებულად დიდ, უარყოფილ თხოვნას სვამ, მერე კი ნამდვილ, უფრო მოკრძალებულ თხოვნას. მეორე თხოვნა დათმობად ჩანს და თანხმობაც მატულობს. რობერტ ჩალდინიმ ეს ეფექტი აღწერა. ის კარგად მუშაობს, როცა პირველი თხოვნა დიდია, მაგრამ არა აბსურდული, და მეორე იმავე ადამიანისგან მოდის, რომ დათმობა სწორედ შენ მიმართულებით ჩანდეს."}, {"front": "ბენჯამინ ფრანკლინის ეფექტი", "back": "ადამიანი უფრო მეტად გიყვარს მას შემდეგ, რაც შენთვის სიკეთე გააკეთა, და არა მხოლოდ მანამდე. ფრანკლინი ყვებოდა, რომ მოწინააღმდეგეს წიგნი სთხოვა, და სესხის შემდეგ ურთიერთობა დათბა. ერთი ახსნა კოგნიტური დისონანსია: „თუ დავეხმარე, ალბათ მომწონს“. ეფექტი ყოველთვის არ მეორდება, მაგრამ კარგად აჩვენებს, რომ საქციელმა შეიძლება გრძნობას გაუსწოროს."}, {"front": "წაბორძიკების ეფექტი", "back": "კომპეტენტური ადამიანი პატარა, უვნებელი შეცდომის შემდეგ უფრო მომწონი ხდება. შეცდომა მას უფრო ადამიანურს ხდის და დისტანციას ამცირებს. ელიოტ არონსონის ცდებში გამარჯვებული, რომელსაც ყავა დაესხა, უფრო სიმპათიური გახდა, სუსტი კანდიდატი კი იმავე შეცდომით კიდევ უფრო სუსტი. ეფექტი კომპეტენციას სჭირდება: წაბორძიკება იმას ეხმარება, ვინც უკვე მაღლა დგას."}];
  const expected = ["51bb5d541d7d", "d5c5842dbc22", "d70f1ef4eae9", "1ee8e4b66b7b"];
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