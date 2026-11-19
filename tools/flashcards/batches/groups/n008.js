(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "დავიწყების მრუდი", "back": "ახლად ნასწავლი მასალა ჯერ სწრაფად გვავიწყდება, მერე კი დავიწყება ნელდება. ჰერმან ებინგჰაუსმა ეს მე-19 საუკუნეში უაზრო მარცვლებზე გაზომა. მრუდი ყველა ცოდნაზე ერთნაირი არ არის: აზრი, გამეორება და გამოყენება კვალს იცავს. მაინც რჩება მთავარი გაკვეთილი, რომ ერთხელ წაკითხვული გამეორების გარეშე სწრაფად თხელდება."}, {"front": "გაგრძელებული გავლენის ეფექტი", "back": "მცდარი ინფორმაცია მას შემდეგაც მოქმედებს აზროვნებაზე, რაც ადამიანმა გაიგო, რომ ის მცდარია. უარყოფა ფაქტს ასწორებს, მაგრამ ძველი დეტალი უკვე ჩაწნულია ამბის მიზეზებსა და დასკვნებში. ამიტომ შესწორება მარტო „ეს ტყუილია“ არ კმარა: ადამიანს სჭირდება ახალი, სრული ახსნა, რომელიც ძველ დეტალს ანაცვლებს."}, {"front": "დანინგ-კრუგერის ეფექტი", "back": "დავალებაში სუსტი უნარის მქონე ადამიანი ხშირად აჭარბებს საკუთარ შედეგს, რადგან იმავე უნარი სჭირდება, რომ შედეგი სწორად შეაფასოს. გამოცდილი ადამიანი კი თავის დონეს ზოგჯერ ოდნავ აკლებს, რადგან საქმის სირთულე უკეთ ესმის. ეს არ ნიშნავს, რომ „სულელი თავს გენიოსად თვლის“. ეფექტი კონკრეტულ ამოცანაზეა და ყველა სფეროში ერთნაირი სიდიდით არ ჩანს. სახელი დევიდ დანინგისა და ჯასტინ კრუგერის 1999 წლის ნაშრომიდან მოდის."}, {"front": "დადასტურების მიკერძოება", "back": "ადამიანი ეძებს, ახსოვს და ისე კითხულობს ინფორმაციას, რომ ის უკვე არსებულ რწმენას ამაგრებდეს. საწინააღმდეგო ფაქტი უფრო ადვილად ეჭვქვეშ დგება, თანხმობი კი უფრო ადვილად მიიღება. ეს შეგნებული ტყუილი ყოველთვის არ არის: კითხვაც ისე ყალიბდება, რომ სასურველ პასუხს ელოდება. ამის საწინააღმდეგოდ წინასწარ უნდა ეძებო ის ფაქტი, რომელიც შენს აზრს დაარღვევდა."}];
  const expected = ["7d118720ff98", "0ddc1c8674d7", "c13baf32b997", "fc1492f6509e"];
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