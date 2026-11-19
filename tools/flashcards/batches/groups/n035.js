(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "მორალური რისკი", "back": "ეკონომიკური ტერმინი: როცა ადამიანი ზარალისგან დაცულია, ის უფრო სარისკოდ იქცევა, ვიდრე მაშინ, როცა ზარალს თავად იხდის. დაზღვეულმა შეიძლება ნაკლები სიფრთხილე გამოიჩინოს, რადგან ავარიის ფასი უკვე გადანაწილებულია. სახელში „მორალური“ ზნეობრივ განაჩენს კი არა, მოტივის ცვლილებას ნიშნავს. რისკი მცირდება, როცა დაცულ ადამიანს მაინც რჩება ზარალის საკუთარი წილი."}, {"front": "არასასურველი შერჩევა", "back": "როცა ერთ მხარეს მეტი ინფორმაცია აქვს, ბაზარზე უფრო მეტად ისინი რჩებიან, ვისთან გარიგებაც მეორე მხარისთვის საშიშია. თუ ავადმყოფმა იცის თავისი რისკი და დამზღვევმა არა, დაზღვევას ჯერ ყველაზე რისკიანები იყიდიან. ფასი იმატებს, ჯანმრთელები გადიან და დარჩენილი ჯგუფი კიდევ უფრო რისკიანი ხდება."}, {"front": "ლემონების ბაზარი", "back": "ჯორჯ აკერლოფის მოდელი: თუ გამყიდველმა იცის მანქანის ხარისხი და მყიდველმა არა, მყიდველი საშუალო ფასს სთავაზობს. კარგი მანქანის პატრონი ამ ფასს არ თანხმდება, ცუდის პატრონი კი სიამოვნებით. ბაზარზე „ლემონები“, ანუ უხარისხო მანქანები, რჩება და კარგი მანქანა განიდევნება. ეს არასასურველი შერჩევის კლასიკური სურათია."}, {"front": "რასელის ჩაიდანი", "back": "ბერტრან რასელის მაგალითი: თუ ვინმე იტყვის, რომ მზესა და დედამიწას შორის პატარა ჩაიდანი დაფრინავს და ამის შემოწმება შეუძლებელია, მტკიცების ტვირთი მასზეა. სხვებს არ ევალებათ ჩაიდანის არარსებობის დამტკიცება. მაგალითი ნებისმიერ ისეთ მტკიცებას ეხება, რომელიც საბუთს არ გვთავაზობს და შემოწმებასაც გაურბის. ის არ ამბობს, რომ შეუმოწმებელი აზრი აუცილებლად მცდარია."}];
  const expected = ["17fba840e198", "c2cf21216586", "20e3c315496a", "73a14fbe64e1"];
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