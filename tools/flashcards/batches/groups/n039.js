(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "კონდორსეს პარადოქსი", "back": "თუ ამომრჩევლები სამ ვარიანტს საკუთარი რიგით ალაგებენ, უმრავლესობამ შეიძლება წრე შექმნას: პირველი მეორეს სჯობს, მეორე მესამეს, მესამე კი ისევ პირველს. ყოველი წყვილი ნათელია, საერთო გამარჯვებული კი არ არსებობს. მარკიზ დე კონდორსემ ეს მე-18 საუკუნეში აჩვენა. ჯგუფის სურვილი აქ ცალკეული ადამიანის სურვილივით თანმიმდევრული არ გამოდის."}, {"front": "შემწყნარებლობის პარადოქსი", "back": "კარლ პოპერის არგუმენტი: თუ საზოგადოება უსაზღვროდ ითმენს მათ, ვინც შემწყნარებლობის განადგურებას ცდილობს, შემწყნარებლობა თავად შეიძლება განადგურდეს. ამიტომ ის ამბობდა, რომ შემწყნარებელ საზოგადოებას უფლება აქვს არ შეიწყნაროს შეუწყნარებლობა, როცა ის ძალით მიდის. პარადოქსი სახელს იმიტომ ატარებს, რომ დაცვა აქ ზღვარს სვამს იმ პრინციპზე, რომელსაც იცავს. სად გადის ეს ზღვარი, ცალკე პოლიტიკური კითხვაა."}, {"front": "ჰედონიზმის პარადოქსი", "back": "სიამოვნებას რაც უფრო პირდაპირ და ჯიუტად სდევ, მით უფრო ადვილად გისხლტება. სიამოვნება ხშირად გვერდით მოდის, როცა საქმე, მეგობრობა ან ოსტატობა თავად არის მიზანი. ვინც მხოლოდ საკუთარ განცდას ზომავს, იმ განცდას ართმევს იმ პირობას, რომლითაც ის ჩნდება. პარადოქსი ჰენრი სიდგუიკმა და მოგვიანებით სხვებმაც აღწერეს."}, {"front": "ნიუკომბის პარადოქსი", "back": "ძალიან ზუსტი წინასწარმეტყველი ორ ყუთს გიდებს. პატარაში ათასი ერთეულია. დიდში მილიონია, თუ მან იწინასწარმეტყველა, რომ მხოლოდ დიდს აიღებ, და ცარიელია, თუ იწინასწარმეტყველა, რომ ორივეს აიღებ. ყუთები უკვე სავსეა. ერთი მხარე ამბობს: ორივე აიღე, რადგან შიგთავსი უკვე დევს. მეორე ამბობს: მხოლოდ დიდი აიღე, რადგან ასე მოქცეულებს მილიონი ხვდებათ. ორივე მსჯელობა ძლიერია, და სწორედ ეს ქმნის პარადოქსს."}];
  const expected = ["f1517039d4af", "7abd908e0440", "40f19d8cbacd", "fc1b9f42a970"];
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