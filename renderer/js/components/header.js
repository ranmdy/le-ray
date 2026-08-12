import { esc } from '../util.js';

const NAV = [
  { screen: 'home', label: 'Home' },
  { screen: 'search', label: 'Search' },
  { screen: 'library', label: 'My Library' },
  { screen: 'settings', label: 'Settings' },
];

export function header(state) {
  let links = '';

  for (const item of NAV) {
    let activeClass = '';
    if (state.screen === item.screen) {
      activeClass = ' header__link--active';
    }

    links += `<button class="header__link${activeClass}" data-action="go" data-screen="${item.screen}">${esc(item.label)}</button>`;
  }

  return `
    <header class="header">
      <div class="header__logo">LE&#8209;RAY</div>
      <nav class="header__nav">${links}</nav>
      <div class="header__right">
        <button class="header__icon" aria-label="Search"
                data-action="go" data-screen="search">&#8981;</button>
        <button class="header__avatar" aria-label="Settings"
                data-action="go" data-screen="settings">LR</button>
      </div>
    </header>`;
}

//review: this is what we did here: header.js draws the bar across the top of every screen
//except the player. It builds one button per entry in the NAV list, and the button for the
//screen you are currently on gets an extra class so it shows highlighted. Nothing here
//handles clicks. Each button just carries a data-action and data-screen label, and the one
//click handler in app.js reads those and switches screen. On the right are two shortcuts,
//a magnifier for search and the LR badge for settings.
