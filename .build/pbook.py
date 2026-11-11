import sys, re, json, subprocess, os
sys.path.insert(0, "/tmp/claude-0/elec"); import rows as R
sys.path.insert(0, "/tmp/claude-0/prog/build")
CIRC = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮"
BOX = ["기출 포인트", "쉬운 예", "예제", "풀이"]
HANG = re.compile(r"[가-힣]")
# 줄 끝에서 잘린 한글 단어를 붙이는 규칙 (어휘 목록은 이 책 글로 다시 만든다)
import collections
_st = lambda w: re.sub(r"[^0-9A-Za-z가-힣]", "", w)
VOC = collections.Counter()
for f in ["b1", "b2", "b3", "b4", "w"]:
    for ln in open(f"/tmp/claude-0/elec/pdf/{f}.txt", encoding="utf-8"):
        t = ln.split()
        for w in t[1:-1]: VOC[_st(w)] += 1
END = "게고며면서는은을를의에와과로도만나이가요지해"
def KJ(a, b):
    if not a: return b
    if a.endswith(("(", "“", '"', "·", "/", "-", "~")): return a + b
    A, B = a.split()[-1], b.split()[0]
    hang = lambda c: "가" <= c <= "힣"
    if hang(A[-1]) and hang(B[0]):
        sA, sB = _st(A), _st(B)
        if VOC[sA + sB] > VOC[sA] + VOC[sB]: return a + b
        if B.startswith(("입니다", "이다", "니다", "다.", "다,", "습니다", "됩니다", "합니다")): return a + b
        if len(sB) == 1 and sB in "지다요고게며서도에를은는이가의로": return a + b
        if len(sA) >= 3 and sA[-1] in END: return a + " " + b
        if VOC[sA] and VOC[sB]: return a + " " + b
        if not VOC[sB]: return a + b
    return a + " " + b
subs = []; subj = None; sec = None; last = None; figs = []
def add(b):
    global last
    if sec is None: return
    sec["b"].append(b); last = b
os.makedirs("/home/user/elec-study/fig", exist_ok=True)
for f in ["b1", "b2", "b3", "b4"]:
    for pi, (H, W) in enumerate(R.pages(f"/tmp/claude-0/elec/pdf/{f}.bbox.html")):
        rs = R.rows(H, W)
        if f == "b1" and pi < 12: continue
        prevy = 60
        for r in rs:
            t = r["t"].strip(); x = round(r["x"]); sz = r["sz"]
            if r["y"] < 60 and sz < 12: continue
            if sz == 12.3 and re.fullmatch(r"\d+|[ivx]+", t): continue
            m = re.fullmatch(r"제(\d)과목", t)
            if m and sz > 20: subj = {"t": "", "n": int(m.group(1)), "s": []}; subs.append(subj); sec = None; continue
            if subj is not None and not subj["t"] and sz > 20 and not t.startswith("제"): subj["t"] = t; continue
            m = re.fullmatch(r"제(\d+)절 (.+)", t)
            if m and sz > 24: sec = {"n": int(m.group(1)), "t": m.group(2), "b": []}; subj["s"].append(sec); last = None; prevy = r["y1"]; continue
            if sec is None: continue
            if t.startswith("[그림"):
                # 그림 영역을 잘라 이미지로 저장
                y0, y1 = prevy + 2, r["y1"] + 3
                name = f"fig{len(figs)+1:02d}.png"; sc = 150 / 72
                subprocess.run(["pdftoppm", "-f", str(pi + 1), "-l", str(pi + 1), "-r", "150", "-x", str(int(45 * sc)), "-y", str(int(y0 * sc)), "-W", str(int(510 * sc)), "-H", str(int((y1 - y0) * sc)), "-png", "-singlefile", f"/tmp/claude-0/elec/pdf/{f}.pdf", f"/home/user/elec-study/fig/{name[:-4]}"], check=True)
                figs.append(name); add({"t": "fig", "src": "fig/" + name, "x": t}); prevy = r["y1"]; continue
            kind = None
            if sz >= 20 and x in (54,): kind = "h2"
            elif 17 <= sz < 18 and x in (62, 54): kind = "h3"
            elif sz == 15.2 and re.match(r"\(\d+\)", t) and x in (74, 60): kind = "h4"
            elif sz == 15.2 and x > 100 and re.search(r"[=∝≒]|[가-힣]", t): kind = "f"
            elif sz == 13.3 and x in (61, 60): kind = "tr"
            elif 14 <= sz <= 15 and x in (85, 99, 70, 72, 67, 64, 54, 60):
                kind = "text"
            else:
                continue       # 그림 속 글자 등
            prevy = r["y1"]
            if kind in ("h2", "h3", "h4"): add({"t": kind, "x": t}); continue
            if kind == "f": add({"t": "f", "x": t}); continue
            if kind == "tr":
                cells = []
                for (a, b2, w) in r["ws"]:
                    if cells and a - cells[-1][1] < 7: cells[-1] = [cells[-1][0], b2, cells[-1][2] + " " + w]
                    else: cells.append([a, b2, w])
                cells = [c[2] for c in cells]
                if last and last["t"] == "table": last["rows"].append(cells)
                else: add({"t": "table", "rows": [cells]})
                continue
            bx = next((k for k in BOX if t.startswith(k + " ") or t == k), None)
            if t[0] in CIRC and x == 85: add({"t": "li", "x": t}); continue
            if bx and x in (70, 72, 67, 64): add({"t": "box", "k": bx, "x": t[len(bx):].strip()}); continue
            if last and last["t"] in ("li", "box", "p"): last["x"] = KJ(last["x"], t); continue
            add({"t": "p", "x": t})
json.dump(subs, open("/tmp/claude-0/elec/book.json", "w", encoding="utf-8"), ensure_ascii=False)
for s in subs:
    c = collections.Counter(b["t"] for x in s["s"] for b in x["b"])
    print(s["n"], s["t"], len(s["s"]), dict(c))
print("figs", len(figs))
