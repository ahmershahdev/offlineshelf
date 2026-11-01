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
    a: 'Yes, with union, intersection and difference of up to ten lists, for example Physics minus Biographies. A combination rebuilds by itself when one of its source lists gets a new version. Sources must be your own lists on the same wiki.',
  },
  {
    topic: 'Exports',
    q: 'What does OfflineShelf export?',
    a: 'A TSV file of titles, page IDs and revision IDs, and a static HTML bundle of the articles with attribution. and a ZIM file that the Kiwix apps open, with full-text search.',
  },
  {
    topic: 'Exports',
    q: 'Can I use an export with Kiwix?',
    a: 'Yes. Make a ZIM file from any ready version of up to 1,000 articles and open it in Kiwix on a phone, a computer or a Kiwix hotspot. For bigger collections, the TSV works with Kiwix tooling such as mwoffliner.',
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
  {
    topic: 'Basics',
    q: 'Do I need to install anything?',
    a: 'No. Lists are built in your browser through the hosted app, and an HTML bundle opens in any browser straight from a USB stick. Schools and libraries that want their own server can self-host with Docker Compose.',
  },
  {
    topic: 'Basics',
    q: 'Does it work without internet?',
    a: 'Building a list needs internet, because the articles are looked up on Wikipedia. Reading an exported HTML bundle does not: once it is unzipped on a device, every article on the list opens offline.',
  },
  {
    topic: 'Lists',
    q: 'Which builder should I use?',
    a: 'Category for topics Wikipedia already groups, Wikidata for things that share a property (every river in a country), pasted titles for a syllabus you already have, pageviews for what people actually read, and a combination to join or subtract lists. The Builders page has a table to help choose.',
  },
  {
    topic: 'Lists',
    q: 'How do monthly rebuilds work?',
    a: 'Lists marked monthly are rebuilt once per calendar month (UTC). The scheduler checks every hour, so a server that was down on the first catches up within the hour. Each rebuild is a new version; earlier versions stay available.',
  },
  {
    topic: 'Lists',
    q: 'Why did my build fail?',
    a: 'The reason is shown in the build history under Details: a category that does not exist, a SPARQL query that timed out, a list over 100,000 articles, or Wikimedia being unreachable after several retries. The previous good version stays current, and you get one email a day at most.',
  },
  {
    topic: 'Lists',
    q: 'Can I edit a list after creating it?',
    a: 'Not yet. Make a new list with the settings you want, or combine lists to adjust one. Editing comes with the account settings work; until then lists keep the settings they were made with, which also makes every version reproducible.',
  },
  {
    topic: 'Exports',
    q: 'What is in an HTML bundle?',
    a: 'A zip with one page per article, an index and an attribution page. Links between articles on the list open the local copies; other links go to Wikipedia. Each page ends with its source revision and the CC BY-SA licence.',
  },
  {
    topic: 'Exports',
    q: 'Are images included?',
    a: 'Images are linked, not copied, so they show when a device is online. HTML bundles and ZIM files carry text only, which keeps them small.',
  },
  {
    topic: 'Exports',
    q: 'Why do downloads expire after 7 days?',
    a: 'Bundles contain article text, which OfflineShelf does not keep. After a week the file is deleted; you can make a new one from the same version at any time and get the same articles, because each version pins exact revisions.',
  },
  {
    topic: 'Exports',
    q: 'Can I share an export with others?',
    a: 'Yes. Wikipedia text is licensed CC BY-SA 4.0, which allows sharing as long as the authors are credited and the licence travels with the text. Every export already includes both; keep the attribution page with the bundle.',
  },
  {
    topic: 'Project',
    q: 'Who makes OfflineShelf?',
    a: 'Syed Ahmer Shah, an independent developer, in the open on GitHub. The project is part of a proposal to the Kiwix community.',
  },
  {
    topic: 'Project',
    q: 'How can I help?',
    a: 'Try it with a real collection and say what is missing, report bugs on GitHub, or suggest wikis and use cases. Schools, libraries and offline projects that want to pilot it are especially welcome; write to support@ahmershah.dev.',
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
