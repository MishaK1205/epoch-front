(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "პელცმანის ეფექტი", "back": "უსაფრთხოების ზომამ შეიძლება უფრო სარისკო საქციელი გამოიწვიოს და ნაწილი მოგებული უსაფრთხოებისა უკან დაიხიოს. თუ მძღოლი ღვედს უფრო დაცულად გრძნობს თავს, შეიძლება უფრო სწრაფად ატაროს. სემ პელცმანმა ეს ავტომობილის რეგულაციებზე თქვა. ეფექტის ზომა სადავოა: სარისკო საქციელი ხშირად ჩნდება, მაგრამ მთლიან უსაფრთხოებას ყოველთვის ბოლომდე არ ჭამს."}, {"front": "სემელვაისის რეფლექსი", "back": "ახალი მტკიცებულების უარყოფა იმიტომ, რომ ის ჩვეულ აზრს ან ავტორიტეტს ეწინააღმდეგება. სახელი იგნაც სემელვაისს უკავშირდება, რომელმაც მე-19 საუკუნეში დაინახა, რომ ექიმების ხელის დაბანა მშობიარობის ციებას ამცირებდა, და დიდხანს ვერ დაარწმუნა კოლეგები. სახელი თანამედროვეა და ყოველ წინააღმდეგობას არ უნდა მიეკრას. ის გამოსადეგია იქ, სადაც უარი მტკიცებულებამდე კი არა, ჩვევამდე დგას."}, {"front": "რეაქტანსი", "back": "როცა ადამიანი გრძნობს, რომ თავისუფალ არჩევანს ართმევენ, სწორედ აკრძალული ვარიანტი ეზიდება. აკრძალვა ნივთს უფრო სასურველს ხდის და შეიძლება საპირისპირო საქციელიც კი გამოიწვიოს. ჯეკ ბრემმა ამას ფსიქოლოგიური რეაქტანსი დაარქვა. ამიტომ უხეში ბრძანება ზოგჯერ იმ აზრს აძლიერებს, რომლის ჩახშობაც სურდა."}, {"front": "ჰანლონის სამართებელი", "back": "არ მიაწერო ბოროტი განზრახვა იმას, რაც სისულელით, დაუდევრობით ან შემთხვევითობითაც საკმარისად აიხსნება. წესი ოკამის სამართებლის ნათესავია: ზედმეტი ბოროტი განზრახვა ნუ შემოიყვანო, თუ მარტივი ახსნა კმარა. სახელი რობერტ ჰანლონს მიეწერება, თუმცა მსგავსი აზრი უფრო ძველია. ეს კეთილი რჩევაა და არა მტკიცებულება, რომ ბოროტი განზრახვა არ არსებობს."}];
  const expected = ["cf8397ffb2d1", "dfbe88332149", "e0c5ec3a4fd4", "a004622d707c"];
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