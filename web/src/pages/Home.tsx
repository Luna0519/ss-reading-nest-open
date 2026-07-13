import { useMemo, useState } from "react";
import type { SessionBundle, SourceAvailability } from "@ss/shared";

export type BookshelfItem = SessionBundle & {
  sourceAvailability: SourceAvailability;
  latestComment?: string;
};

type Filter = "all" | "active" | "completed" | "missing" | "novel" | "manga";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "active", label: "阅读中" },
  { value: "completed", label: "已完成" },
  { value: "missing", label: "正文缺失" },
  { value: "novel", label: "小说" },
  { value: "manga", label: "漫画" }
];

const MODE_LABELS = {
  light_chat: "轻松聊聊",
  reaction_only: "吐槽一下",
  cp_talk: "嗑一下",
  plot_guess: "猜后续",
  deep_analysis: "认真分析",
  diary_summary: "读书日记"
} as const;

export function Home(props: {
  bookshelf: BookshelfItem[];
  standaloneMode?: boolean;
  onAppearance?: () => void;
  onNew: (type: "novel" | "manga") => void;
  onOpen: (item: BookshelfItem) => void;
  onReimport: (item: BookshelfItem) => void;
  onManage: (item: BookshelfItem) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(
    () =>
      props.bookshelf.filter((item) => {
        if (filter === "active" || filter === "completed") {
          return item.session.status === filter;
        }
        if (filter === "missing") {
          return [
            "cloud_missing",
            "cloud_restore_failed",
            "local_only_missing"
          ].includes(item.sourceAvailability);
        }
        if (filter === "novel" || filter === "manga") {
          return item.session.type === filter;
        }
        return true;
      }),
    [filter, props.bookshelf]
  );

  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="hero-topline">
          <BrandMark />
          <div className="hero-actions">
            <button type="button" className="appearance-trigger" aria-label="打开小窝外观" onClick={props.onAppearance}>
              <i /><i /><i /><span>外观</span>
            </button>
            <span className="nest-status"><i />小窝在线</span>
          </div>
        </div>
        <p className="hero-kicker">L&amp;L · OUR READING NEST</p>
        <h1><span>L&amp;L</span> 共读小窝</h1>
        <p className="hero-intro">把喜欢的故事放进来，我们慢慢读完。</p>
        <div className="hero-summary" aria-label="小窝概况">
          <span><strong>{props.bookshelf.length}</strong> 本故事</span>
          <i />
          <span>{props.bookshelf.length ? "书页还在等我们" : "等待我们的第一本故事"}</span>
        </div>
      </section>

      {props.standaloneMode ? (
        <aside className="standalone-note">
          <span className="standalone-symbol" aria-hidden="true">⌂</span>
          <span><strong>独立阅读模式</strong><small>阅读、导入和进度保存都可以在这里完成；AI 陪读请回到 ChatGPT 里的 L&amp;L 共读小窝。</small></span>
        </aside>
      ) : null}

      <section className="reading-modes" aria-labelledby="new-reading-heading">
        <div className="section-intro">
          <div>
            <span>BEGIN TOGETHER</span>
            <h2 id="new-reading-heading">开始一段共读</h2>
          </div>
          <p>选一种方式，把故事带回小窝。</p>
        </div>
        <div className="mode-grid" aria-label="共读模式">
          <button className="mode-card novel-card" onClick={() => props.onNew("novel")}>
            <span className="mode-icon"><NovelIcon /></span>
            <span className="mode-copy"><small>文字故事</small><strong>小说共读</strong><em>TXT · Markdown · 粘贴正文</em></span>
            <span className="mode-arrow" aria-hidden="true">↗</span>
          </button>
          <button className="mode-card manga-card" onClick={() => props.onNew("manga")}>
            <span className="mode-icon"><MangaIcon /></span>
            <span className="mode-copy"><small>图像故事</small><strong>漫画共读</strong><em>导入图片 · 一页页慢慢看</em></span>
            <span className="mode-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

      <section className="bookshelf-section">
        <div className="section-heading">
          <div><span>OUR SHELF</span><h2>我的书架</h2></div>
          <span className="book-count">{props.bookshelf.length} 本作品</span>
        </div>
        <div className="bookshelf-filters" aria-label="书架筛选">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {props.bookshelf.length === 0 ? (
          <div className="empty-nest">
            <span className="empty-mark" aria-hidden="true">L&amp;L</span>
            <strong>书架还空着</strong>
            <p>选一本故事放进来，我们从第一页开始。</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-nest">这个筛选下还没有作品。</div>
        ) : (
          <div className="bookshelf-grid">
            {visible.map((item) => (
              <BookCard
                key={item.session.id}
                item={item}
                onOpen={props.onOpen}
                onReimport={props.onReimport}
                onManage={props.onManage}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function BookCard(props: {
  item: BookshelfItem;
  onOpen: (item: BookshelfItem) => void;
  onReimport: (item: BookshelfItem) => void;
  onManage: (item: BookshelfItem) => void;
}) {
  const { item } = props;
  const available = item.sourceAvailability === "available_local";
  const action = sourceAction(item);
  return (
    <article className={`book-card ${item.session.type}`}>
      <div className="book-card-top">
        <span className={`book-spine ${item.session.type}`} aria-hidden="true">
          {item.session.type === "novel" ? "文" : "画"}
        </span>
        <div className="book-title">
          <strong>{item.session.title}</strong>
          <span>
            {item.session.type === "novel" ? "小说" : "漫画"} ·{" "}
            {item.session.status === "active" ? "阅读中" : "已完成"}
          </span>
        </div>
        <span className={`status-dot ${item.session.status}`}>
          {item.session.status === "active" ? "阅读中" : "已完成"}
        </span>
      </div>
      <div className="book-progress">
        <span>用户：{item.session.userCurrentPosition.label}</span>
        <span>烁构：{item.session.assistantSyncedPosition?.label ?? "尚未同步"}</span>
        <span>{MODE_LABELS[item.session.sessionPreferences.readingCommentMode]}</span>
      </div>
      <div className={`book-source ${item.sourceAvailability}`}>
        <strong>{action.status}</strong>
        <span>{action.hint}</span>
      </div>
      <p className={`book-comment ${item.latestComment ? "has-comment" : ""}`}>
        <span aria-hidden="true">“</span>{item.latestComment ? `烁构：${item.latestComment}` : "烁构还没留下短评。"}
      </p>
      <button
        type="button"
        className={available ? "action-primary book-action" : "book-action"}
        aria-label={`${action.button}《${item.session.title}》`}
        onClick={() => (available ? props.onOpen(item) : props.onReimport(item))}
      >
        {action.button}
      </button>
      <button
        type="button"
        className="text-button book-manage-button"
        aria-label={`管理《${item.session.title}》`}
        onClick={() => props.onManage(item)}
      >
        管理这本书
      </button>
    </article>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-label="L&L">
      <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
        <path d="M10 16.5c7-3.2 14.4-2.2 22 3.4 7.6-5.6 15-6.6 22-3.4v31.2c-7-2.6-14.4-1.2-22 4.2-7.6-5.4-15-6.8-22-4.2V16.5Z" />
        <path d="M32 20v31" />
        <circle cx="51" cy="12" r="3" />
        <path d="m44 8 1.2 2.8L48 12l-2.8 1.2L44 16l-1.2-2.8L40 12l2.8-1.2L44 8Z" />
      </svg>
      <b>L&amp;L</b>
    </span>
  );
}

function NovelIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 10.5c5.3-2.2 10.6-1.5 16 2.4 5.4-3.9 10.7-4.6 16-2.4v27c-5.3-1.8-10.6-.7-16 3.1-5.4-3.8-10.7-4.9-16-3.1v-27Z" />
      <path d="M24 13v27" />
    </svg>
  );
}

function MangaIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="9" width="32" height="30" rx="4" />
      <circle cx="30" cy="18" r="3" />
      <path d="m12 34 8-9 6 6 4-4 6 7" />
    </svg>
  );
}

function sourceAction(item: BookshelfItem) {
  if (item.sourceAvailability === "available_local") {
    return {
      status: "当前设备可读",
      hint: "正文或漫画缓存与这本作品一致。",
      button: "继续阅读"
    };
  }
  if (item.sourceAvailability === "available_cloud") {
    return {
      status: "云端可恢复",
      hint: "当前设备缺少正文，但私人云端有可恢复副本。",
      button: "恢复正文"
    };
  }
  if (item.sourceAvailability === "restoring_from_cloud") {
    return {
      status: "正在从私人云端恢复正文",
      hint: "恢复完成后就可以继续阅读。",
      button: "恢复中"
    };
  }
  if (item.sourceAvailability === "cloud_restore_failed") {
    return {
      status: "恢复失败，请重新导入",
      hint: "进度和评论仍在，重新导入同一份正文后可继续。",
      button: item.session.type === "novel" ? "重新导入正文" : "重新导入漫画"
    };
  }
  if (item.sourceAvailability === "cloud_missing") {
    return {
      status: "云端正文不可用",
      hint: "私人云端副本没有找到，请重新导入后同步。",
      button: item.session.type === "novel" ? "重新导入正文" : "重新导入漫画"
    };
  }
  if (item.sourceAvailability === "local_only_missing") {
    return {
      status:
        item.session.type === "novel"
          ? "当前设备缺少正文"
          : "当前设备缺少漫画图片",
      hint:
        item.session.type === "novel"
          ? "重新导入后同步到私人云端。"
          : "请重新导入同一套漫画图片。",
      button: item.session.type === "novel" ? "重新导入正文" : "重新导入漫画"
    };
  }
  if (item.sourceAvailability === "mismatch") {
    return {
      status: "正文版本不一致",
      hint: "当前版本可能导致位置错位，不会自动补课。",
      button: "重新导入正确版本"
    };
  }
  if (item.sourceAvailability === "segmentation_mismatch") {
    return {
      status: "分段版本不一致",
      hint: "请重新导入或重新分段后继续。",
      button: "重新分段"
    };
  }
  return {
    status: "正在检查正文状态",
    hint: "需要导入或验证当前设备上的内容。",
    button: "验证正文"
  };
}
