import {
  containsAllTerms,
  highlight,
  matchingTags,
  normalizeSearchQuery,
  searchTerms,
} from './highlight';

describe('highlight utils', () => {
  it('normalizeSearchQuery trims and collapses whitespace', () => {
    expect(normalizeSearchQuery('  სებას \t  ბახ  ')).toBe('სებას ბახ');
    expect(searchTerms(' Bach  Organ ')).toEqual(['bach', 'organ']);
  });

  it('highlight marks a partial Georgian word', () => {
    expect(highlight('იოჰან სებასტიან ბახი', 'სებას')).toEqual([
      { text: 'იოჰან ', match: false },
      { text: 'სებას', match: true },
      { text: 'ტიან ბახი', match: false },
    ]);
  });

  it('highlight escapes regex characters and ignores case', () => {
    expect(highlight('Learning C++', 'c++')).toEqual([
      { text: 'Learning ', match: false },
      { text: 'C++', match: true },
    ]);
    expect(highlight('a.b axb', '.')).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b axb', match: false },
    ]);
  });

  it('highlight marks every word, longest first', () => {
    expect(highlight('სებასტიან ბახი', 'სებ სებასტიან ბახ')).toEqual([
      { text: 'სებასტიან', match: true },
      { text: ' ', match: false },
      { text: 'ბახ', match: true },
      { text: 'ი', match: false },
    ]);
  });

  it('highlight returns the whole text for a blank query', () => {
    expect(highlight('Baroque', '   ')).toEqual([{ text: 'Baroque', match: false }]);
  });

  it('matchingTags returns only tags containing a query word', () => {
    expect(matchingTags(['იოჰან სებასტიან ბახი', 'baroque'], 'სებას')).toEqual([
      'იოჰან სებასტიან ბახი',
    ]);
    expect(matchingTags(['baroque'], 'BAR')).toEqual(['baroque']);
  });

  it('containsAllTerms requires every word', () => {
    expect(containsAllTerms('Baroque organ music', 'organ bar')).toBe(true);
    expect(containsAllTerms('Baroque organ music', 'სებას')).toBe(false);
  });
});
