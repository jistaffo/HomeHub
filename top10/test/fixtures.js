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
