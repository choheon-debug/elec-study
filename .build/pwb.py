import sys, re, json, collections
sys.path.insert(0, "/tmp/claude-0/elec"); import rows as R
exec(open("/tmp/claude-0/elec/pbook.py").read().split("subs = []")[0].split("import rows as R")[1])   # KJ 함수 재사용
C4 = "①②③④"
Q = {}; rnd = None; mode = None; cur = None; curq = None
for pi, (H, W) in enumerate(R.pages("/tmp/claude-0/elec/pdf/w.bbox.html")):
    rs = R.colrows(H, W)
    rs = [r for r in rs if r.get("col", 0) == 0] + [r for r in rs if r.get("col", 0) == 1]
    for r in rs:
        t = r["t"].strip()
        if r["y"] < 60 and r["sz"] < 12:
            m = re.match(r"제(\d+)회 모의고사", t)
            if m: rnd = int(m.group(1))
            continue
        if r["sz"] == 12.3 and re.fullmatch(r"\d+", t): continue
        if re.match(r"제\d+회 정답 및 해설", t): mode = "a"; continue
        if re.match(r"전기기능사 필기 모의고사|제\d+회 \(기출|자격 종목|수험 번호|\d+분 문항|점수$", t): mode = "q"; continue
        if rnd is None: continue
        if re.fullmatch(r"[\d\s]+", t) or re.fullmatch(r"[①②③④\s]+", t): continue
        if re.match(r"제\d과목 ", t): continue
        if mode == "q":
            m = re.match(r"(\d+)\. (.*)", t)
            if m and int(m.group(1)) <= 60 and round(r["x"]) in (42, 43, 308): 
                curq = Q.setdefault((rnd, int(m.group(1))), {"q": m.group(2), "o": []}); cur = "q"; continue
            if curq is None: continue
            if t[0] in C4 and round(r["x"]) in (54, 319):
                # 한 줄에 보기가 둘 이상일 수도 있다
                for part in re.split(r"\s(?=[①②③④]\s?)", t): curq["o"].append(part[1:].strip())
                cur = "o"; continue
            if cur == "q": curq["q"] = KJ(curq["q"], t)
            elif cur == "o" and curq["o"]: curq["o"][-1] = KJ(curq["o"][-1], t)
        else:
            m = re.match(r"(\d+)\. 정답 ([①②③④])\s*(.*)", t)
            if m: curq = Q.setdefault((rnd, int(m.group(1))), {"q": "", "o": []}); curq["a"] = C4.index(m.group(2)); curq["e"] = m.group(3); cur = "e"; continue
            if cur == "e" and curq: curq["e"] = KJ(curq["e"], t)
out = []
for (r, n), q in sorted(Q.items()):
    out.append({"id": f"r{r:02d}-{n:02d}", "r": r, "n": n, "s": "TMI"[(n - 1) // 20], "q": q["q"], "o": q["o"], "a": q.get("a"), "e": q.get("e", "")})
bad = [o["id"] for o in out if len(o["o"]) != 4 or o["a"] is None or not o["q"]]
print(len(out), "bad", len(bad), bad[:15])
json.dump(out, open("/tmp/claude-0/elec/w.json", "w", encoding="utf-8"), ensure_ascii=False)
