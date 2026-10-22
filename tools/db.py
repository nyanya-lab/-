# 욱진 보드 서버 데이터 읽기 (Claude용, 이 컴퓨터에서만 — 냐냐 보드 tools/db.py와 같은 방식, 읽기만)
# 비밀번호는 저장소 맨 위 dev-local.json {"boardPw": "..."} 에서 꺼냄 (.gitignore로 막아 둠, 절대 올리지 않기)
#   python tools/db.py get tasks                 → ukjin/{해시}/tasks 그대로 (JSON)
#   python tools/db.py logs 2026-10-20 2026-10-22 → 그 기간 실천 기록: 날짜 · 시간 · 할 일 · 기록한 시각(createdAt)
#   python tools/db.py hist                      → ↶ 되돌리기 기록 (언제 · 기기 · 무엇)
# 출력에 해시·비밀번호는 안 찍음
import datetime, hashlib, json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = "https://ukjin-207a3-default-rtdb.firebaseio.com/ukjin/"

def req(url):
    with urllib.request.urlopen(url) as res: return json.loads(res.read().decode("utf-8"))

def base():
    path = os.path.join(ROOT, "dev-local.json")
    if not os.path.exists(path): sys.exit("dev-local.json이 없어요. 저장소 맨 위에 {\"boardPw\": \"욱진 보드 비밀번호\"} 로 만들어 주세요.")
    pw = json.load(open(path, encoding="utf-8"))["boardPw"]
    return DB + hashlib.sha256(("ukjin-board:" + pw).encode("utf-8")).hexdigest()

def get(path): return req(base() + "/" + path.strip("/") + ".json")

def at(ms): return datetime.datetime.fromtimestamp(ms / 1000).strftime("%m/%d %H:%M") if ms else "-"

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "get":
        print(json.dumps(get(sys.argv[2]), ensure_ascii=False))
    elif cmd == "logs":
        a, b = sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else sys.argv[2]
        logs, tasks = get("logs") or {}, get("tasks") or {}
        rows = sorted((l for l in logs.values() if l and a <= (l.get("date") or "") <= b), key=lambda l: (l.get("date"), l.get("createdAt") or 0))
        for l in rows:
            t = tasks.get(l.get("taskId") or "", {}) if l.get("taskId") else None
            name = (t or {}).get("title") or l.get("text") or "(메모 없음)"
            print(f'{l.get("date")}  {l.get("minutes") or 0:>4}분  기록 {at(l.get("createdAt"))}  {"[할 일] " if t is not None else ""}{name}')
        if not rows: print("그 기간 실천 기록이 없어요.")
    elif cmd == "hist":   # ↶ 되돌리기 기록 (최근 30개): 언제 · 어느 기기 · 무엇 — 같은 날 다시 기록하면 예전 기록 시각이 지워져서 이걸로 순서를 봄
        h = get("history") or []
        for e in (h if isinstance(h, list) else list(h.values())):
            if e: print(f'{at(e.get("at"))}  {e.get("dev") or "":2}  {e.get("label") or ""}{"  (되돌림)" if e.get("undone") else ""}')
    else:
        sys.exit("사용법: python tools/db.py get <경로> | logs <시작일> [끝날] | hist")
