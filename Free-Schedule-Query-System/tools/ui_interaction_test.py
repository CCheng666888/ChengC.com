# -*- coding: utf-8 -*-
"""
ui_interaction_test.py —— 真实浏览器交互验证（下拉 + 查询按钮 UI）

用例覆盖：必填校验、单选课节查询（含相邻时段备注、样式一致）、全天交集查询、
全有空、课节多选（交集查询 + 边界相邻备注 + 有空绿/有课红）、值班行与值班标记。
需要：pip install playwright（浏览器复用本机 Edge）
用法：python tools/ui_interaction_test.py
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

HTML = Path(r"C:\Users\19152\Doubao\chats\2026-09-14\new-chat-1\index.html").as_uri()


def choose(page, dd_id, opt_text):
    page.click(f"#{dd_id} .trigger")
    page.click(f"#{dd_id} .panel .opt:has-text('{opt_text}')")


def choose_periods(page, *opts):
    """课节多选：先重置为「全天（不选）」，再逐个勾选；面板保持展开。"""
    box = page.locator("#ddPeriod")
    if not box.evaluate("e => e.classList.contains('open')"):
        page.click("#ddPeriod .trigger")
    page.click("#ddPeriod .panel .opt:has-text('全天（不选）')")
    for o in opts:
        if not box.evaluate("e => e.classList.contains('open')"):
            page.click("#ddPeriod .trigger")
        page.click(f"#ddPeriod .panel .opt:has-text('{o}')")


def click_query(page):
    page.click("#btnQuery")


def result_text(page):
    head = page.locator("#resultHead").inner_text()
    body = page.locator("#resultBody").inner_text().strip()
    return head + "\n" + body


def rows(page):
    return page.locator("#resultBody .person-row").all_inner_texts()


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(HTML)
        page.wait_for_load_state("domcontentloaded")

        # 1. 必填校验
        click_query(page)
        hint = page.locator("#hint")
        assert hint.is_visible() and "请先选择周数和星期" in hint.inner_text()
        print("[1] 必填校验提示 OK")

        # 2. 全有空（单选课节）
        choose(page, "ddWeek", "第 1 周")
        choose(page, "ddDay", "周一")
        choose_periods(page, "第1、2节")
        click_query(page)
        r = result_text(page)
        assert "全有空" in r and "（上午）" in r, r
        print("[2] 第1周 周一 第1、2节 -> 全有空，标注上午 OK")

        # 3. 部分有空 + 相邻时段备注 + 样式一致 + 不再输出空闲周
        choose(page, "ddWeek", "第 2 周")
        click_query(page)
        r = result_text(page)
        assert "全有空" not in r and "空闲周" not in r, r
        assert "5 / 13 人空闲" in r and "4 / 5 人空闲" in r, r
        all_rows = rows(page)
        liu = [x for x in all_rows if x.startswith("刘润冬")][0]
        assert "第3、4节：有课" in liu and "教室" not in liu, liu
        gao = [x for x in all_rows if x.startswith("高瑞欣")][0]
        assert "第3、4节：有空" in gao, gao
        assert "李玄" not in r, r
        staff_style = page.locator("#resultBody .person-row").first.evaluate(
            "e => getComputedStyle(e.querySelector('.name')).color")
        cadre_style = page.locator("#resultBody .person-row", has_text="高瑞欣").evaluate(
            "e => getComputedStyle(e.querySelector('.name')).color")
        assert staff_style == cadre_style, "干部应与干事样式一致"
        print("[3] 第2周 周一 第1、2节 -> 备注相邻时段、样式一致、无空闲周 OK")

        # 4. 3、4节备注 1、2 和 5、6；「有空」绿色
        choose_periods(page, "第3、4节")
        click_query(page)
        r = result_text(page)
        assert "李立刚" in r and "高瑞欣" in r and "肖云蓉" in r and "全有空" not in r, r
        all_rows = rows(page)
        ligang = [x for x in all_rows if x.startswith("李立刚")][0]
        assert "第1、2节：有课" in ligang and "第5、6节：有课" in ligang, ligang
        gaorx = [x for x in all_rows if x.startswith("高瑞欣")][0]
        assert "第1、2节：有空" in gaorx and "第5、6节：有课" in gaorx, gaorx
        ok_el = page.locator("#resultBody .person-row", has_text="高瑞欣").locator(".ok").first
        assert ok_el.inner_text() == "有空"
        assert ok_el.evaluate("e => getComputedStyle(e).color") == "rgb(22, 163, 74)"
        print("[4] 第2周 周一 第3、4节 -> 备注第1、2节与第5、6节，有空绿色 OK")

        # 5. 7、8节备注 5、6 和 9、10、11（笔误修正后规则）
        choose(page, "ddWeek", "第 7 周")
        choose(page, "ddDay", "周四")
        choose_periods(page, "第7、8节")
        click_query(page)
        r = result_text(page)
        assert "（下午）" in r, r
        all_rows = rows(page)
        ma = [x for x in all_rows if x.startswith("马鉴麟")][0]
        assert "第5、6节：有空" in ma and "第9、10、11节：有课" in ma, ma
        print("[5] 第7周 周四 第7、8节 -> 备注第5、6节与第9、10、11节 OK")

        # 6. 全天查询（交集）：只显示当天 5 节课都有空的人；当天值班单独一行
        choose_periods(page)
        choose(page, "ddDay", "周四")
        click_query(page)
        r = result_text(page)
        assert "值班：王浩锦" in r, r        # 第7周=单周，周四值班王浩锦
        assert "该日无人全天有空" in r, r     # 第7周 周四 无人全天都有空
        assert page.locator("#resultBody .person-row").count() == 0, r
        print("[6] 全天交集 week7 周四 -> 无人全天有空 + 值班行 OK")

        # 7. 全天全有空 + 值班行（第20周=双周，周六值班杨舒焱）
        choose(page, "ddWeek", "第 20 周")
        choose(page, "ddDay", "周六")
        click_query(page)
        r = result_text(page)
        assert "全有空" in r and "值班：杨舒焱" in r, r
        print("[7] 第20周 周六 全天 -> 全有空 + 值班行 OK")

        # 8. 多选整个上午（1、2 + 3、4）week6 周一 -> 全有空；课节值拼接显示
        choose(page, "ddWeek", "第 6 周")
        choose(page, "ddDay", "周一")
        choose_periods(page, "第1、2节", "第3、4节")
        val = page.locator("#ddPeriod .trigger span:first-child").inner_text()
        assert val == "第1、2节、第3、4节", val
        click_query(page)
        r = result_text(page)
        assert "全有空" in r and "（上午）" in r and "第1、2节、第3、4节" in r, r
        print("[8] 多选上午 week6 周一 -> 全有空，课节值拼接 OK")

        # 9. 多选上午 week2 周一 -> 只留两节都有空的高瑞欣；备注仅第5、6节，有课红色
        choose(page, "ddWeek", "第 2 周")
        choose(page, "ddDay", "周一")
        choose_periods(page, "第1、2节", "第3、4节")
        click_query(page)
        r = result_text(page)
        assert "本组无人有空" in r and "高瑞欣" in r, r
        assert "李立刚" not in r and "肖云蓉" not in r and "甘素娜" not in r, r
        all_rows = rows(page)
        gao = [x for x in all_rows if x.startswith("高瑞欣")][0]
        assert "第5、6节：有课" in gao and "第3、4节：" not in gao and "第1、2节：" not in gao, gao
        bad_el = page.locator("#resultBody .person-row .bad").first
        assert bad_el.inner_text() == "有课"
        assert bad_el.evaluate("e => getComputedStyle(e).color") == "rgb(220, 38, 38)"
        print("[9] 多选上午 week2 周一 -> 交集 + 相邻备注 + 有课红色 OK")

        # 10. 多选非连续（1、2 + 5、6）：备注 3、4 与 7、8，且不重复
        choose_periods(page, "第1、2节", "第5、6节")
        click_query(page)
        r = result_text(page)
        assert "第1、2节、第5、6节" in r and "（上午、下午）" in r, r
        assert "第3、4节：" in r and "第7、8节：" in r, r
        for row in rows(page):
            assert row.count("第3、4节") <= 1, row
            assert row.count("第7、8节") <= 1, row
        print("[10] 多选非连续 -> 备注去重 OK")

        # 11. 值班行 + 值班干事整行标黄：week2（双周）周一值班杨玥佳，且她第1、2节有空 -> 该行 on-duty 高亮
        choose(page, "ddWeek", "第 2 周")
        choose(page, "ddDay", "周一")
        choose_periods(page, "第1、2节")
        click_query(page)
        r = result_text(page)
        assert "值班：杨玥佳" in r, r
        yuejia = page.locator("#resultBody .person-row", has_text="杨玥佳")
        assert yuejia.evaluate("e => e.classList.contains('on-duty')"), "值班干事所在行应整行标黄"
        assert yuejia.locator(".duty-tag").count() == 0, "值班小标记已移除"
        assert "linear-gradient" in yuejia.evaluate("e => getComputedStyle(e).backgroundImage"), "值班行背景应为黄色渐变"
        liu = page.locator("#resultBody .person-row", has_text="刘润冬")
        assert not liu.evaluate("e => e.classList.contains('on-duty')"), "非值班干事不应标黄"
        print("[11] 值班行 + 值班干事整行标黄 OK")

        # 12. 双周周日无人值班 -> 不输出值班行
        choose(page, "ddDay", "周日")
        click_query(page)
        r = result_text(page)
        assert "值班" not in r, r
        print("[12] 双周周日无值班 -> 不输出值班行 OK")

        browser.close()
        print("ALL PASS")


if __name__ == "__main__":
    run()
