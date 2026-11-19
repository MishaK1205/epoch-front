(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "რუბინის ვაზა", "back": "ერთსა და იმავე სურათში ხან ვაზა ჩანს, ხან ორი პირისპირ მდგომი პროფილი. როცა შუა ფორმა საგანია, გვერდები ფონია; როცა გვერდები სახეებია, შუა ფონი ხდება. ილუზია აჩვენებს, რომ ტვინი საგანსა და ფონს ერთმანეთისგან ყოფს და ეს დაყოფა შეიძლება გადაბრუნდეს. სახელი დანიელ ფსიქოლოგს, ედგარ რუბინს, ეკუთვნის."}, {"front": "პენროუზის სამკუთხედი", "back": "სამკუთხედი, რომლის ყოველი კუთხე ცალ-ცალკე სწორად გამოიყურება, მთლიანობაში კი შეუძლებელ სხეულს ქმნის: გვერდები ერთმანეთს ისე უერთდება, რომ სივრცეში ვერ იარსებებს. ის პენროუზის კიბის ნათესავი ფიგურაა და მხოლოდ ნახატად მუშაობს, როცა თვალი სიღრმეს მცდარად კითხულობს."}, {"front": "შეუძლებელი ტრიდენტი", "back": "ფიგურა ერთ ბოლოზე სამკაპად ჩანს, მეორე ბოლოზე კი ორ ძელად, და შუაში ეს ორი კითხვა ვერ თანხვდება. ყოველი ნაწილი ცალკე დასაშვებია, მთლიანი კი სამგანზომილებიან საგნად ვერ აეწყობა. ასეთ ნახატებს შეუძლებელ ფიგურებს ეძახიან: წინააღმდეგობა საგანში კი არა, მის სიღრმეში წაკითხვაშია."}, {"front": "ჩანჩქერის ილუზია", "back": "თუ ცოტა ხანს დაცემულ წყალს ან სხვა ერთი მიმართულების მოძრაობას შეხედავ და მერე უძრავ კედელს გადახედავ, კედელი საპირისპირო მიმართულებით თითქოს მოძრაობს. მიზეზი ნერვული უჯრედების დაღლაა: ერთი მიმართულების დეტექტორები იღლება და საპირისპირო სიგნალი დროებით სჭარბობს. ამას მოძრაობის შემდგომ ეფექტსაც ეძახიან."}];
  const expected = ["a29d9ed13ca9", "401496a532de", "8a82e2017e9e", "825c2b06ca44"];
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