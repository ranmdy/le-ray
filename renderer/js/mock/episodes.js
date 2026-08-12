export const EPISODES = {
  1: [
    {
      num: '1',
      title: 'Pilot',
      blurb: 'A body is found wrapped in plastic on the shore below the mill.',
      length: '1h 34m',
      bg: 'linear-gradient(120deg,#8c1f2f,#241a1e)',
    },
    {
      num: '2',
      title: 'Traces to Nowhere',
      blurb: 'Cooper takes his first statements and finds the town already rearranging its story.',
      length: '47m',
      bg: 'linear-gradient(120deg,#2f5c3f,#161d18)',
    },
    {
      num: '3',
      title: 'Zen, or the Skill to Catch a Killer',
      blurb: 'A dream gives the investigation a shape no report can carry.',
      length: '47m',
      bg: 'linear-gradient(120deg,#3d4a6b,#14161f)',
    },
    {
      num: '4',
      title: 'Rest in Pain',
      blurb: 'The funeral goes badly, and the Log Lady has something to say.',
      length: '46m',
      bg: 'linear-gradient(120deg,#6b4a2f,#1d1712)',
    },
    {
      num: '5',
      title: 'The One-Armed Man',
      blurb: 'A name from the dream turns out to belong to someone real.',
      length: '46m',
      bg: 'linear-gradient(120deg,#4a2f5c,#161020)',
    },
  ],
  2: [
    {
      num: '1',
      title: 'May the Giant Be with You',
      blurb: 'Cooper, shot and on the floor, receives instructions.',
      length: '1h 34m',
      bg: 'linear-gradient(120deg,#2f4a5c,#121a20)',
    },
    {
      num: '2',
      title: 'Coma',
      blurb: 'Ronette wakes, and the drawing she makes narrows the field.',
      length: '47m',
      bg: 'linear-gradient(120deg,#5c2f3f,#1a1216)',
    },
    {
      num: '3',
      title: 'The Man Behind Glass',
      blurb: 'A diary page surfaces; the sheriff\'s department loses its footing.',
      length: '47m',
      bg: 'linear-gradient(120deg,#3f5c2f,#161a12)',
    },
    {
      num: '4',
      title: 'Laura\'s Secret Diary',
      blurb: 'Two people read the same pages and take away opposite conclusions.',
      length: '46m',
      bg: 'linear-gradient(120deg,#5c4a2f,#1a1612)',
    },
  ],
};

export const SEASONS = [1, 2];

//review: this is what we did here: episodes.js is a short list of made up episodes used
//when there is no real episode data, so a series detail page still has something to show.
//Each one carries the same fields a real TMDB episode has, a number, title, description and
//length, so the episode list draws them without knowing they are not real.
