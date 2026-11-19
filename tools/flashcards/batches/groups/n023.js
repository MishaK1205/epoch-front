(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "იკეას ეფექტი", "back": "ადამიანი უფრო მეტად აფასებს ნივთს, რომელიც თავად ააწყო, თუნდაც აწყობა მარტივი ყოფილიყო და შედეგი მზა ნივთს არ აღემატებოდეს. შრომა ნივთს საკუთარს ხდის. მაიკლ ნორტონმა, დანიელ მოჩონმა და დენ არიელიმ ეს ეფექტი ავეჯის, ორიგამისა და საკუთარი ხელით აწყობილი ნაკრებების მაგალითზე აჩვენეს. ფასი აქ ხარისხს კი არ ემატება, არამედ „ეს მე გავაკეთე“ განცდას."}, {"front": "დიდროს ეფექტი", "back": "ერთმა ახალმა ნივთმა შეიძლება ძველი ნივთები გაგიუარესოს და ახალი შენაძენების ჯაჭვი წამოიწყოს. დენი დიდრომ ეს თავის ახალ ხალათზე დაწერა: ხალათის გვერდით ძველი ავეჯი უცებ ღარიბულად გამოჩნდა. ახალი სტანდარტი მეზობელ საგნებსაც ედავება. ეფექტი სწორედ ამ ესეს სახელს ატარებს."}, {"front": "სატყუარას ეფექტი", "back": "მესამე, შეგნებულად სუსტი ვარიანტი ერთ-ერთ ძირითად ვარიანტს უფრო მიმზიდველს ხდის. თუ ძვირი და კარგი ჟურნალი საშუალო ფასის ჟურნალს ეჯიბრება, მათ შორის ცუდად შერჩეული, თითქმის ისეთივე ძვირი, მაგრამ უარესი ვარიანტი ადამიანებს ძვირისკენ წევს. სატყუარას თითქმის არავინ ირჩევს. მისი საქმე შედარების ჩარჩოს შეცვლაა."}, {"front": "არჩევანის პარადოქსი", "back": "მეტი ვარიანტი თავიდან თავისუფლებად ჩანს, მაგრამ გარკვეულ ზღვარს რომ გადააჭარბებს, არჩევანი ძნელდება, კმაყოფილება კი მცირდება. ადამიანი უფრო მეტ შედარებას აკეთებს, უფრო მეტ უარს განიცდის და უფრო ადვილად ნანობს. ბარი შვარცმა ეს აზრი პოპულარული გახადა. ეფექტი ყველა თაროზე არ ჩანს: ის ძლიერდება იქ, სადაც ვარიანტები ბევრია, რთულია და არჩევანს დიდი წონა აქვს."}];
  const expected = ["bede5245dfe6", "5ecf795ddf8c", "963a99add7e7", "11e66e48ec89"];
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