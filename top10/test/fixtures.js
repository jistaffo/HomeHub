// Minimal fake OMDb so tests run offline.
import http from 'node:http';

export const FILMS = {
  tt0111161: { Title: 'The Shawshank Redemption', Year: '1994', Director: 'Frank Darabont', Writer: 'Stephen King, Frank Darabont', Actors: 'Tim Robbins, Morgan Freeman, Bob Gunton', Metascore: '82', imdbRating: '9.3', Ratings: [{ Source: 'Internet Movie Database', Value: '9.3/10' }, { Source: 'Rotten Tomatoes', Value: '89%' }, { Source: 'Metacritic', Value: '82/100' }] },
  tt0088763: { Title: 'Back to the Future', Year: '1985', Director: 'Robert Zemeckis', Writer: 'Robert Zemeckis, Bob Gale', Actors: 'Michael J. Fox, Christopher Lloyd, Lea Thompson', Metascore: '87', imdbRating: '8.5', Ratings: [{ Source: 'Internet Movie Database', Value: '8.5/10' }, { Source: 'Rotten Tomatoes', Value: '93%' }] },
  tt1375666: { Title: 'Inception', Year: '2010', Director: 'Christopher Nolan', Writer: 'Christopher Nolan', Actors: 'Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page', Metascore: '74', imdbRating: '8.8', Ratings: [] },
};

export function startMockOmdb() {
  const server = http.createServer((req, res) => {
    const q = new URL(req.url, 'http://x').searchParams;
    res.setHeader('content-type', 'application/json');
    if (q.get('apikey') !== 'test') return res.end(JSON.stringify({ Response: 'False', Error: 'Invalid API key!' }));
    if (q.get('s')) {
      const s = q.get('s').toLowerCase();
      const hits = Object.entries(FILMS).filter(([, f]) => f.Title.toLowerCase().includes(s));
      return res.end(JSON.stringify(hits.length ? { Response: 'True', Search: hits.map(([id, f]) => ({ imdbID: id, Title: f.Title, Year: f.Year, Poster: 'N/A' })) } : { Response: 'False', Error: 'Movie not found!' }));
    }
    const f = FILMS[q.get('i')];
    if (!f) return res.end(JSON.stringify({ Response: 'False', Error: 'Incorrect IMDb ID.' }));
    res.end(JSON.stringify({ ...f, imdbID: q.get('i'), Plot: q.get('plot') === 'full' ? 'Full plot with the ending.' : 'Short premise.', Poster: 'N/A', Runtime: '120 min', Genre: 'Drama', Rated: 'R', Response: 'True' }));
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

// Minimal fake TMDB, shaped like the real v3 responses.
export const TMDB = {
  278: {
    imdb: 'tt0111161', title: 'The Shawshank Redemption', release_date: '1994-09-23', runtime: 142, poster_path: '/shawshank.jpg',
    overview: 'Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.',
    genres: [{ id: 18, name: 'Drama' }, { id: 80, name: 'Crime' }],
    cast: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton', 'William Sadler', 'Clancy Brown'],
    crew: [{ name: 'Frank Darabont', job: 'Director', department: 'Directing' }, { name: 'Frank Darabont', job: 'Screenplay', department: 'Writing' }, { name: 'Stephen King', job: 'Novel', department: 'Writing' }],
  },
  105: {
    imdb: 'tt0088763', title: 'Back to the Future', release_date: '1985-07-03', runtime: 116, poster_path: '/bttf.jpg', overview: 'Marty McFly is sent back in time.',
    genres: [{ id: 12, name: 'Adventure' }], cast: ['Michael J. Fox', 'Christopher Lloyd', 'Lea Thompson', 'Crispin Glover'],
    crew: [{ name: 'Robert Zemeckis', job: 'Director', department: 'Directing' }, { name: 'Robert Zemeckis', job: 'Writer', department: 'Writing' }, { name: 'Bob Gale', job: 'Writer', department: 'Writing' }],
  },
  // Only on TMDB: no OMDb record, so details come entirely from TMDB.
  999: {
    imdb: 'tt9999999', title: 'Indie Darling', release_date: '2021-05-01', runtime: 95, poster_path: null, overview: 'A small film.',
    genres: [], cast: ['A One', 'B Two', 'C Three', 'D Four', 'E Five'], crew: [{ name: 'Some Director', job: 'Director', department: 'Directing' }],
  },
  // Not on IMDb at all.
  1000: { imdb: null, title: 'Unlisted', release_date: '2026-01-01', runtime: null, poster_path: null, overview: '', genres: [], cast: [], crew: [] },
};

export function startMockTmdb() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    res.setHeader('content-type', 'application/json');
    const ok = url.searchParams.get('api_key') === 'test' || req.headers.authorization === `Bearer ${'x'.repeat(60)}`;
    if (!ok) return res.writeHead(401).end(JSON.stringify({ status_message: 'Invalid API key' }));
    const p = url.pathname.replace(/^\/3/, '');
    let m;
    if (p === '/search/movie') {
      const q = url.searchParams.get('query').toLowerCase();
      const year = url.searchParams.get('primary_release_year');
      const results = Object.entries(TMDB)
        .filter(([, f]) => f.title.toLowerCase().includes(q) && (!year || f.release_date.startsWith(year)))
        .map(([id, f]) => ({ id: Number(id), title: f.title, release_date: f.release_date, poster_path: f.poster_path }));
      return res.end(JSON.stringify({ page: 1, results, total_results: results.length }));
    }
    if ((m = p.match(/^\/find\/(tt\d+)$/))) {
      const hit = Object.entries(TMDB).find(([, f]) => f.imdb === m[1]);
      return res.end(JSON.stringify({ movie_results: hit ? [{ id: Number(hit[0]), title: hit[1].title }] : [] }));
    }
    if ((m = p.match(/^\/movie\/(\d+)\/external_ids$/))) {
      const f = TMDB[m[1]];
      if (!f) return res.writeHead(404).end('{}');
      return res.end(JSON.stringify({ id: Number(m[1]), imdb_id: f.imdb }));
    }
    if ((m = p.match(/^\/movie\/(\d+)$/))) {
      const f = TMDB[m[1]];
      if (!f) return res.writeHead(404).end('{}');
      const body = { id: Number(m[1]), imdb_id: f.imdb, title: f.title, release_date: f.release_date, runtime: f.runtime, poster_path: f.poster_path, overview: f.overview, genres: f.genres };
      if (url.searchParams.get('append_to_response') === 'credits') {
        body.credits = {
          // Real TMDB returns cast roughly in billing order but `order` is authoritative.
          cast: f.cast.map((name, order) => ({ name, order })).reverse(),
          crew: f.crew,
        };
      }
      return res.end(JSON.stringify(body));
    }
    res.writeHead(404).end('{}');
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}
