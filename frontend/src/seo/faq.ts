export const FAQ = [
  {
    q: 'What does OfflineShelf export?',
    a: 'A TSV file of titles, page IDs and revision IDs, and a static HTML bundle of the articles with attribution. ZIM export for Kiwix is planned for small lists.',
  },
  {
    q: 'Does OfflineShelf copy Wikipedia articles into its database?',
    a: 'No. It stores titles and IDs only. Article text is fetched from Wikimedia while an export is written, and every export carries the CC BY-SA attribution.',
  },
  {
    q: 'Which wikis can I build lists from?',
    a: 'Any language edition of Wikipedia, and the other Wikimedia content projects such as Wikivoyage, Wikibooks and Wikisource.',
  },
  {
    q: 'What happens when a scheduled rebuild fails?',
    a: 'Nothing is lost. The last good version stays current, the failure is recorded, and the next rebuild tries again.',
  },
  {
    q: 'Is OfflineShelf free and open source?',
    a: 'Yes. The code is MIT licensed and can be self-hosted with Docker Compose.',
  },
] as const
