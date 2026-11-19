(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "იზოლაციის ეფექტი", "back": "რიგში ის ელემენტი გვახსოვს ყველაზე მკაფიოდ, რომელიც დანარჩენებისგან რამით მკვეთრად განსხვავდება: ფერით, ზომით ან აზრით. განსხვავება ყურადღებას იჭერს და ჩანაწერს გამოყოფს. ეფექტს ფონ რესტორფის ეფექტსაც ეძახიან, ჰედვიგ ფონ რესტორფის სახელით."}, {"front": "დაშორებული გამეორების ეფექტი", "back": "ერთი და იგივე მასალა უკეთ რჩება მეხსიერებაში, თუ მას დროში დაშორებული პატარა ულუფებით სწავლობ, ვიდრე ერთ ჯერზე ზედიზედ. ახლო გამეორება ადვილად გაგრძნობინებს, რომ იცი, მაგრამ ეს სიმარტივე ხშირად მოკლეა. დაშორებული გამეორება გახსენებას უფრო შრომატევადს და სწორედ ამიტომ უფრო მტკიცეს ხდის."}, {"front": "გახსენების ეფექტი", "back": "მასალა უკეთ გვახსოვს, თუ მას ხელახლა კითხვის ნაცვლად მეხსიერებიდან გამოვიძახებთ. ტესტი აქ მხოლოდ შემოწმება კი არა, სწავლის ნაწილია: გახსენების მცდელობა კვალს ამაგრებს. ამიტომ ფლეშბარათი, რომელსაც ჯერ თავად პასუხობ, იგივე ტექსტის თავიდან წაკითხვაზე უკეთ მუშაობს."}, {"front": "ენის წვერზე მდგომი სიტყვა", "back": "ადამიანმა იცის, რომ სიტყვა იცის, მაგრამ ვერ გამოჰყავს: პირველი ასო, მარცვლების რაოდენობა ან მსგავსი სიტყვა ახსოვს, თავად სიტყვა კი არა. მეხსიერებაში კვალი არის, გახსენების გზა კი დროებით დახშულია. მდგომარეობა ჩვეულებრივ თავისთავად ან ნაფიცხით იხსნება და აჩვენებს, რომ ცოდნა და გამოძახება ერთი და იგივე არ არის."}];
  const expected = ["dda5938dc30c", "efbc58706970", "e273daeaefac", "b256d0549361"];
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