import { DocxInline, DocxListInfo, DocxParagraph } from '../../../../shared/utils/docx';
import { questionHtml, questionImageIds, splitQuestions } from './www-question-import';

const QUESTIONS: DocxListInfo = { list: 'abstract:0', level: 0, ordered: true };
const SOURCES: DocxListInfo = { list: 'abstract:1', level: 0, ordered: true };

function text(value: string, format: Partial<Omit<DocxInline, 'kind'>> = {}): DocxInline {
  return {
    kind: 'text',
    text: value,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    link: null,
    ...format,
  } as DocxInline;
}

/** A paragraph; `\n` in the text is a manual line break. */
function p(content: string | DocxInline[], list: DocxListInfo | null = null): DocxParagraph {
  const lines =
    typeof content === 'string' ? content.split('\n').map((line) => [text(line)]) : [content];
  return { list, lines };
}

describe('splitQuestions', () => {
  it('splits Word-numbered questions and ignores the header, sources and authors', () => {
    const questions = splitQuestions([
      p('სუპერლიგა'),
      p('ავტორები: ლუკა ქირია (10.5)'),
      p('პირველი კითხვა', QUESTIONS),
      p('პასუხი: საქორწინო ბეჭედი'),
      p('კომენტარი: რელიგიურ საზოგადოებაში…'),
      p('წყარო: Р. В. Игнатов'),
      p('https://example.com', SOURCES),
      p('ავტორი: მაქსიმ კორნეევეცი'),
      p(''),
      p('ყურადღება, კითხვაში ცვლილებებია!', QUESTIONS),
      p('მეორე კითხვა\nპასუხი: Abdomen\nკომენტარი: b და d\nწყარო: https://vt.tiktok.com'),
      p('შესვენება'),
    ]);

    expect(questions.length).toBe(2);
    expect(questions[0]).toEqual({
      body: [[text('პირველი კითხვა')]],
      answer: 'საქორწინო ბეჭედი',
      comment: 'რელიგიურ საზოგადოებაში…',
      skippedImages: 0,
    });
    expect(questions[1].body).toEqual([
      [text('ყურადღება, კითხვაში ცვლილებებია!')],
      [text('მეორე კითხვა')],
    ]);
    expect(questions[1].answer).toBe('Abdomen');
    expect(questions[1].comment).toBe('b და d');
  });

  it('keeps accepted answers in the answer and multi-line comments', () => {
    const [question] = splitQuestions([
      p('კითხვა', QUESTIONS),
      p('პასუხი: დაეკავებინათ'),
      p('ჩათვლა: დაეპატიმრებინათ.'),
      p('არ ჩაითვლება: სხვა'),
      p('კომენტარი: ლექსი:\n“პირველი სტრიქონი,'),
      p('მეორე სტრიქონი.”'),
      p('ავტორი: ნატალია კომარი'),
    ]);

    expect(question.answer).toBe('დაეკავებინათ\nჩათვლა: დაეპატიმრებინათ.\nარ ჩაითვლება: სხვა');
    expect(question.comment).toBe('ლექსი:\n“პირველი სტრიქონი,\nმეორე სტრიქონი.”');
  });

  it('prefers the list whose items are followed by an answer over a longer sources list', () => {
    const questions = splitQuestions([
      p('კითხვა 1', QUESTIONS),
      p('პასუხი: ა'),
      p('წყარო:'),
      p('ერთი', SOURCES),
      p('ორი', SOURCES),
      p('სამი', SOURCES),
      p('ავტორი: X'),
      p('კითხვა 2', QUESTIONS),
      p('პასუხი: ბ'),
    ]);

    expect(questions.map((q) => q.answer)).toEqual(['ა', 'ბ']);
  });

  it('falls back to typed numbers that follow each other', () => {
    const questions = splitQuestions([
      p('ტური 2'),
      p('13. პირველი'),
      p('1. სიაში ჩამონათვალი'),
      p('პასუხი: ა'),
      p('წყარო: 1. https://a'),
      p('2. https://b'),
      p('14) მეორე'),
      p('პასუხი: ბ'),
    ]);

    expect(questions.length).toBe(2);
    expect(questions[0].body).toEqual([[text('პირველი')], [text('1. სიაში ჩამონათვალი')]]);
    expect(questions[1].body).toEqual([[text('მეორე')]]);
  });

  it('trims blank lines, keeps a question without an answer and counts images in comments', () => {
    const [first, second] = splitQuestions([
      p('', QUESTIONS),
      p('მასალა #1:'),
      p(''),
      p(''),
      p('ტექსტი'),
      p(''),
      p('ბოლო კითხვა', QUESTIONS),
      p('პასუხი: ბ\nკომენტარი: სურათით'),
      p([{ kind: 'image', id: 'rId9' }]),
    ]);

    expect(first.body).toEqual([[text('მასალა #1:')], [text('')], [text('ტექსტი')]]);
    expect(first.answer).toBe('');
    expect(second.skippedImages).toBe(1);
  });
});

describe('questionHtml', () => {
  it('renders lines as paragraphs with formatting, links and uploaded images', () => {
    const body: DocxInline[][] = [
      [text('დასარიგებელი <მასალა>')],
      [text('[ '), { kind: 'image', id: 'rId1' }, { kind: 'image', id: 'rId2' }, text(' ]')],
      [],
      [
        text('ეს', { bold: true, underline: true }),
        text(' ბმული', { link: 'https://example.com/?a=1&b="2"' }),
        text(' js', { link: 'javascript:alert(1)' }),
      ],
    ];

    expect(questionHtml(body, new Map([['rId1', 'https://cdn/x.jpg']]))).toBe(
      '<p>დასარიგებელი &lt;მასალა&gt;</p>' +
        '<p>[ <img src="https://cdn/x.jpg"> ]</p>' +
        '<p><br></p>' +
        '<p><u><strong>ეს</strong></u><a href="https://example.com/?a=1&amp;b=&quot;2&quot;"> ბმული</a> js</p>',
    );
  });

  it('returns an empty string when nothing visible is left', () => {
    expect(questionHtml([[text('  ')], [{ kind: 'image', id: 'rId1' }]], new Map())).toBe('');
  });
});

describe('questionImageIds', () => {
  it('lists image ids once, in order', () => {
    const image = (id: string): DocxInline => ({ kind: 'image', id });
    expect(
      questionImageIds([
        [image('b'), text('x')],
        [image('a'), image('b')],
      ]),
    ).toEqual(['b', 'a']);
  });
});
