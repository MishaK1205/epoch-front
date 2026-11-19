(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "არსებული მდგომარეობის მიკერძოება", "back": "ადამიანი ურჩევნია დატოვოს ის, რაც უკვე აქვს, თუნდაც ალტერნატივა ობიექტურად არ ჩამოუვარდებოდეს. ცვლილება დანაკარგად იკითხება, დარჩენა კი უსაფრთხოდ. უილიამ სამუელსონმა და რიჩარდ ზეკჰაუზერმა ეს მიკერძოება დაასახელეს. ის ფლობის ეფექტსა და ნაგულისხმევის ეფექტს ენათესავება, მაგრამ უფრო ფართოა: საგნის ფლობაც არ სჭირდება, საკმარისია, რომ ერთი მდგომარეობა უკვე „ჩვენი“ იყოს."}, {"front": "კონტრასტის ეფექტი", "back": "საგანი იცვლება იმის მიხედვით, რასთან ადარებ. თბილი წყლის შემდეგ ჩვეულებრივი წყალი ცივად ჩანს, ძვირი საჩუქრის შემდეგ კი კარგი, მაგრამ მოკრძალებული საჩუქარი სუსტად. კონტრასტი აღქმაშიც მუშაობს და შეფასებაშიც. ამიტომ შედარების მეზობელი ხშირად თავად საგანზე მეტად წყვეტს შთაბეჭდილებას."}, {"front": "იარაღის ფოკუსი", "back": "საშიში ან უჩვეულო საგნის, მაგალითად იარაღის, თანდასწრებით მოწმეს უარესად ახსოვს დამნაშავის სახე და სხვა დეტალები. ყურადღება საფრთხეზე იყრის და დანარჩენი სცენა სუსტად იწერება. ეფექტი ყოველთვის ერთნაირი სიძლიერით არ ჩანს, მაგრამ კარგად ეთანხმება იმ აზრს, რომ მეხსიერება მთელ სცენას კი არა, ყურადღების ცენტრს ინახავს."}, {"front": "მიზნის გრადიენტი", "back": "რაც უფრო ახლოს არის მიზანი, მით უფრო მატულობს ძალისხმევა. კლარკ ჰალმა ეს ვირთხებზე დაინახა, მოგვიანებით კი ყავის ბარათებზეც: ადამიანი უფრო ხშირად ყიდულობს, როცა უფასო სასმელამდე ცოტა ბიჯი რჩება. დასაწყისში გზა გრძელია, ბოლოში კი ყოველი ნაბიჯი უფრო დიდ წილად ჩანს. ამიტომ უკვე დაწყებული პროგრესი, თუნდაც საჩუქრად მიცემული, ადამიანს უფრო ამოძრავებს."}];
  const expected = ["2d43678683e0", "90a7c6186081", "9337998bda54", "d08d4ec03d46"];
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