"""🧩 두 가계부가 같이 쓰는 파일 맞추기 (원본 = 냐냐 보드 docs/money/ → 욱진 보드 docs/)

    python tools/sync_money.py           냐냐 보드 것을 그대로 복사 (바뀐 파일 이름을 알려 줌)
    python tools/sync_money.py --check   복사는 안 하고 다른 파일이 있는지만 봄 (있으면 끝 코드 1)

냐냐 보드 저장소가 이 저장소 옆(../nyanya-board)에 있어야 함.
복사한 뒤엔: ① 냐냐 쪽에서 새로 생긴 화면 조각(index.html)·꾸밈(style.css)·env 값이 있으면 욱진 보드에도 넣기
            ② ?v= 올리기 (app.js의 ./recv.js?v= 는 acctset.js 안의 것과 같은 값으로)
            ③ PC·폰 너비로 화면 확인하고 올리기
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
UK = os.path.join(HERE, "..", "docs")
NY = os.path.join(HERE, "..", "..", "nyanya-board", "docs", "money")
FILES = ["money.js", "summary.js", "extras.js", "report.js", "recv.js", "recsplit.js", "txfilter.js",
         "range.js", "picker.js", "datepick.js", "acctset.js", "balance.js"]


def read(path):
    with io.open(path, encoding="utf-8", newline="") as f:
        return f.read().replace("\r\n", "\n")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")   # 윈도우 터미널에서 한글이 깨지지 않게
    check = "--check" in sys.argv
    if not os.path.isdir(NY):
        sys.exit("냐냐 보드 저장소를 못 찾았어요: " + os.path.normpath(NY))
    changed = []
    for name in FILES:
        src = read(os.path.join(NY, name))
        dst_path = os.path.join(UK, name)
        dst = read(dst_path) if os.path.exists(dst_path) else None
        if src == dst:
            continue
        changed.append(name)
        if not check:
            with io.open(dst_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(src)
    if not changed:
        print("같아요: 파일 %d개 모두 냐냐 보드와 같음" % len(FILES))
    else:
        print(("다른 파일: " if check else "복사한 파일: ") + ", ".join(changed))
    # 같은 파일을 ?v= 가 다른 주소로 두 번 불러오면 두 벌이 뜸 → recv.js 주소가 맞는지 봄
    inner = re.search(r"\./recv\.js\?v=(\w+)", read(os.path.join(UK, "acctset.js")))
    outer = re.search(r"\./recv\.js\?v=(\w+)", read(os.path.join(UK, "app.js")))
    if inner and outer and inner.group(1) != outer.group(1):
        print("⚠️ recv.js?v= 가 달라요: app.js %s / acctset.js %s → app.js 쪽을 acctset.js와 같게" % (outer.group(1), inner.group(1)))
        sys.exit(1)
    if check and changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
