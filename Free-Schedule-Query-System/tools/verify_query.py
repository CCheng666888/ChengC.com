# -*- coding: utf-8 -*-
"""
verify_query.py —— 查询逻辑抽样验证（回归检查）

与 index.html 内嵌 JS 的筛选逻辑保持一致：
- 单选课节：输出该时段有空人员（先干事、后干部），全部空闲时输出「全有空」；
- 多选课节：输出所选课节【都有空】的人员（交集）。
用法（在项目根目录执行）：
    python tools/verify_query.py
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "schedule.json"

CASES = [
    (2, "周一", ["第1、2节"]),
    (7, "周四", ["第1、2节"]),
    (20, "周日", ["第1、2节"]),
    (10, "周三", ["第9、10、11节"]),
    (3, "周五", ["第7、8节"]),
    (16, "周二", ["第5、6节"]),
    (2, "周一", ["第1、2节", "第3、4节"]),   # 多选：上午，交集
    (6, "周一", ["第1、2节", "第3、4节"]),   # 多选：上午全有空
    (2, "周一", ["第1、2节", "第5、6节"]),   # 多选：非连续
    (7, "周四", ["第1、2节", "第3、4节", "第5、6节", "第7、8节", "第9、10、11节"]),  # 全天交集：无人全天有空
    (20, "周六", ["第1、2节", "第3、4节", "第5、6节", "第7、8节", "第9、10、11节"]),  # 全天交集：全有空
]

d = json.loads(DATA.read_text(encoding="utf-8"))

for week, day, periods in CASES:
    res = None
    for period in periods:
        lst = d["schedule"][day][period]
        free = {p["name"]: p for p in lst if week in p["weeks"]}
        res = free if res is None else {k: v for k, v in res.items() if k in free}
    free = list(res.values())
    lst_total = [p["name"] for p in d["schedule"][day][periods[0]]]
    staff = [p["name"] for p in free if p["group"] == "干事"]
    cadre = [p["name"] for p in free if p["group"] == "干部"]
    label = "、".join(periods)
    if len(free) == len(lst_total):
        tag = "全有空（%d/%d）" % (len(free), len(lst_total))
    else:
        tag = "干事[%d]：%s | 干部[%d]：%s" % (
            len(staff), "、".join(staff), len(cadre), "、".join(cadre))
    print("第%d周 %s %s -> %s" % (week, day, label, tag))
