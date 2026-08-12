export const SETTINGS_OPTIONS = {
  Playback: [
    {
      key: 'defaultQuality',
      label: 'Default Quality',
      help: 'Preferred video resolution when multiple streams are available.',
      options: ['4K', '1080p', '720p', 'Auto'],
      default: '4K',
    },
    {
      key: 'subtitles',
      label: 'Default Subtitles',
      help: 'Automatically enable subtitle tracks when available.',
      options: ['Off', 'English', 'Auto'],
      default: 'Off',
    },
    {
      key: 'hwAccel',
      label: 'Hardware Acceleration',
      help: 'Use GPU decoding for supported video codecs.',
      options: ['Enabled', 'Disabled'],
      default: 'Enabled',
    },
  ],
  Appearance: [
    {
      key: 'theme',
      label: 'App Theme',
      help: 'Visual color profile for the user interface.',
      options: ['Dark', 'OLED Black'],
      default: 'Dark',
    },
    {
      key: 'posterSize',
      label: 'Poster Card Size',
      help: 'Dimensions of poster cards across catalog rows and search grid.',
      options: ['Standard (178px)', 'Compact (140px)', 'Large (220px)'],
      default: 'Standard (178px)',
    },
  ],
  Storage: [
    {
      key: 'cacheLimit',
      label: 'Cache Size Limit',
      help: 'Maximum local disk space allocated for metadata and posters.',
      options: ['5 GB', '10 GB', '20 GB', 'Unlimited'],
      default: '10 GB',
    },
    {
      key: 'autoClean',
      label: 'Auto Clean Cache',
      help: 'Purge stale stream fragments and cached metadata automatically.',
      options: ['After 7 days', 'After 30 days', 'Never'],
      default: 'After 30 days',
    },
  ],
};

//review: this is what we did here: settings.js lists the options shown on the Playback,
//Appearance and Storage pages. Despite living in the mock folder this is not fake data, it
//is the real definition the settings screen reads. Each entry holds the label you see, the
//help line under it, the list of values the button cycles through, and which one to start
//on. Adding a new option here makes it appear on that page with no other change needed.
