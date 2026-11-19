(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ფუნდამენტური ატრიბუციის შეცდომა", "back": "სხვის საქციელს ადამიანი უფრო ხასიათს აბრალებს, ვიდრე სიტუაციას. თუ ვიღაც აგვიანებს, მას დაუდევარს ვეძახით და ნაკლებად ვითვალისწინებთ საცობს ან მოულოდნელ წესს. საკუთარ თავზე იგივე საქციელს უფრო ხშირად გარემოებით ვამართლებთ. ტენდენცია ყველა კულტურაში ერთნაირი სიძლიერით არ ჩანს, მაგრამ სხვისი ხასიათისკენ გადახრა ფართოდ არის აღწერილი."}, {"front": "სამართლიანი სამყაროს ჰიპოთეზა", "back": "ადამიანს სურს სჯეროდეს, რომ სამყარო უმთავრესად სამართლიანია და ადამიანები იმას იღებენ, რასაც იმსახურებენ. ამ რწმენამ შეიძლება მსხვერპლის დადანაშაულებამდე მიიყვანოს: თუ უბედურება შემთხვევითია, სამყარო უფრო საშიში ჩანს, ამიტომ მსხვერპლს ფარულ ბრალს ვუძებთ. ჰიპოთეზა მელვინ ლერნერმა აღწერა. ის ნუგეშს იძლევა და სხვის ტკივილს უსამართლოდ ხსნის."}, {"front": "უკეთესობის ილუზია", "back": "ადამიანთა უმეტესობა თავს საშუალოზე უკეთესად თვლის იმ თვისებებში, რომლებიც სასურველი და ბუნდოვნად არის აღწერილი, მაგალითად პატიოსნებაში ან მართვის უნარში. ყველა საშუალოზე მაღლა ვერ იქნება. ეფექტი მარტივ, სასურველ თვისებებზე ძლიერდება და რთულ, იშვიათ უნარზე სუსტდება. ამას ვობეგონის ტბის ეფექტსაც ეძახიან, ქალაქის გამო, სადაც „ყველა ბავშვი საშუალოზე უკეთესია“."}, {"front": "პროჟექტორის ეფექტი", "back": "ადამიანი აჭარბებს, რამდენად ამჩნევენ სხვები მის გარეგნობას, შეცდომას ან საქციელს. შენთვის შენი ლაქა მთელ სცენას ავსებს, სხვა კი საკუთარ საზრუნავშია. თომას გილოვიჩის ცდებში ადამიანები ფიქრობდნენ, რომ უცნაურ მაისურს გაცილებით მეტი ადამიანი შენიშნავდა, ვიდრე სინამდვილეში შენიშნა. ყურადღების პროჟექტორი უფრო შენს თავშია, ვიდრე ოთახში."}];
  const expected = ["52dab17038be", "75b5f3d160e1", "bcc386b25a20", "41d2e9e0583d"];
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