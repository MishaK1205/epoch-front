(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "კაშკაშა მოგონება", "back": "დიდი ამბის გაგონების წამი ხშირად უჩვეულოდ ცოცხლად გვახსოვს: სად ვიყავით, ვისთან და რას ვაკეთებდით. ასეთ მოგონებას კაშკაშა ან ელვარე მეხსიერებას ეძახიან. სიცოცხლე და დარწმუნებულობა სიზუსტის გარანტია არ არის. კვლევამ აჩვენა, რომ ეს მოგონებებიც დროთა განმავლობაში იცვლება, თუმცა ადამიანი მათში უფრო დარწმუნებული რჩება."}, {"front": "მანდელას ეფექტი", "back": "ბევრ ადამიანს ერთი და იგივე მცდარი მოგონება აქვს, მაგალითად, რომ ნელსონ მანდელა 1980-იან წლებში ციხეში გარდაიცვალა. სახელი სწორედ ამ გავრცელებული შეცდომიდან მოდის. ეს პარალელური სამყაროს მტკიცებულება არ არის. უფრო იმის მაგალითია, რომ მეხსიერება ჯგუფურადაც შეიძლება დაიხვეწოს არასწორი, მაგრამ ადვილად გასაზიარებელი ვერსიისკენ."}, {"front": "დეზინფორმაციის ეფექტი", "back": "მოვლენის შემდეგ მიღებულმა მცდარმა დეტალმა შეიძლება თავად მოგონება შეცვალოს. თუ მოწმეს ეკითხები, რა სისწრაფით შეეჯახა მანქანები ერთმანეთს, ის უფრო მაღალ სიჩქარეს იხსენებს, ვიდრე მაშინ, როცა სიტყვა „შეეხო“ გაქვს ნათქვამი. ელიზაბეტ ლოფტუსის ცდებმა აჩვენა, რომ მოგონება ჩანაწერივით ფიქსირებული კი არა, კითხვისას ხელახლა წერადია."}, {"front": "გუგლის ეფექტი", "back": "ინფორმაციას, რომლის მოძებნასაც ადვილად ველით, ნაკლებად ვიმახსოვრებთ და სანაცვლოდ გვახსოვს, სად ვნახოთ. ტვინი მეხსიერების ნაწილს გარე წყაროს ანდობს. ეს სისულელე კი არა, შრომის დანაწილებაა, მაგრამ ფასიც აქვს: წყაროს გარეშე თავად ფაქტი უფრო მალე გვაკლდება. ეფექტს ციფრულ ამნეზიასაც ეძახიან."}];
  const expected = ["3cf33742a201", "b4660860ff7d", "400838d503da", "a4195a3bcbaf"];
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