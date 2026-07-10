# Repository Detail Page — 设计方案

## 1. 可用数据分析

### 数据库可用的时序数据

| 表 | 关键字段 | 用途 |
|----|---------|------|
| `repositories` | stars/forks/issues, topics, license, language, pushed_at | 头部元信息 |
| `trending_snapshots` | stargazers_count, forks_count, open_issues_count, fetched_at, since | **星星增长图**、复刻趋势 |
| `readmes` | content (Markdown) | README 渲染 |

**核心洞察**：`trending_snapshots` 包含每个仓库多次抓取的历史快照（daily/weekly/monthly），每条快照记录了当时的 star/forks 数量 + 时间戳。这意味着**可以为每个仓库绘制星星和复刻的时间序列折线图**。

---

## 2. 竞品参考

| 产品 | 核心图表 | 借鉴点 |
|------|---------|--------|
| **star-history.com** | 多仓库对比折线图 | 时间范围切换、仓库对比 |
| **GitHub 仓库页** | 折线图 | 简洁 KPI 行 + 趋势图 |
| **OSS Insight** | KPI 卡片 + 多图表 | 数据密集但可扫描的布局 |

---

## 3. 图表选型（遵循 dataviz 规范）

### 3.1 KPI 卡片行 — Stat Tiles

- **形式**: 单数值 + 周期变化量(delta) + sparkline 迷你图
- **数据**: 当前 stars/forks/issues + 本周增长量
- **颜色**: 数值 `text-foreground`，增长≥0 绿色、<0 红色

### 3.2 星星增长图 — Line Chart

- **形式**: 折线图，x=时间，y=star 数量
- **颜色**: Sequential，单一 primary hue
- **系列**: 1~3 条线（daily / weekly / monthly，默认 daily）
- **标注**: 最新点直接标注数值，hover 显示 tooltip
- **图例**: 多条线时直接标注在线上

### 3.3 复刻趋势图 — Line Chart

- **形式**: 同上，数据为 forks_count
- **仅在快照数≥2 时显示**

### 3.4 历史数据表

- **形式**: 表格，列=日期/Stars/Forks/Issues/周期
- **Tab 过滤**: daily / weekly / monthly / all

---

## 4. 页面布局

```
┌──────────────────────────────────────────────┐
│ ← Back to Trending        View on GitHub →   │
├──────────────────────────────────────────────┤
│ [Avatar]  owner / repo                       │
│            description text...               │
│ [Lang] [License] [Archived?] [Fork?]        │
│ ★ 12.5k  ⑂ 3.2k  ◉ 245  ↗ +128 this week   │
│ 🔗 homepage  [react] [typescript] [nextjs]  │
├──────────────────────────────────────────────┤
│ ┌──────────┬──────────┬──────────┬──────────┐│
│ │ ★ 12,547 │ ⑂ 3,210 │ ◉ 245   │ ↗ +128  ││
│ │  Stars   │  Forks   │ Issues   │ This Week││
│ │  ▁▂▃▄▅   │  ▁▁▂▃▄  │  ▂▃▃▄▅  │(growth)  ││
│ └──────────┴──────────┴──────────┴──────────┘│
├──────────────────────────────────────────────┤
│  Star Growth                         Daily ▼ │
│  ┌──────────────────────────────────────────┐│
│  │  15k ┤                             ╭───  ││
│  │  10k ┤                     ╭───────╯     ││
│  │   5k ┼─────────────────────╯             ││
│  │      └──┬────┬────┬────┬────┬────       ││
│  │       Jul5  Jul6  Jul7  Jul8  Jul9      ││
│  └──────────────────────────────────────────┘│
├──────────────────────────────────────────────┤
│  README                                       │
│  ┌──────────────────────────────────────────┐│
│  │  # Project Name                          ││
│  │  ## Installation ...                     ││
│  └──────────────────────────────────────────┘│
├──────────────────────────────────────────────┤
│  Trend History                     All ▼     │
│  ┌────────────┬──────────┬──────────┬──────┐ ││
│  │ Date       │ Stars    │ Forks    │ Since│ ││
│  ├────────────┼──────────┼──────────┼──────┤ ││
│  │ Jul 9 2026 │ 12,547   │ 3,210    │daily │ ││
│  │ Jul 8 2026 │ 12,420   │ 3,195    │daily │ ││
│  └────────────┴──────────┴──────────┴──────┘ ││
└──────────────────────────────────────────────┘
```

---

## 5. 实现计划

### 5.1 添加图表库

```bash
npm install recharts
```

选 recharts：React 原生声明式组件 + ResponsiveContainer 响应式 + 社区活跃。比 Chart.js/D3 更适合 React 项目。

### 5.2 新增/修改文件

| 文件 | 类型 | 职责 |
|------|------|------|
| `components/repo/stats-cards.tsx` | **新增** Server | KPI 行：Stars/Forks/Issues/周期增长 + sparkline |
| `components/repo/star-growth-chart.tsx` | **新增** Client | 星星增长折线图（recharts LineChart） |
| `components/repo/fork-trend-chart.tsx` | **新增** Client | 复刻趋势折线图（有数据才显示） |
| `components/repo/repo-header.tsx` | **更新** Server | 增加 stats 属性 |
| `components/repo/repo-detail-skeleton.tsx` | **更新** Server | 增加图表骨架 |
| `app/[locale]/repo/[owner]/[repo]/page.tsx` | **更新** | 组合 stats + chart + README + table |
| `locales/{en,zh,tw}/common.json` | **更新** | 新增 Repo chart 相关 i18n |

### 5.3 组件架构

```
RepoDetailPage (Server, async)
  ├── RepoHeader (Server, props: detail)
  ├── StatsCards (Server, props: detail)
  ├── Suspense → StarGrowthChart (Client, snapshots[])
  ├── Suspense → ForkTrendChart (Client, snapshots[])
  ├── ReadmeViewer (Server, readme_content)
  └── TrendChart (Client, snapshots[]) — 保留现有
```

---

## 6. 边界情况

| 情况 | 处理 |
|------|------|
| 快照数 < 2 | 不显示折线图，仅显示大数字 stat |
| 快照数 2~5 | 折线图 + 大方点标记每个数据点 |
| 快照 = 0 | "暂无趋势数据" 占位 |
| README 为空 | 已处理 |
| archived | 琥珀色 Archived 标记 |
| fork | Fork 标记 |

## 7. 扩展预留

- **AI Summary**: 头部预留区域（渐变边框卡片）
- **多仓库对比**: URL 支持 `/compare?repos=a,b`
- **趋势 Score**: 增长率计算的趋势分数
- **周期对比**: daily/weekly/monthly 三条线叠加
