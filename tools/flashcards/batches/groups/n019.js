(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ნოცებოს ეფექტი", "back": "უარყოფითმა მოლოდინმა შეიძლება ნამდვილი სიმპტომი ან გვერდითი მოვლენა გამოიწვიოს, თუნდაც ჩარევა არააქტიური იყოს. თუ ადამიანს ეუბნები, რომ აბმა შეიძლება თავი ატკინოს, თავის ტკივილი უფრო ხშირი ხდება. ნოცებო პლაცებოს უარყოფითი წყვილია: ერთს გაუმჯობესების მოლოდინი მართავს, მეორეს კი ზიანის მოლოდინი."}, {"front": "გვერდით მდგომის ეფექტი", "back": "რაც მეტი ადამიანი ესწრება საგანგებო ამბავს, მით ნაკლებია შანსი, რომ რომელიმე მათგანი დაეხმაროს. თითოეული ფიქრობს, რომ სხვა იმოქმედებს, ან სხვების სიმშვიდიდან ასკვნის, რომ საფრთხე არ არის. ჯონ დარლიმ და ბიბ ლატანემ ეს ცდებით აჩვენეს. დახმარება უფრო სავარაუდოა, როცა თხოვნა ერთ კონკრეტულ ადამიანს ეხება და პასუხისმგებლობა აღარ იშლება."}, {"front": "სოციალური სიზარმაცე", "back": "ჯგუფურ საქმეში ადამიანი ნაკლებ ძალას დებს, როცა მისი პირადი წვლილი არ ჩანს და შეფასება საერთო შედეგზეა. ერთი ადამიანი თოკს უფრო მაგრად წევს, ვიდრე მაშინ, როცა იგივე თოკს ბევრი ერთად წევს. ეფექტი მაქს რინგელმანის ცდებიდან იწყება. ის სუსტდება, როცა წვლილი ცალკე ჩანს, საქმე მნიშვნელოვანია და ჯგუფი პატარაა."}, {"front": "ჯგუფური აზროვნება", "back": "მჭიდრო ჯგუფი ცდილობს სწრაფ თანხმობას და ამ დროს ეჭვს, ალტერნატივას და ცუდ ამბავს კიდეზე დებს. წევრები თვითცენზურას იწყებენ, განსხვავებული აზრი კი არალოიალურად ჩანს. ირვინ ჯანისმა ეს ცნება პოლიტიკური წარუმატებლობების ასახსნელად გამოიყენა. ჯგუფი უფრო ფრთხილია, როცა ვიღაც შეგნებულად ეძებს საწინააღმდეგო არგუმენტს და ხელმძღვანელი თავის აზრს ბოლოს ამბობს."}];
  const expected = ["dbd9e113adb6", "c910299e7d2d", "d2e6ac4ba8e3", "2ae7eada74da"];
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