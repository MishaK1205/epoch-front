(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ებინგჰაუსის ილუზია", "back": "ერთნაირი წრე უფრო დიდად ჩანს, როცა მას პატარა წრეები აკრავს, და უფრო პატარად, როცა დიდი წრეები აკრავს. ტვინი ზომას მეზობლებთან შედარებით აფასებს. ილუზია ჰერმან ებინგჰაუსის სახელს ატარებს და დავიწყების მრუდს არ უკავშირდება, თუმცა ორივეს ერთი მკვლევარის სახელი ჰქვია."}, {"front": "პონზოს ილუზია", "back": "ორი ტოლი ჰორიზონტალური ხაზიდან ზედა უფრო გრძელი ჩანს, თუ ისინი ერთმანეთისკენ მიმავალ, რკინიგზის მსგავს ხაზებს შორისაა. ტვინი ზედა ხაზს უფრო შორს კითხულობს და, რადგან სურათზე ისინი ტოლია, შორეულს უფრო დიდად თვლის. ილუზია მარიო პონზომ 1911 წელს აღწერა."}, {"front": "მთვარის ილუზია", "back": "მთვარე ჰორიზონტთან უფრო დიდად ჩანს, ვიდრე მაღლა ცაზე, თუმცა მისი კუთხური ზომა თითქმის არ იცვლება. ჩვეულებრივი ახსნა ის არის, რომ ჰორიზონტთან მანძილის ნიშნები, ხეები და შენობები, მთვარეს უფრო შორს გვაგრძნობინებს და ტვინი მას ადიდებს. სრული ახსნა დღემდე სადავოა, მაგრამ ფაქტი ის არის, რომ იცვლება აღქმა და არა მთვარის რეალური ზომა ცაზე."}, {"front": "ნეკერის კუბი", "back": "კუთხეებით დახატული კუბი ორ განსხვავებულ სიღრმედ იკითხება: წინა წახნაგი ხან ერთია, ხან მეორე. სურათი არ იცვლება, იცვლება ის, თუ რომელი ინტერპრეტაცია სჭარბობს. ტვინი ბრტყელ ნახატს სამ განზომილებად ავსებს და ორ თანაბარ ვარიანტს შორის ხტება. კუბი ლუის ალბერ ნეკერის სახელს ატარებს."}];
  const expected = ["d8d1386f07bd", "5e83ef10bbf9", "135fb937bc55", "e4378aed2e7b"];
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