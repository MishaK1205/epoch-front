(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "რქის ეფექტი", "back": "ჰალოს ეფექტის საპირისპირო: ერთი ცუდი თვისება ან ერთი შეცდომა დანარჩენ შეფასებასაც აბნელებს. თუ ადამიანი უხეშად საუბრობს, უფრო ნაკლებად კომპეტენტურადაც შეიძლება მოგვეჩვენოს. ერთი უარყოფითი ნიშანი აქ მთელ სურათს იკავებს, ისევე როგორც ჰალო ერთ დადებით ნიშანს ავრცელებს."}, {"front": "პიგმალიონის ეფექტი", "back": "სხვის მიმართ მაღალი მოლოდინი შეიძლება სწორედ იმ შედეგს ქმნიდეს, რომელსაც ელოდები. მასწავლებელი, რომელსაც ჰგონია, რომ მოსწავლე ნიჭიერია, უფრო მეტ კითხვას, დროს და მოთმინებას აძლევს, და მოსწავლე მართლა წინ მიდის. სახელი მითიდან მოდის, სადაც მოქანდაკე პიგმალიონის ქანდაკება ცოცხლდება. კლასის ცნობილ კვლევას როზენტალი და იაკობსონი აწერდნენ; მოლოდინის გავლენა რეალურია, თუმცა მისი ზომა გარემოზეა დამოკიდებული."}, {"front": "გოლემის ეფექტი", "back": "პიგმალიონის ეფექტის უარყოფითი წყვილი: დაბალი მოლოდინი აუარესებს შედეგს. თუ ხელმძღვანელს ან მასწავლებელს წინასწარ სჯერა, რომ ადამიანი ვერ გაუმკლავდება, ის ნაკლებ შანსს, უკუკავშირს და ნდობას აძლევს, და შედეგიც მართლა უარესდება. სახელი გოლემის თქმულებიდან მოდის. მოლოდინი აქ ნეიტრალური პროგნოზი კი არა, საქციელის მიზეზი ხდება."}, {"front": "თვითშემსრულებელი წინასწარმეტყველება", "back": "რწმენა, რომელიც თავიდან მცდარი ან უსაფუძვლოა, ისეთ საქციელს იწვევს, რომ ბოლოს მართალი გამოდის. თუ ბანკის შესახებ ტყუილამ გავრცელდა, რომ ის იხურება, მეანაბრეები ფულს გაიტანენ და ბანკი მართლა დაიხურება. ცნება რობერტ მერტონმა დაასახელა. პიგმალიონის ეფექტი მისი ერთი სახეობაა: მოლოდინი ქმნის იმ რეალობას, რომელსაც აღწერდა."}];
  const expected = ["c6f27455c0cb", "9ba2150bec1f", "e471390cd170", "01414ccb45a6"];
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