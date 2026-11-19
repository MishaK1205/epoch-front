(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "პლურალისტური უმეცრება", "back": "ჯგუფის წევრები პირადად უარყოფენ ნორმას, მაგრამ ჰგონიათ, რომ დანარჩენები მას იღებენ, და ამიტომ თავადაც თანხმდებიან. დუმილი ქმნის იმ თანხმობის იერს, რომელიც სინამდვილეში არ არსებობს. საკმარისია, რომ რამდენიმე ადამიანმა ხმამაღლა თქვას თავისი აზრი, და მოჩვენებითი უმრავლესობა შეიძლება სწრაფად დაიშალოს."}, {"front": "დუმილის სპირალი", "back": "ადამიანი, რომელსაც ჰგონია, რომ უმცირესობაშია, აზრს იკავებს. ამ დუმილის გამო მისი მხარე კიდევ უფრო პატარა ჩანს, და კიდევ უფრო მეტი ადამიანი ჩუმდება. ელიზაბეტ ნოელ-ნოიმანმა ეს სპირალი საზოგადოებრივი აზრის აღსაწერად შემოიღო. ხმამაღალი მხარე აქ იმაზე დიდად გამოიყურება, ვიდრე რეალურად არის, სანამ დუმილი თავად არ ცვლის რიცხვებს."}, {"front": "ნაცნობობის ეფექტი", "back": "რაც უფრო ხშირად ვხედავთ რამეს, მით უფრო მოსაწონი ხდება ის, სანამ გამეორება არ გადაიქცევა მოწყენილობად ან გაღიზიანებად. ეფექტი მუშაობს სახეებზე, სიტყვებზე და მელოდიებზე, ხშირად მაშინაც, როცა ადამიანს არც ახსოვს, სად ნახა ისინი. რობერტ ზაიონცმა აჩვენა, რომ ნაცნობობა თავისთავადაც ქმნის სიმპათიას. ეს სიყვარულის ახსნა არ არის, მაგრამ პირველ სიმპათიას ხშირად სწორედ გამეორება ამზადებს."}, {"front": "სიხშირის ილუზია", "back": "როცა ახალ სიტყვას, მანქანას ან იდეას შეამჩნევ, უცებ ყველგან გხვდება. სამყარო არ გამრავლებულა: შეიცვალა შენი ყურადღება, და ნაცნობი ფორმა ახლა ფონიდან გამოიყოფა. ამას ბაადერ-მაინჰოფის ეფექტსაც ეძახიან. ის ხელმისაწვდომობის ევრისტიკას ენათესავება, რადგან ახალი მაგალითები ადვილად გახსენდება და უფრო ხშირად გეჩვენება."}];
  const expected = ["395ef164efe3", "2eaab01ff5c0", "bea72acd7bbf", "4ffb379d971e"];
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