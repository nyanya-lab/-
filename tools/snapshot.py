# 🔒 로컬 확인 모드용 사본 받기 (Claude용, 이 컴퓨터에서만 — 냐냐 보드 tools/snapshot.py와 같은 방식, 읽기만)
#   python tools/snapshot.py  → docs/_local/snapshot.json (.gitignore로 막아 둠, 절대 올리지 않기)
#   그다음 docs를 띄우고(.claude/launch.json 의 docs, 8000번) 내 브라우저에서
#     http://localhost:8000/?local                    실천 보드 (욱진이 기기처럼 보임)
#     http://localhost:8000/index.html?app=money&local 가계부
#   로그인 없이 진짜 숫자로 화면을 볼 수 있음. 뭘 눌러도 메모리에만 바뀌고 서버엔 안 씀, 새로고침하면 사본으로 돌아감.
# 비밀번호 같은 값(settings.uriPw · adminHash)과 사진(pics)·백업(_backup)은 사본에 넣지 않음.
import datetime, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "_local", "snapshot.json")
COLS = ["goals", "tasks", "logs", "money", "accounts", "requests", "wins"]

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    snap = {c: get(c) or {} for c in COLS}
    settings = get("settings") or {}
    for k in ("uriPw", "adminHash"): settings.pop(k, None)
    snap["settings"] = settings
    snap["history"] = get("history") or []
    snap["gevents"] = get("gevents") or {}
    snap["at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(snap, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"사본 저장: 할 일 {len(snap['tasks'])} · 실천 {len(snap['logs'])} · 돈 기록 {len(snap['money'])} · 자산 {len(snap['accounts'])} ({snap['at']})")
