import json
B = json.load(open("/tmp/claude-0/elec/book.json"))
W = json.load(open("/tmp/claude-0/elec/w.json"))
C = []
for i, ln in enumerate(open("/tmp/claude-0/elec/cards.txt", encoding="utf-8").read().strip().split("\n")):
    d, f, b = ln.split("|"); C.append({"id": f"k{i+1:03d}", "d": d, "f": f, "b": b.split(";;")})
hdr = "// 「전기기능사 필기시험 이론편·문제집(기출 복원형 모의고사 10회분)」 내용\n"
open("/home/user/elec-study/qs.js", "w", encoding="utf-8").write(hdr + "window.WQ=" + json.dumps(W, ensure_ascii=False, separators=(",", ":")) + ";\nwindow.CARDS=" + json.dumps(C, ensure_ascii=False, separators=(",", ":")) + ";\n")
open("/home/user/elec-study/book.js", "w", encoding="utf-8").write(hdr + "window.BOOK=" + json.dumps(B, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(W), len(C), [(b["t"], len(b["s"])) for b in B])
