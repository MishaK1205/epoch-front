(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "კვანტური ზენონის ეფექტი", "back": "თუ კვანტურ სისტემას საკმარისად ხშირად გაზომავ, მისი ცვლილება შეიძლება შენელდეს ან თითქმის გაჩერდეს. სახელი ზენონის ისარს ეხმიანება: გამუდმებული „ნახვა“ მოძრაობას არ აძლევს საშუალებას დაგროვდეს. ეფექტი მხოლოდ სახელი არ არის. ის ლაბორატორიაში დაუკვირვებიათ. ხშირი გაზომვა აქ პასიური ყურება კი არა, სისტემის ევოლუციაში ჩარევაა."}, {"front": "ფოტოელექტრული ეფექტი", "back": "სინათლე მეტალიდან ელექტრონს მხოლოდ მაშინ აგდებს, როცა მისი სიხშირე გარკვეულ ზღვარზე მაღალია. უფრო კაშკაშა, მაგრამ ზღვარზე დაბალი სინათლე ამას ვერ ახერხებს, თუმცა ენერგია თითქოს ბევრია. ალბერტ აინშტაინმა ეს 1905 წელს ახსნა: სინათლე ენერგიის ულუფებად, ფოტონებად, მოდის, და ერთი ფოტონის ენერგიას სიხშირე წყვეტს. ეფექტი კვანტური იდეის ერთ-ერთი პირველი მყარი საყრდენი გახდა."}, {"front": "კაზიმირის ეფექტი", "back": "ვაკუუმში ორი ძალიან ახლო, უმუხტო ლითონის ფირფიტა ერთმანეთს იზიდავს. ჩვეულებრივი ახსნა კვანტურ ვაკუუმს უკავშირდება: ფირფიტებს შორის ზოგი რყევა ვეღარ ეტევა, გარეთ კი რჩება, და ეს სხვაობა ფირფიტებს აწვება. ჰენდრიკ კაზიმირმა ეფექტი 1948 წელს იწინასწარმეტყველა. ის მცირეა, მაგრამ გაზომილია, და აჩვენებს, რომ ცარიელი სივრცე ფიზიკურად სრულიად ცარიელი არ არის."}, {"front": "გვირაბის ეფექტი", "back": "კვანტურმა ნაწილაკმა შეიძლება გადალახოს ბარიერი, რომლის გადასალახადაც კლასიკური ფიზიკის მიხედვით საკმარისი ენერგია არ აქვს. ის ბარიერს ნაწილაკივით „ხტუნვით“ კი არა, ტალღის გავრცელებით სცდება: ბარიერის მეორე მხარეს მისი პოვნის ალბათობა ნული არ არის. ეფექტი მუშაობს რადიოაქტიურ დაშლაში, მზის ბირთვულ რეაქციებში და ზოგ ელექტრონულ მოწყობილობაშიც."}];
  const expected = ["da3226446132", "280995a786ab", "5fa87c643488", "9785094ec845"];
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