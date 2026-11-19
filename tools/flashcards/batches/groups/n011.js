(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "ცხელი ხელის რწმენა", "back": "ადამიანი ფიქრობს, რომ წარმატების მწკრივი მომდევნო წარმატებასაც უფრო სავარაუდოს ხდის. ზოგ დარგში ეს მოლოდინი მცდარია, ზოგან კი პატარა რეალური ეფექტი არსებობს: კალათბურთში, მაგალითად, გვიანდელმა გაზომვებმა სუსტი „ცხელი ხელი“ დაინახა, მას შემდეგ რაც ძველი სტატისტიკური შეცდომა გაასწორეს. მწკრივი თავისთავად არც გარანტიაა და არც დარღვევის ვალი."}, {"front": "საშუალოსკენ რეგრესი", "back": "უკიდურეს შედეგს, როგორც წესი, უფრო ჩვეულებრივი შედეგი მოსდევს, თუნდაც არანაირი ახალი მიზეზი არ გამოჩენილიყო. ძალიან მაღალი ქულა ნაწილობრივ ოსტატობაა და ნაწილობრივ იღბალი, იღბალი კი მომდევნო ჯერზე საშუალოსკენ ბრუნდება. თუ ამას შენს ჩარევას მიაწერ, შექებას ან სასჯელს იმ ძალას მიაკუთვნებ, რომელიც მას არ ჰქონია. მოვლენა ფრენსის გოლტონმა აღწერა."}, {"front": "გადარჩენილის გადახრა", "back": "წარმატებულებს ვხედავთ, წარუმატებლებს კი ხშირად ვეღარა, და ამიტომ წარმატების რეცეპტს მხოლოდ გადარჩენილების თვისებებში ვეძებთ. მეორე მსოფლიო ომში დაბრუნებულ თვითმფრინავებზე ნახვრეტები იქ იყო, საიდანაც დაბრუნება შეიძლებოდა. ჯავშანი სწორედ იმ ადგილებს სჭირდებოდა, რომლებიც დაბრუნებულ ნიმუშებზე ცარიელი ჩანდა, რადგან იქ მოხვედრილი თვითმფრინავი უკან აღარ ბრუნდებოდა."}, {"front": "ტეხასელი მსროლელის ცდომილება", "back": "ჯერ ტყვიები იფანტება, მერე სამიზნე იხატება იქ, სადაც ჯგუფი შემთხვევით შეგროვდა. იგივე ხდება მონაცემებში: ბევრ ჯგუფს თუ გადახედავ, ერთგან შემთხვევითი თავშეყრა გამოჩნდება და მას კანონზომიერებას დაარქმევ. სამიზნე წინასწარ უნდა იყოს დასახული. წინააღმდეგ შემთხვევაში ნებისმიერი შემთხვევითი ლაქა აღმოჩენად ჩაითვლება."}];
  const expected = ["1ebc68b5e882", "84fe941f9d85", "f84122c09991", "04de1760aaae"];
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