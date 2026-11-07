BGU Empty Classroom Finder (PWA)
================================

Files
- bgu_rooms.db  <- CURRENTLY A FAKE TEST DATABASE. Replace it with the real one from the scraper.
- index.html, app.js, finder.js, manifest.webmanifest, sw.js, icons/, vendor/  (the app; no build step)

Each semester
1. Run the scraper, get a new bgu_rooms.db, replace the file here.
2. In sw.js change VERSION ("v1" -> "v2"), so phones download the new data.
3. Re-upload the folder to your host.

Hosting (a PWA must be served over HTTPS; opening index.html from the phone's files will NOT work)
Any free static host works: GitHub Pages, Netlify Drop (drag the folder), Cloudflare Pages.
The data is only the public class schedule, nothing personal.

Install on the S22 Ultra
Open the site in Chrome -> menu -> "Install app" / "Add to Home screen".
After the first load it works offline.

Building positions (for "closest" sorting)
Run building_positions.sql once on the real bgu_rooms.db (positions are pixel spots on the campus map, no GPS).
Buildings without a position are listed after the ones that have one.

Test locally
  python -m http.server 8000      (run inside this folder), then open http://localhost:8000
