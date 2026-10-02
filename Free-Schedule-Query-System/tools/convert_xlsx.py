# -*- coding: utf-8 -*-
"""
convert_xlsx.py —— 计算机学院第七届新媒体中心空课表 → 查询系统数据

用途：读取《计算机学院第七届新媒体中心空课表.xlsx》，解析每个格子里的
「姓名（空闲周数）」多行文本（黑色=干事，红色=干部），生成：
  1. data/schedule.json         结构化数据（机器可读，供引用）
  2. index.html 内嵌数据块      单文件页面自包含（在 /* __DATA_BLOCK_START__ */
                                与 /* __DATA_BLOCK_END__ */ 之间）

用法：
    python tools/convert_xlsx.py [空课表.xlsx路径]
    （不传路径时默认读取桌面上的《计算机学院第七届新媒体中心空课表.xlsx》）
"""
import io
import json
import re
import sys
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_XLSX = Path(r"C:\Users\19152\Desktop\计算机学院第七届新媒体中心空课表.xlsx")

# 行列映射（与 Excel 一致）
DAY_COLS = {"B": "周一", "C": "周二", "D": "周三", "E": "周四", "F": "周五", "G": "周六", "H": "周日"}
PERIOD_ROWS = {3: "第1、2节", 4: "第3、4节", 5: "第5、6节", 6: "第7、8节", 7: "第9、10、11节"}
RED = "FFFF0000"


def parse_shared_strings(xml: str):
    """解析 sharedStrings.xml，返回 [(runs)], runs 为 [(color, text)]"""
    items = re.findall(r"<si>(.*?)</si>", xml, re.S)
    result = []
    for item in items:
        runs = []
        # 每个 <r> 是一个带格式分段；无 <r> 的纯 <t> 视为无格式分段
        r_blocks = re.findall(r"<r>(.*?)</r>", item, re.S)
        if not r_blocks:
            t = re.search(r"<t[^>]*>(.*?)</t>", item, re.S)
            runs.append((None, t.group(1) if t else ""))
        else:
            for rb in r_blocks:
                cm = re.search(r'<color rgb="([0-9A-Fa-f]{8})"', rb)
                color = cm.group(1).upper() if cm else None
                tm = re.search(r"<t[^>]*>(.*?)</t>", rb, re.S)
                runs.append((color, tm.group(1) if tm else ""))
        result.append(runs)
    return result


def tokenize_weeks(text: str):
    """把 '1，6，19-20' / '1-4,6,18-20' 之类的文本展开成周集合"""
    weeks = set()
    for tok in re.findall(r"\d+(?:[－\-]\d+)?", text):
        if "-" in tok or "－" in tok:
            m = re.match(r"(\d+)[－\-](\d+)", tok)
            if not m:
                continue
            a, b = int(m.group(1)), int(m.group(2))
            if a > b:
                a, b = b, a
            weeks.update(range(a, b + 1))
        else:
            weeks.add(int(tok))
    return sorted(w for w in weeks if 1 <= w <= 20)


def parse_lines(runs):
    """把富文本分段还原成 [(name, weeks_text, group)]"""
    people = []
    for color, text in runs:
        group = "干部" if color == RED else "干事"
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            m = re.match(r"^([\u4e00-\u9fff]+)", line)
            if not m:
                continue
            name = m.group(1)
            rest = line[m.end():]
            people.append({"name": name, "weeks_text": rest, "group": group})
    return people


def main():
    xlsx_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    print("读取:", xlsx_path)
    z = zipfile.ZipFile(xlsx_path)
    strings = parse_shared_strings(z.read("xl/sharedStrings.xml").decode("utf-8"))
    sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")

    # 单元格坐标 → 共享字符串索引
    cell_text = {}
    for cm in re.finditer(r'<c r="([A-Z]+\d+)"(?:[^>]*?)t="s"[^>]*?><v>(\d+)</v></c>', sheet):
        cell_text[cm.group(1)] = strings[int(cm.group(2))]
    # 兼容属性顺序不同的写法
    for cm in re.finditer(r'<c r="([A-Z]+\d+)"(?:[^>]*?t="s"[^>]*?)><v>(\d+)</v></c>', sheet):
        cell_text[cm.group(1)] = strings[int(cm.group(2))]

    schedule = {}
    name_group = {}
    for col, day in DAY_COLS.items():
        schedule[day] = {}
        for row, period in PERIOD_ROWS.items():
            coord = f"{col}{row}"
            runs = cell_text.get(coord)
            if runs is None:
                print(f"警告: {coord} 无数据")
                schedule[day][period] = []
                continue
            people = parse_lines(runs)
            schedule[day][period] = []
            for p in people:
                weeks = tokenize_weeks(p["weeks_text"])
                schedule[day][period].append({"name": p["name"], "group": p["group"], "weeks": weeks})
                if p["name"] in name_group and name_group[p["name"]] != p["group"]:
                    print(f"!! 身份冲突: {p['name']} 既是{name_group[p['name']]}又是{p['group']}")
                name_group[p["name"]] = p["group"]

    # ---- 校验 ----
    master = {n: g for n, g in name_group.items()}
    print(f"\n人员总数: {len(master)}")
    print("干事(%d): %s" % (sum(1 for g in master.values() if g == "干事"),
                            "、".join(sorted(n for n, g in master.items() if g == "干事"))))
    print("干部(%d): %s" % (sum(1 for g in master.values() if g == "干部"),
                            "、".join(sorted(n for n, g in master.items() if g == "干部"))))

    issues = 0
    for day in DAY_COLS.values():
        for period in PERIOD_ROWS.values():
            names = {p["name"] for p in schedule[day][period]}
            if names != set(master):
                issues += 1
                print(f"!! {day} {period}: 缺 {set(master) - names} / 多 {names - set(master)}")
    print(f"格子完整性校验: {'通过' if issues == 0 else f'发现 {issues} 处异常'}")

    # 抽查
    for day, period in [("周一", "第1、2节"), ("周日", "第9、10、11节"), ("周五", "第5、6节")]:
        sample = schedule[day][period][:3]
        print(f"抽查 {day} {period}:", json.dumps(sample, ensure_ascii=False))

    # ---- 输出 ----
    data = {
        "meta": {
            "title": "计算机学院第七届新媒体中心空课查询",
            "source": "计算机学院第七届新媒体中心空课表.xlsx",
            "weeks": 20,
            "groups": {
                "干事": sorted(n for n, g in master.items() if g == "干事"),
                "干部": sorted(n for n, g in master.items() if g == "干部"),
            },
        },
        "schedule": schedule,
    }
    out_json = PROJECT_ROOT / "data" / "schedule.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)
    with open(out_json, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2))
    print("已写:", out_json)

    # 生成 JS 数据块
    js_block = "window.SCHEDULE_DATA = " + json.dumps(data, ensure_ascii=False) + ";"
    index_html = PROJECT_ROOT / "index.html"
    if index_html.exists():
        text = index_html.read_text(encoding="utf-8")
        pat = re.compile(r"(\s*/\* __DATA_BLOCK_START__ \*/)(.*?)(/\* __DATA_BLOCK_END__ \*/)", re.S)
        if pat.search(text):
            new_text = pat.sub(
                lambda m: m.group(1) + "\n" + js_block + "\n" + m.group(3), text)
            with open(index_html, "w", encoding="utf-8", newline="\n") as f:
                f.write(new_text)
            print("已注入 index.html 数据块")
        else:
            print("!! index.html 缺少数据块标记，请手动嵌入")
    else:
        print("!! index.html 不存在，跳过注入")


if __name__ == "__main__":
    main()
