(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "კატჩ-22", "back": "წესი, რომელიც გაქცევის პირობას თავად ბლოკავს. ჯოზეფ ჰელერის რომანში ჯარისკაცი სიგიჟის გამო შეიძლება გათავისუფლდეს, მაგრამ გათავისუფლების თხოვნა სწორედ იმას ამტკიცებს, რომ ის გონიერია. სახელი მას შემდეგ ნებისმიერ ასეთ ჩაკეტილ წესს ეწოდა. კატჩ-22 წინააღმდეგობა კი არა, მახეა: პირობა ისეა დაწერილი, რომ მისი შესრულება შეუძლებელია."}, {"front": "ომნიპოტენციის პარადოქსი", "back": "შეუძლია თუ არა ყოვლისშემძლე არსებას ისეთი ქვის შექმნა, რომელსაც თავად ვერ ასწევს? თუ შეუძლია, მაშინ არის ქვა, რომელსაც ვერ სწევს; თუ არ შეუძლია, მაშინ არის საქმე, რომელსაც ვერ აკეთებს. პარადოქსი ყოვლისშემძლეობის განსაზღვრებას ამოწმებს. ერთი პასუხი ის არის, რომ ლოგიკური წინააღმდეგობა საქმე საერთოდ არ არის, და ძალა წინააღმდეგობრივ ამოცანას არ ერგება."}, {"front": "ნიანგის დილემა", "back": "ნიანგი ბავშვს იტაცებს და მშობელს ეუბნება: დაგიბრუნებ, თუ სწორად იწინასწარმეტყველებ, რას ვიზამ. მშობელი პასუხობს: „არ დამიბრუნებ“. თუ ნიანგი არ დააბრუნებს, წინასწარმეტყველება მართალია და უნდა დააბრუნოს. თუ დააბრუნებს, წინასწარმეტყველება მცდარია და არ უნდა დაებრუნებინა. დილემა მატყუარას პარადოქსის ნათესავია: დაპირება საკუთარ პირობას ეჯახება."}, {"front": "პინოქიოს პარადოქსი", "back": "პინოქიოს ცხვირი მაშინ იზრდება, როცა ტყუილს ამბობს. თუ ის იტყვის „ახლა ცხვირი გამიზრდება“, რა მოხდება? თუ ცხვირი გაიზარდა, ნათქვამი ჭეშმარიტი იყო და ცხვირი არ უნდა გაზრდილიყო. თუ არ გაიზარდა, ნათქვამი ტყუილი იყო და ცხვირი უნდა გაზრდილიყო. ეს მატყუარას პარადოქსის სათამაშო ფორმაა და იმავე თვითმინიშნებაში ეფუთება."}];
  const expected = ["e5f977a8e756", "f4fbf2e8119f", "0bf37f6ed6e3", "47f88d1fcc6f"];
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