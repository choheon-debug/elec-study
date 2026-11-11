import re, sys, html, statistics
SUP = str.maketrans("0123456789-+", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺")
SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")
HANG = re.compile(r"[가-힣]")
def pages(fn):
    h = open(fn, encoding="utf-8").read()
    for pg in re.findall(r'<page width="[\d.]+" height="([\d.]+)">(.*?)</page>', h, re.S):
        W = [dict(x0=float(a), y0=float(b), x1=float(c), y1=float(d), t=html.unescape(t)) for a, b, c, d, t in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', pg[1])]
        for w in W: w["h"] = w["y1"] - w["y0"]
        yield float(pg[0]), W
def rows(H, W):
    # 1) 위쪽이 거의 같은 단어끼리 한 줄로 (첨자·상자 이름처럼 작은 글자 포함)
    R = []
    for w in sorted(W, key=lambda w: (w["y0"], w["x0"])):
        for r in R:
            if abs(r["y"] - w["y0"]) <= 3.0 or (w["h"] < r["sz"] - 2.5 and -1 <= w["y0"] - r["y"] <= r["sz"] * 0.55 and any(abs(v["x1"] - w["x0"]) < 3 for v in r["w"])):
                r["w"].append(w); r["sz"] = max(r["sz"], w["h"]); break
        else: R.append({"y": w["y0"], "sz": w["h"], "w": [w]})
    for r in R:
        r["w"].sort(key=lambda w: w["x0"])
        sz = r["sz"]; keep = []
        for w in r["w"]:
            if w["h"] < sz - 2.5 and keep and w["x0"] - keep[-1]["x1"] < 2.5 and re.fullmatch(r"[0-9a-zA-Z+\-−′'*]+", w["t"]):
                L = keep[-1]; t = w["t"].replace("−", "-")
                up = w["y1"] < L["y1"] - 1.5
                if all(c in "0123456789-+" for c in t): L["t"] += t.translate(SUP if up else SUB)
                else: L["t"] += ("^" if up else "_") + t
                L["x1"] = w["x1"]
            else: keep.append(w)
        r["w"] = keep
        r["main"] = any(HANG.search(w["t"]) or "=" in w["t"] or "[" in w["t"] or w["t"][:1] in "①②③④" for w in keep) or len(keep) > 6
    # 2) 분수: 위(분자)·아래(분모)로 살짝 비켜난 짧은 줄을 본 줄에 끼워 넣기
    R.sort(key=lambda r: r["y"])
    def gap_ok(r, m):   # r의 단어들이 m의 단어와 겹치지 않고 빈칸에 들어가 있나
        return all(not (w["x0"] < v["x1"] - 1 and v["x0"] < w["x1"] - 1) for w in r["w"] for v in m["w"])
    for i, r in enumerate(R):
        if r.get("sat") or (r["main"] and len(r["w"]) > 6): continue
        best = None
        for m in R:
            if m is r or not m["main"] or m.get("sat") or (len(m["w"]) <= len(r["w"]) and r["main"] and m["w"][0]["t"][:1] not in "①②③④"): continue
            d = r["y"] - m["y"]
            if -10 <= d <= -2.5 or 3 <= d <= 13:
                xs0, xs1 = m["w"][0]["x0"], m["w"][-1]["x1"]
                if xs0 - 40 <= r["w"][0]["x0"] <= xs1 + 40 and (not r["main"] or gap_ok(r, m)) and (best is None or abs(d) < abs(best[0])): best = (d, m)
        if best: r["sat"] = 1; best[1].setdefault("num" if best[0] < 0 else "den", []).extend(r["w"])
    out = []
    for m in R:
        if m.get("sat"): continue
        ws = list(m["w"])
        def group(L):   # 붙어 있는 단어는 하나로
            G = []
            for w in sorted(L, key=lambda w: w["x0"]):
                if G and w["x0"] - G[-1]["x1"] < 5 and abs(w["y0"] - G[-1]["y0"]) < 3: G[-1] = dict(G[-1], t=G[-1]["t"] + " " + w["t"], x1=w["x1"])
                else: G.append(dict(w))
            return G
        nums = group(m.get("num", [])); dens = group(m.get("den", []))
        for d in dens:
            cx = (d["x0"] + d["x1"]) / 2
            cand = [n for n in nums if n["x0"] - 9 <= cx <= n["x1"] + 9 and "d" not in n]
            if cand: n = min(cand, key=lambda n: abs((n["x0"] + n["x1"]) / 2 - cx)); n["d"] = d
        for n in nums:
            if "d" in n:
                a, b = n["t"], n["d"]["t"]
                pa = lambda x: x if re.fullmatch(r"[\w.,²³⁻¹⁰⁴⁵⁶⁷⁸⁹√πω·]+", x) else f"({x})"
                n["t"] = f"{pa(a)}/{pa(b)}"
            n["k"] = (n["x0"] + n["x1"]) / 2 if "d" in n else n["x0"]; ws.append(n)
        ws += [d for d in dens if not any(n.get("d") is d for n in nums)]
        ws.sort(key=lambda w: w.get("k", w["x0"]))
        txt = ""; px = None
        for w in ws:
            if px is not None and w["x0"] - px > 1.2: txt += " "
            txt += w["t"]; px = max(px or 0, w["x1"])
        out.append({"y": m["y"], "y1": max(w["y1"] for w in ws), "x": ws[0]["x0"], "sz": round(m["sz"], 1), "t": txt, "ws": [(w["x0"], w["x1"], w["t"]) for w in ws if not w.get("used")]})
    return out
if __name__ == "__main__":
    for i, (H, W) in enumerate(pages(sys.argv[1])):
        if i + 1 not in map(int, sys.argv[2].split(",")): continue
        for r in rows(H, W): print(f'{r["x"]:6.1f} {r["sz"]:5.1f} | {r["t"]}')
def colrows(H, W, mid=297.6):
    L = [w for w in W if w["x0"] < mid]; Rr = [w for w in W if w["x0"] >= mid]
    return rows(H, L) + [dict(r, col=1) for r in rows(H, Rr)] if Rr else rows(H, L)
