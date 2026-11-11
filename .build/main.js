/* =========================================================
   전기기능사 공부 — 모든 기록은 이 기기(localStorage)에만
   ========================================================= */
const KEY = "elec.v1";
const SUBJ = { T: "전기이론", M: "전기기기", I: "전기설비" };
const SUBJ_PART = { T: 0, M: 1, I: 2 };
const def = () => ({ q: {}, star: [], cards: {}, done: {}, day: { d: "", n: 0 }, set: { exam: "", goal: 20, rate: 1, voice: "" }, mocks: [], my: [] });
let S = def();
try { const raw = localStorage.getItem(KEY); if (raw) { S = Object.assign(def(), JSON.parse(raw)); S.set = Object.assign(def().set, S.set); } } catch {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast("저장 공간이 꽉 찼어요"); } }
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const WQ = window.WQ, WBY = Object.fromEntries(WQ.map(q => [q.id, q]));
function toast(t) { document.querySelector(".toast")?.remove(); const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2400); }
function modal(title, html, mount) {
  const w = document.createElement("div"); w.className = "modal";
  w.innerHTML = `<div class="sheet"><div class="sheet-head"><h3>${esc(title)}</h3><button class="x" aria-label="닫기">×</button></div><div class="sbody">${html}</div></div>`;
  const close = () => { w.remove(); w.onclose?.(); };
  w.addEventListener("click", e => { if (e.target === w || e.target.closest(".x")) close(); });
  document.body.appendChild(w); mount?.(w, close); return w;
}
let bookP = null;
const loadBook = () => bookP || (bookP = new Promise((ok, no) => { if (window.BOOK) return ok(window.BOOK); const s = document.createElement("script"); s.src = "book.js"; s.onload = () => ok(window.BOOK); s.onerror = () => { bookP = null; no(); }; document.head.appendChild(s); }));

/* ---------- 기록 ---------- */
function markW(id, right) { const r = S.q[id] || (S.q[id] = { r: 0, w: 0, last: 0, t: 0 }); right ? r.r++ : r.w++; r.last = right ? 1 : 0; r.t = Date.now(); if (S.day.d !== today()) S.day = { d: today(), n: 0 }; S.day.n++; save(); }
const wrongW = () => WQ.filter(q => S.q[q.id]?.last === 0).map(q => q.id);
const todayN = () => S.day.d === today() ? S.day.n : 0;
function statW(s) { let r = 0, n = 0, seen = 0, tot = 0; for (const q of WQ) if (q.s === s) { tot++; const x = S.q[q.id]; if (x) { seen++; r += x.r; n += x.r + x.w; } } return { pct: n ? Math.round(r / n * 100) : null, seen, tot }; }

/*__TTS__*/

/* ---------- 화면 틀 ---------- */
let tab = "home";
const TABS = [["home", "🏠", "홈"], ["quiz", "✏️", "문제"], ["cards", "🃏", "암기카드"], ["book", "📖", "교재"]];
function nav() { $("#nav").innerHTML = TABS.map(([k, e, l]) => `<button class="${tab === k ? "on" : ""}" data-t="${k}"><span>${e}</span>${l}</button>`).join(""); $("#nav").querySelectorAll("button").forEach(b => b.onclick = () => go(b.dataset.t)); }
function go(t, arg) {
  if (mock && t !== "mock") { if (!confirm("모의고사를 그만둘까요? 지금까지 푼 것은 저장되지 않아요.")) return; mock = null; }
  clearInterval(mockTimer); TTS.stop(true); tab = t; nav();
  ({ home: viewHome, quiz: viewQuizMenu, cards: viewCards, book: viewBook, part: viewPart, section: viewSection, session: viewSession, mock: viewMock, result: viewResult })[t](arg);
  scrollTo(0, 0);
}
const head = (title, sub, back) => `<header>${back ? `<button class="back" data-back="${back}">‹ 뒤로</button>` : ""}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}<button class="gear" data-set aria-label="설정">⚙</button></header>`;
function wireHead(backArg) {
  $("#view").querySelector("[data-set]")?.addEventListener("click", openSettings);
  $("#view").querySelector("[data-back]")?.addEventListener("click", e => go(e.currentTarget.dataset.back, backArg));
}
const dday = d => d ? Math.ceil((new Date(d + "T00:00:00") - new Date(today() + "T00:00:00")) / 864e5) : null;
function nextSection(B) { for (let p = 0; p < B.length; p++) for (let i = 0; i < B[p].s.length; i++) if (!S.done[`${p}-${i}`]) return { p, i, P: B[p], s: B[p].s[i] }; return null; }
function roadPct(B) { let d = 0, n = 0; B.forEach((P, p) => P.s.forEach((_, i) => { n++; if (S.done[`${p}-${i}`]) d++; })); return n ? Math.round(d / n * 100) : 0; }
/** 교재 절 이름의 낱말이 문제에 나오면 그 절의 문제로 본다 */
function qsForSection(p, i, B) {
  const s = Object.keys(SUBJ_PART).find(k => SUBJ_PART[k] === p), all = WQ.filter(q => q.s === s);
  if (i == null || !B) return all.map(q => q.id);
  const words = B[p].s[i].t.replace(/[()·,]/g, " ").split(/\s+/).filter(w => w.length >= 2 && !/^(그|의|와|과|및|기출|유형별|풀이|전략|핵심|총정리|일반|기초|여러|가지|특성|원리|구조)$/.test(w)).map(w => w.replace(/(의|과|와)$/, ""));
  const hit = all.filter(q => words.some(w => (q.q + q.o.join(" ")).includes(w)));
  return (hit.length >= 5 ? hit : all).map(q => q.id);
}

/* ---------- 🏠 홈 ---------- */
function viewHome() {
  const goal = S.set.goal || 20, n = todayN(), dd = dday(S.set.exam), w = wrongW().length;
  const stats = Object.keys(SUBJ).map(k => ({ k, l: SUBJ[k], ...statW(k) }));
  const weak = stats.filter(x => x.pct != null).sort((a, b) => a.pct - b.pct)[0];
  $("#view").innerHTML = head("⚡ 전기기능사", "필기 · 한국전기설비규정(KEC) 기준") + `
  <section class="card guide" id="guide"><div class="t">🔰 오늘의 공부 길잡이 <span id="gPct"></span></div><div class="sm">교재를 불러오는 중…</div></section>
  <section class="card" style="text-align:center">
    <div class="sm">${dd == null ? "⚙에서 시험일을 넣으면 남은 날을 알려 줘요" : dd > 0 ? "시험까지" : dd === 0 ? "오늘이 시험날이에요! 💪" : "시험일이 지났어요"}</div>
    ${dd != null && dd > 0 ? `<div class="big" style="font-size:2.2rem;margin:4px 0">D-${dd}</div>` : ""}
    <div class="sm" style="margin-top:4px">오늘 목표 ${goal}문제 중 <b style="color:var(--ink)">${n}개</b> 풀었어요${n >= goal ? " 🎉" : ""}</div>
    <div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, n / goal * 100)}%;background:var(--acc)"></i></div>
  </section>
  <button class="btn b-acc" id="hToday">🎯 오늘의 문제 풀기<small>틀린 것·안 푼 것 먼저</small></button>
  <div class="g2"><button class="btn b-blue" id="hMock">📝 모의고사 10회<small>60문항 · 60분</small></button>
  <button class="btn b-orange" id="hWrong" ${w ? "" : "disabled"}>❌ 오답 노트<small>${w}문제</small></button></div>
  <button class="btn b-purple" id="hListen">🎧 듣기 공부<small>기출 포인트 · 문제 · 암기카드</small></button>
  <section class="card"><div class="t">📊 과목별 정답률 <span>합격선 60%</span></div>
    ${stats.map(x => `<div class="subj"><b>${x.l}</b><div class="bar"><i style="width:${x.pct ?? 0}%;background:${x.pct == null ? "#e5e7eb" : x.pct >= 60 ? "var(--green)" : "var(--orange)"}"></i></div><span class="pct">${x.pct == null ? "–" : x.pct + "%"}</span></div>
    <div class="sm" style="margin:2px 0 6px">${x.seen}/${x.tot}문제 풂${weak && weak.k === x.k && x.pct < 60 ? ` → <b style="color:#c2410c">여기부터!</b>` : ""}</div>`).join("")}
  </section>
  ${S.mocks.length ? `<section class="card"><div class="t">📝 최근 모의고사</div>${S.mocks.slice(-3).reverse().map(m => `<div class="row"><span class="main">${m.r ? m.r + "회" : "섞어서"} <span class="sm">${m.d.slice(5).replace("-", "/")} · ${m.min}분</span></span><b style="color:${m.score >= 60 ? "#15803d" : "#c2410c"}">${m.score}점 ${m.score >= 60 ? "합격" : "불합격"}</b></div>`).join("")}</section>` : ""}
  <p class="sm" style="text-align:center;line-height:1.6">「전기기능사 필기시험 이론편·문제집」 내용으로 만들었어요.<br>시험 직전에는 큐넷(q-net.or.kr) 공지를 꼭 확인하세요.</p>`;
  wireHead();
  $("#hToday").onclick = () => startW(todayW(), "🎯 오늘의 문제");
  $("#hMock").onclick = () => pickRound();
  $("#hWrong").onclick = () => startW(shuffle(wrongW()), "❌ 오답 노트");
  $("#hListen").onclick = openListen;
  loadBook().then(B => {
    const g = $("#guide"); if (!g || tab !== "home") return;
    const nx = nextSection(B), pct = roadPct(B);
    $("#gPct").textContent = `진도 ${pct}%`;
    if (!nx) { g.querySelector(".sm").outerHTML = `<p>🎉 교재를 다 읽었어요! 이제 모의고사로 실전 연습을 해 보세요.</p>`; return; }
    g.querySelector(".sm").outerHTML = `
      <div class="step"><span class="no">1</span><span class="main">📖 <b>${esc(nx.P.t)}</b><br>제${nx.s.n}절 ${esc(nx.s.t)}</span><button id="g1">읽기</button></div>
      <div class="step"><span class="no">2</span><span class="main">✏️ 이 절과 관련된 문제 풀기</span><button id="g2">풀기</button></div>
      <div class="step"><span class="no">3</span><span class="main">❌ 틀린 문제 다시 보기</span><button id="g3">보기</button></div>
      <div class="bar" style="margin-top:8px"><i style="width:${pct}%;background:var(--acc)"></i></div>`;
    $("#g1").onclick = () => go("section", { p: nx.p, i: nx.i });
    $("#g2").onclick = () => startW(shuffle(qsForSection(nx.p, nx.i, B)).slice(0, 10), "✏️ 이 절 문제");
    $("#g3").onclick = () => { const l = wrongW(); if (!l.length) return toast("아직 틀린 문제가 없어요 👍"); startW(shuffle(l), "❌ 오답 노트"); };
  }).catch(() => { const g = $("#guide .sm"); if (g) g.textContent = "인터넷에 연결되면 교재를 불러와요"; });
}
function todayW() {
  const need = Math.max(10, (S.set.goal || 20) - todayN());
  const wr = shuffle(wrongW()), un = shuffle(WQ.filter(q => !S.q[q.id]).map(q => q.id));
  const old = WQ.filter(q => S.q[q.id]?.last === 1).sort((a, b) => S.q[a.id].t - S.q[b.id].t).map(q => q.id);
  return [...new Set([...wr.slice(0, Math.ceil(need / 2)), ...un, ...old])].slice(0, need);
}

/* ---------- ✏️ 문제 고르기 ---------- */
let sel = { s: "all", r: 0, mode: "mix" };
function viewQuizMenu() {
  const pool = poolOf();
  $("#view").innerHTML = head("✏️ 문제 풀기", `모두 ${WQ.length}문제 (10회 × 60문항)`) + `
  <section class="card"><div class="t">과목</div>
    <div class="chips" id="cs">${[["all", "전체"], ...Object.entries(SUBJ)].map(([k, l]) => `<button class="chip ${sel.s === k ? "on" : ""}" data-k="${k}">${l}</button>`).join("")}</div>
    <div class="t mt">모의고사 회차</div>
    <div class="chips" id="cr">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => `<button class="chip ${sel.r === r ? "on" : ""}" data-r="${r}">${r ? r + "회" : "모든 회차"}</button>`).join("")}</div>
    <div class="t mt">어떤 문제?</div>
    <div class="chips" id="cm">${[["mix", "섞어서"], ["new", "안 푼 문제"], ["wrong", "틀린 문제"], ["star", "⭐ 별표"], ["calc", "🧮 계산 문제"], ["order", "순서대로"]].map(([k, l]) => `<button class="chip ${sel.mode === k ? "on" : ""}" data-m="${k}">${l}</button>`).join("")}</div>
  </section>
  <button class="btn b-acc" id="qGo" ${pool.length ? "" : "disabled"}>시작하기<small>${pool.length ? `${Math.min(pool.length, 20)}문제 (해당 ${pool.length}문제)` : "해당하는 문제가 없어요"}</small></button>
  <button class="btn b-blue" id="qMock">📝 실전 모의고사 (60문항 · 60분)</button>`;
  wireHead();
  $("#cs").querySelectorAll("button").forEach(b => b.onclick = () => { sel.s = b.dataset.k; viewQuizMenu(); });
  $("#cr").querySelectorAll("button").forEach(b => b.onclick = () => { sel.r = +b.dataset.r; viewQuizMenu(); });
  $("#cm").querySelectorAll("button").forEach(b => b.onclick = () => { sel.mode = b.dataset.m; viewQuizMenu(); });
  $("#qGo").onclick = () => startW(pool.slice(0, 20), sel.s === "all" ? "✏️ 문제 풀기" : `✏️ ${SUBJ[sel.s]}`);
  $("#qMock").onclick = () => pickRound();
}
const isCalc = q => /몇 \[|얼마|구하|계산/.test(q.q) && q.o.every(o => /\d/.test(o));
function poolOf() {
  let l = WQ.filter(q => (sel.s === "all" || q.s === sel.s) && (!sel.r || q.r === sel.r));
  if (sel.mode === "new") l = l.filter(q => !S.q[q.id]);
  if (sel.mode === "wrong") l = l.filter(q => S.q[q.id]?.last === 0);
  if (sel.mode === "star") l = l.filter(q => S.star.includes(q.id));
  if (sel.mode === "calc") l = l.filter(isCalc);
  return (sel.mode === "order" ? l : shuffle(l)).map(q => q.id);
}

/* ---------- 문제 풀기 ---------- */
let sess = null;
const startW = (ids, title) => { if (!ids.length) return toast("풀 문제가 없어요"); sess = { ids, title, i: 0, res: [], pick: {}, from: ["home", "quiz", "book"].includes(tab) ? tab : "home" }; go("session"); };
function viewSession() {
  const id = sess.ids[sess.i], q = WBY[id], done = sess.res[sess.i], pk = sess.pick[sess.i], star = S.star.includes(id);
  $("#view").innerHTML = head(sess.title, `${SUBJ[q.s]} · 모의고사 ${q.r}회 ${q.n}번`, sess.from) + `
  <section class="card"><div class="t">문제 ${sess.i + 1} / ${sess.ids.length} <span><button class="icon ${star ? "on" : ""}" id="sStar" aria-label="별표">${star ? "⭐" : "☆"}</button> <button class="icon" id="sSay" aria-label="읽어주기">🔊</button></span></div>
    <div class="prog">${sess.ids.slice(0, 40).map((_, i) => `<i class="${sess.res[i] === true ? "r" : sess.res[i] === false ? "w" : i === sess.i ? "c" : ""}"></i>`).join("")}</div>
    <p class="qtext">${esc(q.q)}</p>
    ${q.o.map((o, i) => `<button class="opt ${done == null ? "" : i === q.a ? "ok" : pk === i ? "no" : ""}" data-i="${i}" ${done == null ? "" : "disabled"}><b>${i + 1}</b><span>${esc(o)}</span></button>`).join("")}
    ${done == null ? "" : `<div class="exp ${done ? "" : "bad"}">${done ? "✅ 맞았어요!" : "❌ 아쉬워요."} <b>정답 ${q.a + 1}번 ${esc(q.o[q.a])}</b><br>${esc(q.e)}<br><span class="sm">📖 이론편 제${SUBJ_PART[q.s] + 1}과목 ${esc(SUBJ[q.s])}</span></div>
    <div class="g2 mt"><button class="btn b-gray" id="sBook">📖 교재 보기</button><button class="btn b-acc" id="sNext">${sess.i + 1 < sess.ids.length ? "다음 ›" : "결과 보기"}</button></div>`}
  </section>`;
  wireHead();
  $("#view").querySelectorAll(".opt").forEach(b => b.onclick = () => { const i = +b.dataset.i, right = i === q.a; sess.res[sess.i] = right; sess.pick[sess.i] = i; markW(id, right); TTS.stop(true); viewSession(); navigator.vibrate?.(right ? 20 : [30, 60, 30]); });
  $("#sSay").onclick = () => TTS.play([{ text: q.q, label: "문제" }, ...q.o.map((o, i) => ({ text: `${i + 1}번, ${o}`, label: `${i + 1}번` })), ...(done != null ? [{ text: `정답은 ${q.a + 1}번. ${q.e}`, label: "해설" }] : [])]);
  $("#sStar").onclick = () => { S.star = star ? S.star.filter(x => x !== id) : [...S.star, id]; save(); viewSession(); };
  $("#sBook") && ($("#sBook").onclick = () => go("part", { p: SUBJ_PART[q.s], from: "session" }));
  $("#sNext") && ($("#sNext").onclick = () => { if (sess.i + 1 < sess.ids.length) { sess.i++; TTS.stop(true); viewSession(); scrollTo(0, 0); } else sessionDone(); });
}
function sessionDone() {
  const r = sess.res.filter(x => x === true).length, n = sess.res.filter(x => x != null).length, wrong = sess.ids.filter((id, i) => sess.res[i] === false), pct = n ? Math.round(r / n * 100) : 0;
  $("#view").innerHTML = head("다 풀었어요 👏", sess.title) + `
  <section class="card" style="text-align:center"><div class="sm">맞힌 문제</div><div class="big">${r} / ${n}</div>
  <div class="pass" style="background:${pct >= 60 ? "var(--green)" : "var(--orange)"}">${pct}%</div><p class="sm">오늘 ${todayN()}문제 풀었어요 (목표 ${S.set.goal || 20})</p></section>
  ${wrong.length ? `<button class="btn b-orange" id="dWrong">❌ 틀린 ${wrong.length}문제 다시 풀기</button>` : ""}
  <button class="btn b-acc" id="dMore">🎯 다음 문제 더 풀기</button><button class="btn b-gray" id="dHome">🏠 홈으로</button>`;
  wireHead();
  $("#dWrong")?.addEventListener("click", () => startW(shuffle(wrong), "❌ 틀린 문제 다시"));
  $("#dMore").onclick = () => startW(todayW(), "🎯 오늘의 문제");
  $("#dHome").onclick = () => go("home");
}

/* ---------- 📝 모의고사 ---------- */
let mock = null, mockTimer = 0, lastResult = null;
function pickRound() {
  modal("📝 모의고사", `<p class="sm" style="margin-top:0">3과목 20문제씩 60문항 · 60분 · 36문항 이상 맞으면 합격</p>
    <div class="g5">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => { const best = S.mocks.filter(m => m.r === r).map(m => m.score); return `<button class="btn b-blue" data-r="${r}" style="padding:12px 4px">${r}회<small>${best.length ? "최고 " + Math.max(...best) : "안 풂"}</small></button>`; }).join("")}</div>
    <button class="btn b-gray mt" data-r="0">🔀 열 회차에서 섞어서</button>`, (m, close) => {
    m.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { close(); startMock(+b.dataset.r); });
  });
}
function startMock(r) {
  const ids = r ? WQ.filter(q => q.r === r).sort((a, b) => a.n - b.n).map(q => q.id) : ["T", "M", "I"].flatMap(s => shuffle(WQ.filter(q => q.s === s)).slice(0, 20).map(q => q.id));
  mock = { r, ids, ans: {}, i: 0, end: Date.now() + 60 * 60e3, start: Date.now() };
  go("mock");
}
function viewMock() {
  if (!mock) return go("home");
  const id = mock.ids[mock.i], q = WBY[id], a = mock.ans[id], N = mock.ids.length;
  $("#view").innerHTML = `<header><h1>📝 모의고사 ${mock.r ? mock.r + "회" : ""}</h1><p>${SUBJ[q.s]} · <span class="timer" id="mt"></span> 남음</p></header>
  <section class="card"><div class="t">${mock.i + 1}번 / ${N} <span>${Object.keys(mock.ans).length}문제 답함</span></div>
    <p class="qtext">${esc(q.q)}</p>${q.o.map((o, i) => `<button class="opt ${a === i ? "pick" : ""}" data-i="${i}"><b>${i + 1}</b><span>${esc(o)}</span></button>`).join("")}
    <div class="g2 mt"><button class="btn b-gray" id="mPrev" ${mock.i ? "" : "disabled"}>‹ 이전</button><button class="btn b-acc" id="mNext">${mock.i < N - 1 ? "다음 ›" : "답안 제출"}</button></div></section>
  <section class="card"><div class="t">답안 표 <span>번호를 누르면 이동해요</span></div>
    <div class="grid">${mock.ids.map((x, i) => `<button class="${mock.ans[x] != null ? "d" : ""} ${i === mock.i ? "cur" : ""}" data-g="${i}">${i + 1}</button>`).join("")}</div>
    <button class="btn b-blue mt" id="mSubmit">📤 답안 제출하고 채점</button><button class="btn b-red mt" id="mQuit">그만두기</button></section>`;
  const tick = () => { const l = mock ? mock.end - Date.now() : 0, el = $("#mt"); if (el) el.textContent = `${Math.floor(Math.max(0, l) / 60e3)}:${String(Math.floor(Math.max(0, l) / 1e3) % 60).padStart(2, "0")}`; if (mock && l <= 0) { clearInterval(mockTimer); toast("시간이 끝났어요. 채점할게요"); submitMock(true); } };
  tick(); clearInterval(mockTimer); mockTimer = setInterval(tick, 1000);
  $("#view").querySelectorAll(".opt").forEach(b => b.onclick = () => { mock.ans[id] = +b.dataset.i; if (mock.i < N - 1) mock.i++; viewMock(); scrollTo(0, 0); });
  $("#mPrev").onclick = () => { mock.i--; viewMock(); scrollTo(0, 0); };
  $("#mNext").onclick = () => { if (mock.i < N - 1) { mock.i++; viewMock(); scrollTo(0, 0); } else submitMock(); };
  $("#view").querySelectorAll("[data-g]").forEach(b => b.onclick = () => { mock.i = +b.dataset.g; viewMock(); scrollTo(0, 0); });
  $("#mSubmit").onclick = () => submitMock();
  $("#mQuit").onclick = () => { if (confirm("모의고사를 그만둘까요?")) { mock = null; clearInterval(mockTimer); go("home"); } };
}
function submitMock(force) {
  const N = mock.ids.length, blank = N - Object.keys(mock.ans).length;
  if (!force && !confirm(blank ? `아직 ${blank}문제를 안 풀었어요. 제출할까요?` : "답안을 제출할까요?")) return;
  clearInterval(mockTimer);
  const by = { T: 0, M: 0, I: 0 }, wrong = [];
  for (const id of mock.ids) { const q = WBY[id], right = mock.ans[id] === q.a; if (right) by[q.s]++; else wrong.push(id); if (mock.ans[id] != null) markW(id, right); }
  const correct = by.T + by.M + by.I, score = Math.round(correct / N * 100), min = Math.max(1, Math.round((Date.now() - mock.start) / 60e3));
  S.mocks.push({ r: mock.r, d: today(), score, min }); S.mocks = S.mocks.slice(-40); save();
  lastResult = { correct, score, by, wrong, min, r: mock.r }; mock = null; go("result");
}
function viewResult() {
  const r = lastResult; if (!r) return go("home");
  $("#view").innerHTML = head("📝 모의고사 결과", r.r ? `${r.r}회` : "섞어서") + `
  <section class="card" style="text-align:center"><div class="sm">내 점수 (100점 만점)</div><div class="big">${r.score}점</div>
  <div class="pass" style="background:${r.correct >= 36 ? "var(--green)" : "var(--orange)"}">${r.correct >= 36 ? "합격선 넘었어요 🎉" : "조금만 더! 💪"}</div>
  <div class="sm" style="margin-top:8px">${r.correct}문항 맞음 · 36문항 이상이면 합격 · 걸린 시간 ${r.min}분</div></section>
  <section class="card"><div class="t">과목별</div>${Object.keys(SUBJ).map(s => `<div class="subj"><b>${SUBJ[s]}</b><div class="bar"><i style="width:${r.by[s] * 5}%;background:${r.by[s] >= 12 ? "var(--green)" : "var(--orange)"}"></i></div><span class="pct">${r.by[s]}/20</span></div>`).join("")}</section>
  ${r.wrong.length ? `<button class="btn b-orange" id="rWrong">❌ 틀린 ${r.wrong.length}문제 해설 보며 다시 풀기</button>` : ""}
  <button class="btn b-gray" id="rHome">🏠 홈으로</button>`;
  wireHead();
  $("#rWrong")?.addEventListener("click", () => startW(r.wrong, "❌ 모의고사 오답"));
  $("#rHome").onclick = () => go("home");
}

/*__CARDS__*/

/* ---------- 📖 교재 ---------- */
const nPts = s => s.b.filter(b => b.k === "기출 포인트").length;
function viewBook() {
  $("#view").innerHTML = head("📖 교재", "전기기능사 필기 이론편 · 3과목 59절") + `<section class="card"><p class="sm">불러오는 중…</p></section>`;
  wireHead();
  loadBook().then(B => {
    if (tab !== "book") return;
    $("#view").querySelector(".card").outerHTML = B.map((P, p) => { const d = P.s.filter((_, i) => S.done[`${p}-${i}`]).length;
      return `<button class="card sec" data-p="${p}" style="border:0"><span class="n ${d === P.s.length ? "done" : ""}">${d === P.s.length ? "✓" : `${d}/${P.s.length}`}</span><b>제${p + 1}과목 ${esc(P.t)}<br><span class="sm">${P.s.length}개 절 · 예제 ${P.s.reduce((a, s) => a + s.b.filter(b => b.k === "예제").length, 0)}개 · 기출 포인트 ${P.s.reduce((a, s) => a + nPts(s), 0)}개</span></b><span class="sm">›</span></button>`; }).join("");
    $("#view").querySelectorAll("[data-p]").forEach(b => b.onclick = () => go("part", { p: +b.dataset.p }));
  }).catch(() => toast("교재를 불러오지 못했어요. 인터넷을 확인해 주세요"));
}
function viewPart(arg) {
  loadBook().then(B => {
    const P = B[arg.p];
    $("#view").innerHTML = head(`제${arg.p + 1}과목`, esc(P.t), arg.from === "session" ? "session" : "book") + `
    <section class="card">${P.s.map((s, i) => `<button class="sec" data-i="${i}"><span class="n ${S.done[`${arg.p}-${i}`] ? "done" : ""}">${S.done[`${arg.p}-${i}`] ? "✓" : s.n}</span><b>제${s.n}절 ${esc(s.t)}</b><span class="sm">›</span></button>`).join("")}</section>
    <button class="btn b-acc" id="pQuiz">✏️ ${esc(P.t)} 문제 풀기 (200문제 중 20)</button>`;
    wireHead();
    $("#view").querySelectorAll("[data-i]").forEach(b => b.onclick = () => go("section", { p: arg.p, i: +b.dataset.i }));
    $("#pQuiz").onclick = () => startW(shuffle(qsForSection(arg.p)).slice(0, 20), `✏️ ${P.t}`);
  });
}
let secOnly = false;
function viewSection(arg) {
  loadBook().then(B => {
    const P = B[arg.p], s = P.s[arg.i], key = `${arg.p}-${arg.i}`;
    const blocks = s.b.filter(b => !secOnly || b.k === "기출 포인트");
    const html = blocks.map((b, i) => {
      if (b.t === "h2") return `<h2 data-r="${i}">${esc(b.x)}</h2>`;
      if (b.t === "h3") return `<h3 data-r="${i}">${esc(b.x)}</h3>`;
      if (b.t === "h4") return `<h4 data-r="${i}">${esc(b.x)}</h4>`;
      if (b.t === "li") return `<div class="li" data-r="${i}">${esc(b.x)}</div>`;
      if (b.t === "p") return `<p data-r="${i}">${esc(b.x)}</p>`;
      if (b.t === "f") return `<div class="fx" data-r="${i}">${esc(b.x)}</div>`;
      if (b.t === "box") return `<div class="bx ${b.k.split(" ")[0]}" data-r="${i}"><span class="k">${esc(b.k)}</span>${esc(b.x)}</div>`;
      if (b.t === "table") return `<div class="tw" data-r="${i}"><table><tr>${b.rows[0].map(c => `<th>${esc(c)}</th>`).join("")}</tr>${b.rows.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
      if (b.t === "fig") return `<figure data-r="${i}"><img src="${b.src}" alt="${esc(b.x)}" loading="lazy"></figure>`;
      return "";
    }).join("");
    const done = !!S.done[key];
    $("#view").innerHTML = head(`제${s.n}절`, esc(s.t), "part") + `
    <div class="g2"><button class="btn b-purple" id="sListen">🔊 이 절 듣기</button><button class="btn ${secOnly ? "b-acc" : "b-gray"}" id="sOnly">${secOnly ? "✓ 기출 포인트만" : "🎯 기출 포인트만"}</button></div>
    <p class="sm" style="text-align:center;margin:0">글을 누르면 그 줄부터 읽어 줘요</p>
    <section class="card book">${html || `<p class="sm">기출 포인트가 없는 절이에요.</p>`}</section>
    <button class="btn ${done ? "b-green" : "b-acc"}" id="sDone">${done ? "✅ 다 읽은 절이에요" : "✅ 다 읽었어요"}<small>${done ? "누르면 표시를 지워요" : "길잡이가 다음 절로 넘어가요"}</small></button>
    <button class="btn b-blue" id="sQuiz">✏️ 이 절과 관련된 문제 풀기</button>
    <div class="g2">${arg.i > 0 ? `<button class="btn b-gray" id="sPrev">‹ 이전 절</button>` : "<span></span>"}${arg.i < P.s.length - 1 ? `<button class="btn b-gray" id="sNextSec">다음 절 ›</button>` : ""}</div>`;
    wireHead({ p: arg.p });
    const items = from => blocks.map((b, i) => ({ b, i })).slice(from).filter(({ b }) => b.t !== "fig").map(({ b, i }) => ({
      text: b.t === "table" ? "표는 화면을 봐 주세요." : b.t === "box" ? `${b.k}. ${b.x}` : b.x, el: $(`#view [data-r="${i}"]`),
      label: b.t === "table" ? "📋 표 (화면 보기)" : (b.x || "").slice(0, 36), pause: b.t === "table" ? 1200 : b.k === "예제" ? 1500 : b.t.startsWith("h") ? 450 : 300 }));
    $("#sListen").onclick = () => TTS.play(items(0));
    $("#view").querySelectorAll(".book [data-r]").forEach(el => el.onclick = () => TTS.play(items(+el.dataset.r)));
    $("#sOnly").onclick = () => { secOnly = !secOnly; viewSection(arg); };
    $("#sDone").onclick = () => { if (done) delete S.done[key]; else S.done[key] = today(); save();
      if (!done) { toast("잘했어요! 👏"); if (arg.i < P.s.length - 1) return go("section", { p: arg.p, i: arg.i + 1 }); } viewSection(arg); };
    $("#sQuiz").onclick = () => startW(shuffle(qsForSection(arg.p, arg.i, B)).slice(0, 10), `✏️ ${s.n}절 관련 문제`);
    $("#sPrev")?.addEventListener("click", () => go("section", { p: arg.p, i: arg.i - 1 }));
    $("#sNextSec")?.addEventListener("click", () => go("section", { p: arg.p, i: arg.i + 1 }));
    $("#view").querySelector("[data-back]").onclick = () => go("part", { p: arg.p });
  });
}

/* ---------- 🎧 듣기 공부 ---------- */
function openListen() {
  let mode = "point", pp = 0, subj = "all", dk = "all", n = 10;
  const decks = [...new Set(allCards().map(c => c.d))];
  const w = modal("🎧 듣기 공부", `<div id="lb"><p class="sm">불러오는 중…</p></div>`, m => {
    loadBook().then(B => {
      const draw = () => {
        m.querySelector("#lb").innerHTML = `
        <div class="chips">${[["point", "🎯 기출 포인트"], ["quiz", "✏️ 문제 듣기"], ["card", "🃏 암기카드"]].map(([k, l]) => `<button class="chip ${mode === k ? "on" : ""}" data-m="${k}">${l}</button>`).join("")}</div>
        <p class="sm">${mode === "point" ? "교재의 기출 포인트를 차례로 읽어 줘요." : mode === "quiz" ? "문제와 보기를 읽고 <b>5초</b> 쉰 뒤(속으로 답 생각하기) 정답과 해설을 읽어 줘요." : "카드 앞면을 읽고 3초 쉰 뒤 답을 읽어 줘요."}</p>
        ${mode === "point" ? `<div class="chips">${B.map((P, i) => `<button class="chip ${pp === i ? "on" : ""}" data-p="${i}">${esc(P.t)} (${P.s.reduce((a, s) => a + nPts(s), 0)})</button>`).join("")}</div>` : ""}
        ${mode === "quiz" ? `<div class="chips">${[["all", "전체"], ...Object.entries(SUBJ), ["wrong", "틀린 문제"]].map(([k, l]) => `<button class="chip ${subj === k ? "on" : ""}" data-s="${k}">${l}</button>`).join("")}</div>
          <div class="chips mt">${[10, 20, 30].map(k => `<button class="chip ${n === k ? "on" : ""}" data-n="${k}">${k}문제</button>`).join("")}</div>` : ""}
        ${mode === "card" ? `<div class="chips">${[["all", "전체"], ...decks.map(d => [d, d])].map(([k, l]) => `<button class="chip ${dk === k ? "on" : ""}" data-k="${esc(k)}">${esc(l)}</button>`).join("")}</div>` : ""}
        <label class="lab">읽는 속도</label>
        <div class="chips">${[[0.8, "느리게"], [1, "보통"], [1.1, "조금 빠르게"], [1.2, "빠르게"]].map(([k, l]) => `<button class="chip ${S.set.rate === k ? "on" : ""}" data-r="${k}">${l}</button>`).join("")}</div>
        <div class="now" id="now">▶ 시작을 누르세요</div>
        <div class="g2 mt"><button class="btn b-purple" id="lPlay">▶ 시작</button><button class="btn b-gray" id="lStop">⏹ 멈춤</button></div>
        <p class="sm" style="line-height:1.6">📱 아이폰은 화면이 꺼지면 읽기가 멈춰요. 듣는 동안 화면을 켜 두세요.</p>`;
        m.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
        m.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { pp = +b.dataset.p; draw(); });
        m.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { subj = b.dataset.s; draw(); });
        m.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { n = +b.dataset.n; draw(); });
        m.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { dk = b.dataset.k; draw(); });
        m.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { S.set.rate = +b.dataset.r; save(); draw(); });
        const show = t => () => { const el = m.querySelector("#now"); if (el) el.innerHTML = t; };
        m.querySelector("#lStop").onclick = () => TTS.stop();
        m.querySelector("#lPlay").onclick = () => {
          let items = [];
          if (mode === "point") {
            const pts = B[pp].s.flatMap(s => s.b.filter(b => b.k === "기출 포인트").map(b => ({ s, b })));
            items = pts.map(({ s, b }, i) => ({ text: (i === 0 || pts[i - 1].s !== s ? `제${s.n}절, ${s.t}. ` : "") + b.x, label: `🎯 ${i + 1}/${pts.length}`, pause: 700, onShow: show(`<span class="sm">🎯 제${s.n}절 ${esc(s.t)} · ${i + 1}/${pts.length}</span><br>${esc(b.x)}`) }));
          } else if (mode === "quiz") {
            const base = subj === "wrong" ? wrongW().map(id => WBY[id]) : WQ.filter(q => subj === "all" || q.s === subj);
            const qs = shuffle(base); if (!qs.length) return toast("들을 문제가 없어요");
            qs.slice(0, n).forEach((q, k) => { const tot = Math.min(n, qs.length);
              items.push({ text: `${k + 1}번 문제. ${q.q}`, label: `✏️ ${k + 1}번`, pause: 200, onShow: show(`<span class="sm">✏️ ${k + 1}/${tot} · ${SUBJ[q.s]}</span><br><b>${esc(q.q)}</b><br>${q.o.map((x, j) => `${j + 1}. ${esc(x)}`).join("<br>")}`) });
              q.o.forEach((x, j) => items.push({ text: `${j + 1}번, ${x}`, label: `✏️ ${k + 1}번`, pause: j === 3 ? 5000 : 250 }));
              items.push({ text: `정답은 ${q.a + 1}번. ${q.e}`, label: `✅ 정답 ${q.a + 1}번`, pause: 1200, onShow: show(`<span class="sm">✅ 정답</span><br><b>${q.a + 1}번 ${esc(q.o[q.a])}</b><br>${esc(q.e)}`) });
            });
          } else {
            const cs = shuffle(allCards().filter(c => dk === "all" || c.d === dk));
            cs.forEach((c, k) => { items.push({ text: c.f, label: `🃏 ${k + 1}/${cs.length}`, pause: 3000, onShow: show(`<span class="sm">🃏 ${esc(c.d)} · ${k + 1}/${cs.length}</span><br><b>${esc(c.f)}</b>`) });
              items.push({ text: c.b.join(". "), label: "🃏 답", pause: 1200, onShow: show(`<b>${esc(c.f)}</b><br>${c.b.map(esc).join("<br>")}`) }); });
          }
          TTS.play(items, show("⏹ 멈췄어요. ▶ 시작을 누르면 처음부터 다시 읽어요."));
        };
      };
      draw();
    }).catch(() => { m.querySelector("#lb").innerHTML = `<p class="sm">교재를 불러오지 못했어요. 인터넷을 확인해 주세요.</p>`; });
  });
  w.onclose = () => TTS.stop(true);
}

/* ---------- ⚙ 설정 ---------- */
function openSettings() {
  const vs = TTS.ok ? speechSynthesis.getVoices().filter(v => /^ko/i.test(v.lang)) : [];
  modal("⚙ 설정", `
    <label class="lab" style="margin-top:0">📅 시험일</label><div style="overflow:hidden;border-radius:12px"><input class="inp" type="date" id="sExam" value="${esc(S.set.exam)}"></div>
    <label class="lab">🎯 하루 목표</label>
    <div class="chips">${[10, 20, 30, 50].map(k => `<button class="chip ${S.set.goal === k ? "on" : ""}" data-g="${k}">${k}문제</button>`).join("")}</div>
    <label class="lab">🔊 목소리</label>
    ${vs.length ? `<select class="inp" id="sVoice">${vs.map(v => `<option ${v.name === (TTS.voice()?.name) ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>` : `<p class="sm">한국어 목소리를 찾지 못했어요. 휴대폰 설정에서 한국어 음성을 받아 주세요.</p>`}
    <div class="chips mt">${[[0.8, "느리게"], [1, "보통"], [1.1, "조금 빠르게"], [1.2, "빠르게"]].map(([k, l]) => `<button class="chip ${S.set.rate === k ? "on" : ""}" data-r="${k}">${l}</button>`).join("")}</div>
    <button class="btn b-gray mt" id="sTest">🔊 목소리 들어 보기</button>
    <label class="lab">💾 백업 (푼 문제 ${Object.keys(S.q).length}개 · 읽은 절 ${Object.keys(S.done).length}개)</label>
    <button class="btn b-kakao" id="sBk">💬 카톡으로 백업 보내기</button>
    <div class="g2 mt"><button class="btn b-gray" id="sSave">💾 파일로 저장</button><button class="btn b-gray" id="sLoad">📂 불러오기</button></div>
    <button class="btn b-red mt" id="sReset">🗑️ 푼 기록 모두 지우기</button>
    <p class="sm" style="line-height:1.6;margin-top:12px">기록은 이 휴대폰에만 저장돼요. 로그인은 없어요.<br>📲 홈 화면에 추가: 아이폰은 사파리 → 공유 → 홈 화면에 추가, 갤럭시는 크롬 → ⋮ → 홈 화면에 추가</p>`, (m, close) => {
    m.querySelector("#sExam").onchange = e => { S.set.exam = e.target.value; save(); };
    m.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { S.set.goal = +b.dataset.g; save(); m.querySelectorAll("[data-g]").forEach(x => x.classList.toggle("on", x === b)); });
    m.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { S.set.rate = +b.dataset.r; save(); m.querySelectorAll("[data-r]").forEach(x => x.classList.toggle("on", x === b)); });
    m.querySelector("#sVoice")?.addEventListener("change", e => { S.set.voice = e.target.value; save(); });
    m.querySelector("#sTest").onclick = () => TTS.play([{ text: "안녕하세요. 전기기능사 공부를 시작해 볼까요? 전력 P는 V 제곱 나누기 R, 단위는 [W]예요." }]);
    const file = () => new File([JSON.stringify({ app: "elec-study", savedAt: new Date().toISOString(), ...S })], `전기기능사-백업-${today().replaceAll("-", "")}.json`, { type: "application/json" });
    const dl = f => { const u = URL.createObjectURL(f), a = document.createElement("a"); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
    m.querySelector("#sBk").onclick = async () => { const f = file(); if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: "전기기능사 백업" }); return; } catch (e) { if (e.name === "AbortError") return; } } dl(f); toast("파일로 저장했어요. 그 파일을 카톡으로 보내 주세요"); };
    m.querySelector("#sSave").onclick = () => dl(file());
    m.querySelector("#sLoad").onclick = () => { const i = document.createElement("input"); i.type = "file"; i.accept = ".json,application/json";
      i.onchange = async () => { try { const j = JSON.parse(await i.files[0].text()); if (j.app !== "elec-study") throw 0;
        if (!confirm(`푼 문제 ${Object.keys(j.q || {}).length}개 기록이 든 백업이에요. 지금 기록을 바꿀까요?`)) return;
        delete j.app; delete j.savedAt; S = Object.assign(def(), j); S.set = Object.assign(def().set, j.set); save(); close(); go("home"); toast("불러왔어요"); } catch { toast("전기기능사 백업 파일이 아니에요"); } }; i.click(); };
    m.querySelector("#sReset").onclick = () => { if (!confirm("푼 기록, 오답, 별표, 카드, 읽은 절 표시를 모두 지울까요?\n(시험일·설정·내 카드는 남아요)")) return; Object.assign(S, { q: {}, star: [], cards: {}, done: {}, day: { d: "", n: 0 }, mocks: [] }); save(); close(); go("home"); toast("기록을 지웠어요"); };
  });
}

go("home");
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
