(async () => {
  const token = localStorage.getItem('epoch_access_token');
  const cards = [{"front": "პარეტოს პრინციპი", "back": "შედეგის დიდი ნაწილი ხშირად მიზეზების პატარა ნაწილიდან მოდის. ვილფრედო პარეტომ შენიშნა, რომ იტალიის მიწის დიდი წილი მოსახლეობის მცირე წილს ეკუთვნოდა, და 80 და 20 პროცენტი ამ აზრის ჩვეულებრივ ილუსტრაციად იქცა. ეს ბუნების ზუსტი კანონი არ არის. ის შეხსენებაა, რომ ძალისხმევა თანაბრად კი არა, იქ უნდა განაწილდეს, სადაც შედეგის დიდი ნაწილი იქმნება."}, {"front": "ჰოფშტადტერის კანონი", "back": "საქმეს ყოველთვის მეტი დრო სჭირდება, ვიდრე ელი, მაშინაც კი, როცა ჰოფშტადტერის კანონს ითვალისწინებ. დაგლას ჰოფშტადტერმა ეს წინადადება საკუთარ თავში ჩაკეცა: ვადის მარაგიც კი არ კმარა, რადგან მარაგიც ოპტიმისტურადაა დათვლილი. ეს დაგეგმვის ცდომილების იუმორისტული ფორმაა."}, {"front": "გუდჰარტის კანონი", "back": "როცა საზომი მიზნად იქცევა, ის კარგ საზომად წყვეტს ყოფნას. სანამ რიცხვი მხოლოდ მდგომარეობას აღწერდა, ის გამოსადეგი იყო; როცა ჯილდო და სასჯელი ამ რიცხვს მიებას, ადამიანები რიცხვს აუმჯობესებენ და არა იმ საქმეს, რასაც რიცხვი ზომავდა. ჩარლზ გუდჰარტმა ეს ეკონომიკურ მაჩვენებლებზე თქვა. იგივე საფრთხე ჩანს ნებისმიერ სამიზნეში, რომელსაც მოთამაშეები თავად აწარმოებენ."}, {"front": "გრეშემის კანონი", "back": "თუ „ცუდი“ და „კარგი“ ფული ერთნაირ ნომინალურ ფასად უნდა მიიღონ, ცუდი ფული მიმოქცევაში რჩება, კარგს კი ადამიანები ინახავენ. კანონი მაშინ მუშაობს, როცა ორივეს იძულებით ერთ ფასად იღებენ. თუ კარგი ფული თავისუფლად უფრო ძვირად გაიცვლება, ის მიმოქცევიდან არ ქრება. სახელი თომას გრეშემს მიეწერება, თუმცა აზრი უფრო ძველია."}];
  const expected = ["bab5db967384", "b13e7b55f9af", "b8a721243cca", "570e846e4698"];
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