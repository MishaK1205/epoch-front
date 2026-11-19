(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "სორიტის პარადოქსი", "back": "ქვიშის ერთი მარცვალი გორა არ არის. თუ გორას ერთ მარცვალს მოაცილებ, ის კვლავ გორაა. თუ ამას ბოლომდე გაიმეორებ, ერთ მარცვალსაც გორა უნდა ერქვას, რაც აბსურდია. პარადოქსი ბუნდოვან სიტყვებში ჩნდება: გორას, მელოტს ან გროვას მკვეთრი საზღვარი არ აქვს. ყოველი პატარა ნაბიჯი უვნებელია, ჯაჭვი კი ცნებას ცლის."}, {"front": "თესევსის გემი", "back": "თესევსის გემის ფიცრებს სათითაოდ ცვლიან, სანამ ძველი ფიცარი აღარ დარჩება. ეს კვლავ იგივე გემია თუ ახალი? თუ ძველი ფიცრებით მეორე გემს ააწყობ, რომელია ნამდვილი? პარადოქსი იდენტობას ეკითხება: საგანს ინარჩუნებს უწყვეტი ისტორია, მასალა, ფორმა თუ ფუნქცია. ერთი პასუხი ყველა შემთხვევას არ ერგება, და სწორედ ეს არის თავსატეხის ძალა."}, {"front": "მოულოდნელი ჩამოხრჩობის პარადოქსი", "back": "მსაჯული ამბობს, რომ პატიმარს მომავალ კვირაში ერთ დღეს ჩამოახრჩობენ და რომ ეს დღე მისთვის მოულოდნელი იქნება. პატიმარი ფიქრობს: პარასკევს ვეღარ იქნება მოულოდნელი, რადგან მანამდე არ მომხდარა; მაშინ ხუთშაბათიც გამოირიცხება, და ასე ყველა დღე. მაინც, როცა მას, ვთქვათ, ოთხშაბათს მოულოდნელად მიჰყავთ, პროგნოზი მართალი გამოდის. მსჯელობა, რომელიც ყველა დღეს გამორიცხავს, სწორედ მოულოდნელობას ტოვებს."}, {"front": "ყორნების პარადოქსი", "back": "დებულება „ყველა ყორანი შავია“ ლოგიკურად იგივეა, რაც „ყველაფერი, რაც შავი არ არის, ყორანი არ არის“. მაშინ მწვანე ვაშლიც, თითქოსდა, ამ დებულებას ამაგრებს, რადგან ის არაშავი არაყორანია. კარლ ჰემპელმა აჩვენა, რამდენად უცნაურად გამოიყურება დადასტურება, როცა მას მხოლოდ ლოგიკური ფორმით ვუყურებთ. ვაშლი ყორნებზე თითქმის არაფერს გვეუბნება, თუმცა ფორმალური არგუმენტი მას მოწმედ იწვევს."}];
  const expected = ["b3d73040d4cb", "9f679c50072f", "06afc37c4018", "0beb24e9674f"];
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