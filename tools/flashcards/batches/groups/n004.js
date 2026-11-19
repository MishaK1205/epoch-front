(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "სემანტიკური გაჯერება", "back": "თუ ერთ სიტყვას ბევრჯერ ზედიზედ იტყვი ან წაიკითხავ, ის ცოტა ხნით აზრს კარგავს და უცხო ბგერად იქცევა. მნიშვნელობა არ ქრება სამუდამოდ: ყურადღება ფორმაზე გადადის და ჩვეული კავშირი დროებით სუსტდება. ეს კარგად აჩვენებს, რომ სიტყვის გაგება ავტომატური ჩვევაა, რომელიც გამეორებით შეიძლება დაიღალოს."}, {"front": "ენობრივი ფარდობითობა", "back": "ჰიპოთეზა, რომ ენა გავლენას ახდენს იმაზე, თუ რას ამჩნევს და რამდენად ადვილად ფიქრობს ადამიანი. ძლიერი ვერსია, თითქოს ენა აზრს ბოლომდე განსაზღვრავს, დღეს მიღებული არ არის. სუსტ ვერსიას გარკვეული მხარდაჭერა აქვს: მაგალითად, ფერების ან სივრცის აღმნიშვნელი სიტყვები ზოგ დავალებაში ყურადღებას მართავს. იდეას საპირ-უორფის ჰიპოთეზასაც ეძახიან."}, {"front": "ზაიგარნიკის ეფექტი", "back": "დაუმთავრებელი საქმე ხშირად უკეთ გვახსოვს, ვიდრე დასრულებული. ბლუმა ზაიგარნიკმა ეს 1927 წელს აღწერა: შეწყვეტილი ამოცანები მეხსიერებაში უფრო დიდხანს რჩებოდა. ახსნა ის არის, რომ დაუხურავი მიზანი ყურადღებას კვლავ იზიდავს. ეფექტი ყოველთვის არ მეორდება, ამიტომ ის კანონი კი არა, ხშირი, მაგრამ არამდგრადი ტენდენციაა."}, {"front": "სერიული პოზიციის ეფექტი", "back": "სიის თავი და ბოლო უკეთ გვახსოვს, ვიდრე შუა. პირველი ელემენტები გრძელ მეხსიერებაში ასწრებს გადასვლას, ბოლოები კი ჯერ კიდევ მოკლე მეხსიერებაში დევს, შუა კი ორივე მხრიდან იჭედება. ამიტომ სიის შუაში ჩამარხული აზრი უფრო ადვილად იკარგება, ვიდრე პირველი ან უკანასკნელი."}];
  const expected = ["51c1a1f9747a", "06daf302e8b6", "7e5e56eeda43", "84b220733a19"];
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