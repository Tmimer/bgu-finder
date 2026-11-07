(function () {
  const $ = (id) => document.getElementById(id);
  const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const PAGE = 20;
  let db = null, shown = PAGE, sort = "nearest";

  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  function nowParts() {
    const n = new Date();
    return { day: n.getDay(), min: n.getHours() * 60 + n.getMinutes() };
  }
  function setNow() {
    const { day, min } = nowParts();
    const end = Math.min(min + 120, 23 * 60 + 59);
    $("day").value = String(day);
    $("start").value = Finder.fmt(min);
    $("end").value = Finder.fmt(end);
  }
  function durText(min) {
    if (min >= 600) return "כל היום";
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + " דק׳";
    if (!m) return h === 1 ? "שעה" : h === 2 ? "שעתיים" : h + " שעות";
    return h + ":" + String(m).padStart(2, "0") + " שעות";
  }
  function distText(d) {
    if (d == null) return "";
    if (d === 0) return "באותו בניין";
    return d < 1000 ? d + " מ׳" : (d / 1000).toFixed(1) + " ק״מ";
  }

  function render() {
    if (!db) return;
    const building = +$("building").value;
    const start = Finder.toMin($("start").value);
    let end = Finder.toMin($("end").value);
    const day = +$("day").value;
    const list = $("list"), summary = $("summary");
    list.textContent = "";
    if (isNaN(start) || isNaN(end)) { summary.textContent = "בחרו שעות"; $("more").hidden = true; return; }
    if (end <= start) end = start + 1;

    store.set("building", building);
    store.set("sort", sort);

    const rows = Finder.findRooms(db, { day, start, end, building, sort });
    summary.textContent = rows.length
      ? rows.length + " כיתות פנויות · ⁦" + Finder.fmt(start) + "–" + Finder.fmt(end) + "⁩"
      : "";
    if (!rows.length) {
      const e = document.createElement("div");
      e.className = "empty";
      e.textContent = "לא נמצאו כיתות פנויות בטווח הזה. נסו לקצר את הטווח.";
      list.appendChild(e);
      $("more").hidden = true;
      return;
    }
    const frag = document.createDocumentFragment();
    rows.slice(0, shown).forEach((r) => {
      const li = document.createElement("li");
      const left = document.createElement("div");
      const t = document.createElement("div");
      t.className = "room";
      t.innerHTML = "בניין <bdi></bdi> · חדר <bdi></bdi>";
      const b = t.querySelectorAll("bdi");
      b[0].textContent = r.building;
      b[1].textContent = r.room;
      const u = document.createElement("div");
      u.className = "until";
      u.textContent = r.next_start == null
        ? "פנויה עד סוף היום"
        : "פנויה עד " + Finder.fmt(r.freeUntil) + " (" + durText(r.freeFor) + ")";
      left.append(t, u);
      li.appendChild(left);
      const dt = distText(r.dist);
      if (dt) { const c = document.createElement("span"); c.className = "chip"; c.textContent = dt; li.appendChild(c); }
      frag.appendChild(li);
    });
    list.appendChild(frag);
    $("more").hidden = rows.length <= shown;
  }

  function rerun() { shown = PAGE; render(); }

  function setSort(s) {
    sort = s;
    $("s-nearest").setAttribute("aria-pressed", s === "nearest");
    $("s-longest").setAttribute("aria-pressed", s === "longest");
    rerun();
  }

  async function init() {
    $("today").textContent = "יום " + DAYS[new Date().getDay()];
    DAYS.forEach((d, i) => { const o = document.createElement("option"); o.value = i; o.textContent = d; $("day").appendChild(o); });
    setNow();

    const SQL = await initSqlJs({ locateFile: (f) => "vendor/" + f });
    const buf = await fetch("bgu_rooms.db").then((r) => r.arrayBuffer());
    db = new SQL.Database(new Uint8Array(buf));

    const bs = Finder.listBuildings(db);
    bs.forEach((b) => { const o = document.createElement("option"); o.value = b; o.textContent = b; $("building").appendChild(o); });
    const saved = +store.get("building", "");
    $("building").value = String(bs.includes(saved) ? saved : bs[0]);
    setSort(store.get("sort", "nearest") === "longest" ? "longest" : "nearest");

    ["building", "day", "start", "end"].forEach((id) => $(id).addEventListener("change", rerun));
    $("s-nearest").onclick = () => setSort("nearest");
    $("s-longest").onclick = () => setSort("longest");
    $("go").onclick = () => { setNow(); rerun(); window.scrollTo({ top: 0, behavior: "smooth" }); };
    $("more").onclick = () => { shown += PAGE; render(); };

    // refresh to "now" when the app comes back to the foreground
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { setNow(); rerun(); } });
  }

  init().catch((e) => { $("summary").textContent = "שגיאה בטעינת הנתונים"; console.error(e); });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
