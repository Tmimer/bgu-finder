// Core logic: which rooms are free for a time window. No DOM here, so Node can test it.
(function (root) {
  const DAY_END = 22 * 60; // assume rooms are usable until 22:00

  function toMin(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
    return m ? +m[1] * 60 + +m[2] : NaN;
  }
  function fmt(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }
  const M_PER_PX = 1; // building positions are already in metres
  function meters(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) * M_PER_PX;
  }

  const SQL_FREE = `
    SELECT r.building AS building, r.room AS room, b.x AS x, b.y AS y,
      (SELECT MIN(l.start) FROM lessons l
         WHERE l.room_id = r.room_id AND l.day = :day AND l.start >= :end) AS next_start
    FROM rooms r LEFT JOIN buildings b ON b.building = r.building
    WHERE NOT EXISTS (
      SELECT 1 FROM lessons l
      WHERE l.room_id = r.room_id AND l.day = :day AND l.start < :end AND l."end" > :start)`;

  function listBuildings(db) {
    const out = [];
    const st = db.prepare("SELECT building FROM rooms UNION SELECT building FROM buildings ORDER BY building");
    while (st.step()) out.push(st.getAsObject().building);
    st.free();
    return out;
  }

  // opts: { day 0-6 (0=Sunday), start, end (minutes), building, sort: 'nearest' | 'longest' }
  function findRooms(db, opts) {
    const { day, start, building, sort } = opts;
    const end = opts.end > start ? opts.end : start + 1;
    const st = db.prepare(SQL_FREE);
    st.bind({ ":day": day, ":start": start, ":end": end });
    const rows = [];
    while (st.step()) rows.push(st.getAsObject());
    st.free();

    let here = null;
    for (const r of rows) if (r.building === building && r.x != null) { here = r; break; }
    if (!here) {
      const s2 = db.prepare("SELECT x, y FROM buildings WHERE building = ?");
      s2.bind([building]);
      if (s2.step()) { const o = s2.getAsObject(); if (o.x != null) here = o; }
      s2.free();
    }

    for (const r of rows) {
      r.freeUntil = r.next_start != null ? r.next_start : Math.max(DAY_END, end);
      r.freeFor = r.freeUntil - start;
      if (r.building === building) r.dist = 0;
      else if (here && r.x != null) r.dist = Math.round(meters(here, r) / 10) * 10;
      else r.dist = null; // unknown
    }
    // unknown distance sorts after known ones, ordered by building-number gap as a weak hint
    const nearKey = (r) => r.dist != null ? r.dist : 1e7 + Math.abs(r.building - building);
    rows.sort((a, b) => {
      if (sort === "nearest") {
        return nearKey(a) - nearKey(b) || b.freeFor - a.freeFor || a.building - b.building;
      }
      return b.freeFor - a.freeFor || nearKey(a) - nearKey(b) || a.building - b.building;
    });
    return rows;
  }

  const api = { DAY_END, toMin, fmt, meters, findRooms, listBuildings };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Finder = api;
})(typeof self !== "undefined" ? self : this);
