(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "დიამანტისა და წყლის პარადოქსი", "back": "წყალი სიცოცხლისთვის აუცილებელია და იაფია, დიამანტი კი ნაკლებად საჭიროა და ძვირია. ადამ სმითმა ეს წინააღმდეგობა დაასახელა. ამოხსნა ზღვრულ სარგებლიანობაშია: ფასს წყვეტს არა მთელი წყლის სარგები, არამედ კიდევ ერთი ლიტრის სარგები. სადაც წყალი ბევრია, კიდევ ერთი ლიტრი ცოტას მატებს; სადაც დიამანტი იშვიათია, კიდევ ერთი ქვა ბევრს."}, {"front": "გიფენის საქონელი", "back": "საქონელი, რომელზეც მოთხოვნა ფასის ზრდასთან ერთად იზრდება. ეს ჩვეულებრივ წესს ეწინააღმდეგება და მხოლოდ განსაკუთრებულ პირობებში ჩნდება: საქონელი ღარიბი მყიდველისთვის ისე მნიშვნელოვანია, რომ გაძვირების შემდეგ მას სხვა, უკეთეს საქონელზე უარს ამბობინებს და ამ საქონელს კიდევ უფრო მეტს ყიდულობს. ისტორიული მაგალითები სადავოა, მაგრამ ლოგიკური შესაძლებლობა ნამდვილია."}, {"front": "ვებლენის საქონელი", "back": "საქონელი, რომელზეც მოთხოვნა ნაწილობრივ იმიტომ იზრდება, რომ ფასი მაღალია და მაღალი ფასი სტატუსს აჩვენებს. იაფი ვერსია იმავე სარგებელს ვერ იძლევა, რადგან სარგებლის ნაწილი სწორედ სიძვირის ჩვენებაა. თორსტენ ვებლენმა ეს საჩვენებელ მოხმარებაზე დაწერა. აქ ფასი მხოლოდ დაბრკოლება კი არა, თავად საქონლის ნაწილია."}, {"front": "დაზოგვის პარადოქსი", "back": "ჯონ მეინარდ კეინსის არგუმენტი: თუ რეცესიის დროს ყველა ერთად მეტს დაზოგავს და ნაკლებს დახარჯავს, მოთხოვნა დაეცემა, შემოსავალიც შემცირდება და საერთო დანაზოგი შეიძლება ვერც გაიზარდოს. ერთი ოჯახისთვის გონივრული სიფრთხილე ყველას ერთად შეიძლება გააღარიბოს. ეს ყოველთვის მოქმედი კანონი არ არის. ის იმ სიტუაციას ეხება, სადაც ეკონომიკა მოთხოვნის ნაკლებობით არის შეჩერებული."}];
  const expected = ["f17ba7a95adc", "911d485f5876", "a91bd33d531b", "6fb9f3c0d08f"];
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