export type Faq = { q: string; a: string; topic: 'Basics' | 'Lists' | 'Exports' | 'Project' }

export const FAQ_ALL: Faq[] = [
  {
    topic: 'Basics',
    q: 'What is OfflineShelf?',
    a: 'A tool for building Wikipedia reading lists for offline use. You describe a list with a category, a Wikidata query, pasted titles or the most-read articles, and OfflineShelf turns it into a reproducible set of articles you can rebuild, combine and export.',
  },
  {
    topic: 'Basics',
    q: 'Who is it for?',
    a: 'Schools, libraries, clinics and anyone preparing Wikipedia content for places with little or no internet, and the people who build offline collections for Kiwix.',
  },
  {
    topic: 'Basics',
    q: 'Is OfflineShelf free and open source?',
    a: 'Yes. The code is MIT licensed and can be self-hosted with Docker Compose.',
  },
  {
    topic: 'Basics',
    q: 'Does OfflineShelf copy Wikipedia articles into its database?',
    a: 'No. It stores titles and IDs only. Article text is fetched from Wikimedia while an export is written, and every export carries the CC BY-SA attribution.',
  },
  {
    topic: 'Lists',
    q: 'Which wikis can I build lists from?',
    a: 'Any language edition of Wikipedia, and the other Wikimedia content projects such as Wikivoyage, Wikibooks and Wikisource.',
  },
  {
    topic: 'Lists',
    q: 'How big can a list be?',
    a: 'Up to 100,000 articles. Pasted lists take up to 20,000 titles, category builds go up to 5 levels deep, and the top-pageviews builder returns up to 1,000 articles. Self-hosted installs can change every limit.',
  },
  {
    topic: 'Lists',
    q: 'What happens when a scheduled rebuild fails?',
    a: 'Nothing is lost. The last good version stays current, the failure is recorded with a reason, and the next rebuild tries again.',
  },
  {
    topic: 'Lists',
    q: 'Can I combine lists?',
    a: 'Yes, with union, intersection and difference of up to ten lists, for example Physics minus Biographies. A combination rebuilds when one of its source lists changes. This arrives with milestone M4.',
  },
  {
    topic: 'Exports',
    q: 'What does OfflineShelf export?',
    a: 'A TSV file of titles, page IDs and revision IDs, and a static HTML bundle of the articles with attribution. ZIM export for Kiwix is planned for small lists.',
  },
  {
    topic: 'Exports',
    q: 'Can I use an export with Kiwix?',
    a: 'The TSV works with Kiwix tooling such as mwoffliner today. A direct ZIM export, which Kiwix opens as is, is a stretch goal for small lists.',
  },
  {
    topic: 'Project',
    q: 'When does OfflineShelf launch?',
    a: 'The public instance goes live at offlineshelf.ahmershah.dev in February 2027. The code, roadmap and progress are public on GitHub now.',
  },
  {
    topic: 'Project',
    q: 'Is OfflineShelf part of Wikimedia?',
    a: 'No. It is an independent open source project built on Wikimedia public APIs. Wikipedia is a trademark of the Wikimedia Foundation.',
  },
]

export const FAQ = FAQ_ALL.filter((f) =>
  [
    'What does OfflineShelf export?',
    'Does OfflineShelf copy Wikipedia articles into its database?',
    'Which wikis can I build lists from?',
    'What happens when a scheduled rebuild fails?',
    'Is OfflineShelf free and open source?',
  ].includes(f.q),
)
