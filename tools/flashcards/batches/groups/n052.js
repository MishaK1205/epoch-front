(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "კლევერ ჰანსი", "back": "ცხენი კლევერ ჰანსი თითქოს ითვლიდა და კითხვებს პასუხობდა, სინამდვილეში კი კითხვის დამსმელის უმცირეს, შეუმჩნეველ ნიშნებს კითხულობდა: დაძაბვას, ამოსუნთქვას, სხეულის დახრას. როცა დამსმელმა პასუხი თავად არ იცოდა, ცხენიც წყვეტდა. ამბავი აჩვენებს, რომ ცდამ შეიძლება გაზომოს არა საგნის უნარი, არამედ ექსპერიმენტატორის ფარული მინიშნება."}, {"front": "ფუნქციური ფიქსაცია", "back": "ადამიანი საგანს მხოლოდ მის ჩვეულ დანიშნულებაში ხედავს და სხვა გამოყენებას ვერ ამჩნევს. კარლ დუნკერის ცდაში სანთელი კედელზე უნდა დამაგრდეს, ჭიკარტები კი ყუთშია. ამოხსნა ყუთის თაროდ გამოყენებაა, მაგრამ სავსე ყუთი მხოლოდ ჭიკარტების ჭურჭლად ჩანს. ჩვეული ფუნქცია აქ შესაძლო ფუნქციას ფარავს."}, {"front": "აინშტელუნგის ეფექტი", "back": "ნაცნობი ამოხსნა უფრო კარგ, მაგრამ უჩვეულო ამოხსნას ბლოკავს. აბრაჰამ ლუჩინსის ცდებში ადამიანები წყლის დოქების რამდენიმე ამოცანას ერთი და იგივე გრძელი წესით ხსნიდნენ და ვერ ამჩნევდნენ, რომ შემდეგი ამოცანა ბევრად მოკლედ იხსნებოდა. გამოცდილება აქ სწრაფ გზას იძლევა და იმავდროულად თვალს უვიწროებს. ეფექტის სახელი გერმანულ სიტყვას უკავშირდება, რომელიც განწყობას ან დაყენებულ მდგომარეობას ნიშნავს."}, {"front": "გავლენის გადაჭარბება", "back": "ადამიანი აჭარბებს, რამდენ ხანს და რამდენად ძლიერად იმოქმედებს მომავალი მოვლენა მის განცდაზე. მოსალოდნელი დაწინაურება ან წარუმატებლობა წარმოდგენაში თვეების განწყობას წყვეტს, სინამდვილეში კი ადამიანი უფრო სწრაფად უბრუნდება ჩვეულ დონეს. დანიელ გილბერტმა და ტიმოთი ვილსონმა ეს გადახრა აღწერეს. წარმოსახვა მოვლენაზე ფოკუსირდება და ყოველდღიურ ცხოვრებას, რომელიც განცდას ხსნის, ანგარიშში ვერ დებს."}];
  const expected = ["c25cffc982c3", "e864d02c9c54", "c40147b06136", "ca5246a82973"];
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