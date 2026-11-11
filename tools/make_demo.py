"""🧪 연습판(?demo)에 넣는 가짜 예시 데이터 만들기 → docs/demo/snapshot.json

    python tools/make_demo.py

사이트가 공개라 진짜 기록은 하나도 안 넣음 (이름·금액·할 일 모두 지어낸 것). 연습판의 '오늘'은 아래 TODAY로 고정.
칸을 새로 만들었으면 여기 예시에도 넣어 두기 → 올린 뒤 진짜 사이트 ?demo 에서 바로 눌러 볼 수 있음.
"""
import datetime
import io
import json
import os
import random

TODAY = "2026-11-11"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "demo", "snapshot.json")
R = random.Random(7)
T0 = datetime.date.fromisoformat(TODAY)
AT = 1762830000000   # TODAY 즈음의 시각(ms)


def day(n):   # 오늘에서 n일 뒤 (음수 = 전)
    return (T0 + datetime.timedelta(days=n)).isoformat()


def main():
    d = {"today": TODAY, "at": "가짜 예시", "goals": {}, "tasks": {}, "logs": {}, "money": {}, "accounts": {}, "requests": {}, "wins": {}, "history": [], "gevents": {}}
    # 목표 · 세부목표
    d["goals"] = {
        "g1": {"title": "전기기능사 실기", "cat": "자격증", "cert": "전기기능사", "due": day(40), "createdAt": AT - 9e9,
               "subs": {"s1": {"title": "공개문제 1~6번", "due": day(-5), "createdAt": AT - 8e9, "doneAt": day(-6)}, "s2": {"title": "공개문제 7~12번", "due": day(12), "createdAt": AT - 8e9}}},
        "g2": {"title": "현장 용어 100개 외우기", "cat": "현장", "due": day(75), "createdAt": AT - 7e9},
        "g3": {"title": "지게차 필기 합격", "cat": "자격증", "due": day(-20), "createdAt": AT - 9.5e9, "achievedAt": day(-21)},
    }
    # 할 일: 하루짜리 · 매일 · 매주 · 주 N번 · 실천 아닌 일
    t = d["tasks"]
    t["t1"] = {"title": "공개문제 7번 배선", "repeat": "none", "date": TODAY, "done": False, "doneDate": None, "goalId": "g1", "subId": "s2", "minutes": 60, "createdAt": AT - 1e6}
    t["t2"] = {"title": "용어 10개", "repeat": "daily", "start": day(-30), "goalId": "g2", "minutes": 20, "createdAt": AT - 3e9, "doneDates": {day(-i): True for i in range(1, 31) if i % 6}}
    t["t3"] = {"title": "강의 듣기", "repeat": "weekly", "days": [1, 3, 5], "start": day(-35), "goalId": "g1", "minutes": 50, "createdAt": AT - 3.2e9,
               "doneDates": {day(-i): True for i in range(1, 36) if (T0 - datetime.timedelta(days=i)).weekday() in (0, 2, 4)}}
    t["t4"] = {"title": "운동", "repeat": "nweek", "times": 3, "start": day(-20), "createdAt": AT - 2e9, "doneDates": {day(-1): True, day(-3): True, day(-8): True, day(-10): True, day(-12): True}}
    t["t5"] = {"title": "공구 정리", "repeat": "none", "date": day(-2), "done": False, "doneDate": None, "createdAt": AT - 4e8}
    t["t6"] = {"title": "작업복 세탁", "repeat": "none", "date": day(-1), "done": True, "doneDate": day(-1), "noPractice": True, "createdAt": AT - 3e8}
    t["t7"] = {"title": "모의시험 보기", "repeat": "none", "date": day(3), "done": False, "doneDate": None, "goalId": "g1", "minutes": 120, "createdAt": AT - 2e8}
    t["t8"] = {"title": "도면 복습", "repeat": "none", "date": day(-4), "done": True, "doneDate": day(-4), "goalId": "g1", "createdAt": AT - 6e8}
    # 실천 기록: 5주쯤, 주 5~6일은 60분 넘게 (연속 주가 이어지게)
    n = 0
    for i in range(1, 36):
        wd = (T0 - datetime.timedelta(days=i)).weekday()
        if wd == 6 or (wd == 5 and i % 14 > 6):
            continue
        for text, lo, hi in (("공개문제 연습", 40, 90), ("용어 외우기", 15, 30)):
            n += 1
            d["logs"]["l%d" % n] = {"date": day(-i), "minutes": R.randrange(lo, hi, 5), "text": text, "goalId": "g1" if "공개" in text else "g2", "createdAt": AT - i * 86400000 + n}
    d["logs"]["l900"] = {"date": day(-4), "minutes": 45, "text": "도면 복습", "taskId": "t8", "goalId": "g1", "createdAt": AT - 4 * 86400000}
    # 자산
    d["accounts"] = {
        "a1": {"name": "월급 통장", "type": "bank", "initial": 1200000, "createdAt": AT - 9e9},
        "a2": {"name": "체크카드", "type": "card", "initial": 0, "createdAt": AT - 9e9, "pay": {"day": 14, "from": "a1", "fm": -1, "fd": 1, "tm": -1, "td": 31, "since": day(-60)}},
        "a3": {"name": "현금", "type": "cash", "initial": 50000, "createdAt": AT - 9e9},
        "a4": {"name": "적금", "type": "save", "initial": 3000000, "createdAt": AT - 9e9},
        "a5": {"name": "결제일 없는 카드", "type": "card", "initial": 0, "createdAt": AT - 8e9},
    }
    # 돈 기록: 석 달
    m = d["money"]
    cats = [("식비", "점심", 9000, 14000), ("카페·간식", "커피", 2000, 6500), ("교통·차량", "주유", 30000, 70000), ("장보기", "마트", 15000, 60000), ("생필품", "", 5000, 25000),
            ("공구·작업", "장갑", 5000, 40000), ("데이트", "영화", 20000, 60000), ("병원·약", "약국", 4000, 30000)]
    k = 0
    for i in range(0, 75):
        for _ in range(R.choice((0, 1, 1, 2))):
            c, memo, lo, hi = R.choice(cats)
            k += 1
            m["m%d" % k] = {"kind": "expense", "amount": R.randrange(lo, hi, 500), "date": day(-i), "cat": c, "memo": memo or c, "account": R.choice(("a2", "a2", "a1", "a3")), "createdAt": AT - i * 86400000 + k}
    for j, back in enumerate((1, 32, 62)):   # 월급 · 줄 돈 · 적금
        m["sal%d" % j] = {"kind": "income", "amount": 2600000 + j * 50000, "date": day(-back), "cat": "월급", "memo": "월급", "account": "a1", "createdAt": AT - back * 86400000}
        if j:
            m["giv%d" % j] = {"kind": "transfer", "amount": 500000, "date": day(-back + 5), "cat": "생활비", "memo": "생활비", "account": "a1", "createdAt": AT - (back - 5) * 86400000}
        m["sav%d" % j] = {"kind": "move", "amount": 300000, "date": day(-back + 1), "cat": "이체", "memo": "적금 넣기", "account": "a1", "toAccount": "a4", "createdAt": AT - (back - 1) * 86400000}
    m["usd1"] = {"kind": "expense", "amount": 12, "cur": "달러", "date": day(-9), "cat": "쇼핑", "memo": "해외 결제", "account": "a2", "createdAt": AT - 9 * 86400000}
    m["note1"] = {"kind": "expense", "amount": 38000, "date": day(-2), "cat": "식비", "sub": "외식", "memo": "저녁", "note": "회식 대신 냄", "account": "a2", "createdAt": AT - 2 * 86400000}
    # 기능 요청
    d["requests"] = {"r1": {"area": "달력", "text": "달력에 공휴일도 보여 주세요", "status": "todo", "createdAt": AT - 5e8},
                     "r2": {"area": "가계부", "text": "분류 색을 바꾸고 싶어요", "status": "done", "note": "설정 탭에서 바꿀 수 있어요", "createdAt": AT - 9e8}}
    # 긁은 복권
    d["wins"] = {
        "w1": {"kind": "coupon", "tier": "mid", "title": "치킨 한 마리", "days": 30, "expires": day(20), "wonAt": day(-6), "at": AT + 1},
        "w2": {"kind": "coupon", "tier": "big", "title": "운동화 사 주기", "days": 60, "expires": day(39), "wonAt": day(-10), "at": AT + 2, "shield": True, "usedAt": day(-8)},
        "w3": {"kind": "pen", "title": "설거지 하기", "days": 7, "left": 2, "deadline": day(4), "wonAt": day(-3), "at": AT + 3},
        "w4": {"kind": "miss", "title": "꽝", "wonAt": day(-2), "at": AT + 4},
        "w5": {"kind": "pen", "title": "칭찬 3줄 쓰기", "days": 7, "left": 0, "doneAt": day(-4), "deadline": day(-1), "wonAt": day(-9), "at": AT + 5, "game": {"pts": 150, "date": day(-9)}},
        "w6": {"kind": "coupon", "tier": "small", "title": "아이스크림", "days": 7, "expires": day(-7), "wonAt": day(-14), "at": AT + 6},
        "w7": {"kind": "coupon", "tier": "big", "title": "🛡️ 연속일 하루 채우기", "days": 30, "expires": day(19), "wonAt": day(-5), "at": AT + 7, "effect": "streak"},
    }
    # 설정: 예산 · 복권 목록 · 칭찬 · 쿠폰 요청
    mo = TODAY[:7]
    d["settings"] = {
        "name": "욱진", "partner": "냐냐", "createdAt": AT - 9.9e9, "giveFrom": "a1",
        "budgets": {mo: {"give": 500000, "items": {"b1": {"cat": "식비", "memo": "", "amount": 350000, "createdAt": 1}, "b2": {"cat": "교통·차량", "memo": "주유", "amount": 150000, "createdAt": 2},
                                                   "b3": {"cat": "카페·간식", "memo": "", "amount": 60000, "createdAt": 3}, "b4": {"cat": "데이트", "memo": "", "amount": 150000, "createdAt": 4}}}},
        "currencies": ["달러"],
        "lotto": {"on": True,
                  "coupons": {"c1": {"tier": "big", "title": "운동화 사 주기", "days": 60, "createdAt": 1}, "c2": {"tier": "mid", "title": "치킨 한 마리", "days": 30, "createdAt": 2},
                              "c3": {"tier": "small", "title": "아이스크림", "days": 7, "createdAt": 3}, "c4": {"tier": "big", "title": "🛡️ 연속일 하루 채우기", "days": 30, "effect": "streak", "createdAt": 4},
                              "c5": {"tier": "small", "title": "편의점 간식", "days": 7, "createdAt": 5}, "c6": {"tier": "mid", "title": "영화 보기", "days": 30, "createdAt": 6}},
                  "pens": {"p1": {"title": "설거지 하기", "days": 7, "createdAt": 1}, "p2": {"title": "칭찬 3줄 쓰기", "days": 7, "createdAt": 2}, "p3": {"title": "분리수거", "days": 3, "createdAt": 3}},
                  "reqs": {"q1": {"text": "삼겹살 쿠폰 넣어 줘", "at": AT - 3e6, "status": "new"}, "q2": {"text": "늦잠 쿠폰", "at": AT - 9e7, "status": "added"}},
                  "praises": {"pr1": {"text": "이번 주 잘했어", "at": AT - 1e6, "date": TODAY, "pts": 30, "claim": 1}, "pr2": {"text": "약속 늦음", "at": AT - 2e6, "date": TODAY, "pts": -10},
                              "pr3": {"text": "모의시험 통과", "at": AT - 6e8, "date": day(-7), "pts": 50, "claim": 1, "got": day(-7)}}},
    }
    # 복권을 긁어 볼 수 있게 포인트 넉넉히 (달성한 목표 여러 개)
    for i in range(30):
        d["goals"]["gz%d" % i] = {"title": "예시 목표 %d" % (i + 1), "cat": "기타", "createdAt": AT - 9.8e9, "achievedAt": day(-40 - i)}
    d["gevents"] = {"e1": {"date": day(1), "time": "19:00", "title": "저녁 약속", "link": ""}, "e2": {"date": day(6), "time": "", "title": "냐냐 일정 예시", "nya": 1}}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    print("만듦: 목표 %d · 할 일 %d · 실천 %d · 돈 %d → docs/demo/snapshot.json" % (len(d["goals"]), len(d["tasks"]), len(d["logs"]), len(d["money"])))


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
