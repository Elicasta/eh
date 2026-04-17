/* Living Word Studio — KJV Bible Module
 *
 * Provides verse lookup, reference parsing, chapter loading,
 * and keyword search from local JSON data.
 *
 * Data lives in assets/data/bible/kjv-essential.json (bundled key passages)
 * Full per-book files can be added to assets/data/bible/{bookid}.json
 * and will be loaded lazily on first request.
 *
 * To add a full KJV dataset:
 *   1. Download public-domain KJV JSON (e.g. github.com/aruljohn/Bible-kjv)
 *   2. Convert each book to the format: { "1": { "1": "verse text", ... }, ... }
 *   3. Save as assets/data/bible/{BOOKID}.json  (e.g. ROM.json, JHN.json)
 */

const LWSBible = (() => {

  /* ── In-memory cache ── */
  const _cache     = {};   // bookId -> { chapter -> { verse -> text } }
  let   _essential = null; // loaded once
  let   _books     = null; // metadata array

  /* ── Normalisation maps ── */
  const ALIASES = {
    'genesis':'GEN','gen':'GEN','ge':'GEN',
    'exodus':'EXO','exo':'EXO','ex':'EXO',
    'leviticus':'LEV','lev':'LEV','le':'LEV',
    'numbers':'NUM','num':'NUM','nu':'NUM',
    'deuteronomy':'DEU','deu':'DEU','deut':'DEU','dt':'DEU',
    'joshua':'JOS','jos':'JOS','josh':'JOS',
    'judges':'JDG','jdg':'JDG','jud':'JDG',
    'ruth':'RUT','rut':'RUT',
    '1samuel':'1SA','1sa':'1SA','1sam':'1SA',
    '2samuel':'2SA','2sa':'2SA','2sam':'2SA',
    '1kings':'1KI','1ki':'1KI','1kgs':'1KI',
    '2kings':'2KI','2ki':'2KI','2kgs':'2KI',
    '1chronicles':'1CH','1ch':'1CH','1chr':'1CH',
    '2chronicles':'2CH','2ch':'2CH','2chr':'2CH',
    'ezra':'EZR','ezr':'EZR',
    'nehemiah':'NEH','neh':'NEH',
    'esther':'EST','est':'EST',
    'job':'JOB',
    'psalms':'PSA','psalm':'PSA','psa':'PSA','ps':'PSA',
    'proverbs':'PRO','pro':'PRO','prov':'PRO',
    'ecclesiastes':'ECC','ecc':'ECC','eccl':'ECC',
    'songofsolomon':'SNG','sng':'SNG','song':'SNG','sos':'SNG',
    'isaiah':'ISA','isa':'ISA',
    'jeremiah':'JER','jer':'JER',
    'lamentations':'LAM','lam':'LAM',
    'ezekiel':'EZK','ezk':'EZK','eze':'EZK',
    'daniel':'DAN','dan':'DAN',
    'hosea':'HOS','hos':'HOS',
    'joel':'JOL','jol':'JOL',
    'amos':'AMO','amo':'AMO',
    'obadiah':'OBA','oba':'OBA',
    'jonah':'JON','jon':'JON',
    'micah':'MIC','mic':'MIC',
    'nahum':'NAH','nah':'NAH',
    'habakkuk':'HAB','hab':'HAB',
    'zephaniah':'ZEP','zep':'ZEP',
    'haggai':'HAG','hag':'HAG',
    'zechariah':'ZEC','zec':'ZEC',
    'malachi':'MAL','mal':'MAL',
    'matthew':'MAT','mat':'MAT','matt':'MAT',
    'mark':'MRK','mrk':'MRK','mk':'MRK','mar':'MRK',
    'luke':'LUK','luk':'LUK','lk':'LUK',
    'john':'JHN','jhn':'JHN','jn':'JHN',
    'acts':'ACT','act':'ACT',
    'romans':'ROM','rom':'ROM',
    '1corinthians':'1CO','1co':'1CO','1cor':'1CO',
    '2corinthians':'2CO','2co':'2CO','2cor':'2CO',
    'galatians':'GAL','gal':'GAL',
    'ephesians':'EPH','eph':'EPH',
    'philippians':'PHP','php':'PHP','phil':'PHP',
    'colossians':'COL','col':'COL',
    '1thessalonians':'1TH','1th':'1TH','1thes':'1TH',
    '2thessalonians':'2TH','2th':'2TH','2thes':'2TH',
    '1timothy':'1TI','1ti':'1TI','1tim':'1TI',
    '2timothy':'2TI','2ti':'2TI','2tim':'2TI',
    'titus':'TIT','tit':'TIT',
    'philemon':'PHM','phm':'PHM',
    'hebrews':'HEB','heb':'HEB',
    'james':'JAS','jas':'JAS',
    '1peter':'1PE','1pe':'1PE','1pet':'1PE',
    '2peter':'2PE','2pe':'2PE','2pet':'2PE',
    '1john':'1JN','1jn':'1JN',
    '2john':'2JN','2jn':'2JN',
    '3john':'3JN','3jn':'3JN',
    'jude':'JUD','jud':'JUD',
    'revelation':'REV','rev':'REV',
  };

  /* ── Load essential data on first call ── */
  async function _loadEssential() {
    if (_essential) return _essential;
    try {
      const r = await fetch('assets/data/bible/kjv-essential.json');
      _essential = await r.json();
    } catch {
      _essential = {};
      console.warn('LWSBible: could not load kjv-essential.json');
    }
    return _essential;
  }

  /* ── Try to load a full book file ── */
  async function _loadBook(bookId) {
    if (_cache[bookId]) return _cache[bookId];

    /* Check essential data first */
    const essential = await _loadEssential();
    if (essential[bookId]) {
      _cache[bookId] = essential[bookId];
      return _cache[bookId];
    }

    /* Try loading a dedicated book file */
    try {
      const r = await fetch(`assets/data/bible/${bookId}.json`);
      if (!r.ok) throw new Error(r.status);
      const data     = await r.json();
      _cache[bookId] = data;
      return data;
    } catch {
      /* Book file not found — return null gracefully */
      return null;
    }
  }

  /* ── Load books metadata ── */
  async function getBooks() {
    if (_books) return _books;
    try {
      const r = await fetch('assets/data/bible/books.json');
      _books  = await r.json();
    } catch {
      _books = [];
    }
    return _books;
  }

  /* ══════════════════════
     REFERENCE PARSER
     Handles: "John 3:16", "Rom 8:28-39", "Ps 23", "1 Co 13:4-8"
  ══════════════════════ */

  function parseReference(ref) {
    if (!ref || typeof ref !== 'string') return null;

    /* Normalise: remove extra spaces, lower-case for matching */
    const clean = ref.trim().replace(/\s+/g, ' ');

    /* Pattern: optional leading number + book name + chapter + optional :verse or :verseStart-verseEnd */
    const pattern = /^(\d\s?)?([a-zA-Z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/;
    const match   = clean.match(pattern);

    if (!match) return null;

    const prefix  = (match[1] || '').trim();
    const rawBook = (prefix ? prefix + match[2] : match[2]).toLowerCase().replace(/\s/g, '');
    const chapter = parseInt(match[3], 10);
    const vStart  = match[4] ? parseInt(match[4], 10) : null;
    const vEnd    = match[5] ? parseInt(match[5], 10) : null;

    const bookId = ALIASES[rawBook];
    if (!bookId) return null;

    return { bookId, chapter, verseStart: vStart, verseEnd: vEnd, original: clean };
  }

  /* ══════════════════════
     VERSE & PASSAGE GETTERS
  ══════════════════════ */

  async function getVerse(reference) {
    const parsed = typeof reference === 'string' ? parseReference(reference) : reference;
    if (!parsed || !parsed.verseStart) return null;

    const bookData = await _loadBook(parsed.bookId);
    if (!bookData) return { text: null, notFound: true, reference };

    const chapter = bookData[String(parsed.chapter)];
    if (!chapter)  return { text: null, notFound: true, reference };

    const text = chapter[String(parsed.verseStart)];
    if (!text)  return { text: null, notFound: true, reference };

    return {
      text,
      reference,
      bookId:  parsed.bookId,
      chapter: parsed.chapter,
      verse:   parsed.verseStart,
    };
  }

  async function getPassage(reference) {
    const parsed = typeof reference === 'string' ? parseReference(reference) : reference;
    if (!parsed) return null;

    const bookData = await _loadBook(parsed.bookId);
    if (!bookData)  return { verses: [], notFound: true, reference };

    const chapter = bookData[String(parsed.chapter)];
    if (!chapter)  return { verses: [], notFound: true, reference };

    /* Single verse */
    if (parsed.verseStart && !parsed.verseEnd) {
      const text = chapter[String(parsed.verseStart)];
      return text
        ? { verses: [{ verse: parsed.verseStart, text }], reference }
        : { verses: [], notFound: true, reference };
    }

    /* Verse range */
    if (parsed.verseStart && parsed.verseEnd) {
      const verses = [];
      for (let v = parsed.verseStart; v <= parsed.verseEnd; v++) {
        if (chapter[String(v)]) verses.push({ verse: v, text: chapter[String(v)] });
      }
      return { verses, reference };
    }

    /* Whole chapter */
    const verses = Object.entries(chapter)
      .map(([v, text]) => ({ verse: parseInt(v, 10), text }))
      .sort((a, b) => a.verse - b.verse);
    return { verses, reference };
  }

  /* ── Format passage as readable string ── */
  function formatPassage(result, opts = {}) {
    if (!result || !result.verses || !result.verses.length) {
      return result?.notFound
        ? `[${result.reference} — not in local dataset. Add full KJV book files to assets/data/bible/]`
        : '';
    }
    const showNumbers = opts.showNumbers !== false;
    return result.verses
      .map(v => showNumbers ? `[${v.verse}] ${v.text}` : v.text)
      .join('\n');
  }

  /* ══════════════════════
     KEYWORD SEARCH  (searches loaded essential data)
  ══════════════════════ */

  async function searchBible(query, limit = 20) {
    if (!query || query.length < 3) return [];

    const essential = await _loadEssential();
    const books     = await getBooks();
    const q         = query.toLowerCase();
    const results   = [];

    for (const [bookId, chapters] of Object.entries(essential)) {
      const meta = books.find(b => b.id === bookId);
      for (const [chNum, verses] of Object.entries(chapters)) {
        for (const [vNum, text] of Object.entries(verses)) {
          if (text.toLowerCase().includes(q)) {
            results.push({
              bookId,
              bookName: meta?.name || bookId,
              chapter:  parseInt(chNum, 10),
              verse:    parseInt(vNum, 10),
              text,
              reference: `${meta?.name || bookId} ${chNum}:${vNum}`,
            });
            if (results.length >= limit) return results;
          }
        }
      }
    }

    return results;
  }

  /* ── Quick display helper used in the scripture panel ── */
  async function lookupAndFormat(refString) {
    const parsed = parseReference(refString.trim());
    if (!parsed) return { display: `Could not parse "${refString}"`, found: false };

    const result = await getPassage(parsed);
    const display = formatPassage(result, { showNumbers: result.verses.length > 1 });

    return {
      display: display || `[${refString} — not found in local dataset]`,
      found:   result.verses.length > 0,
      result,
    };
  }

  /* ── Get book name from ID ── */
  async function bookName(id) {
    const books = await getBooks();
    return books.find(b => b.id === id)?.name || id;
  }

  return {
    getBooks,
    parseReference,
    getVerse,
    getPassage,
    formatPassage,
    searchBible,
    lookupAndFormat,
    bookName,
    /* Expose for testing */
    _loadEssential,
    ALIASES,
  };

})();
