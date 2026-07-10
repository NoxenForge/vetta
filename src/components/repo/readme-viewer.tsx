import { getTranslations } from "next-intl/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import React from "react";
import {
  Info,
  Lightbulb,
  AlertTriangle,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";

interface ReadmeViewerProps {
  content: string | null;
  /** 用于重写相对路径的 GitHub 仓库信息 */
  owner?: string;
  repo?: string;
  defaultBranch?: string;
}

// ── GFM Alert 类型 ──────────────────────────────────────

type AlertType = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

const ALERT_PATTERN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]\s*\n?/i;

const ALERT_STYLES: Record<
  AlertType,
  { icon: LucideIcon; border: string; bg: string; text: string; label: string }
> = {
  NOTE: {
    icon: Info,
    border: "border-l-blue-500 dark:border-l-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    label: "Note",
  },
  TIP: {
    icon: Lightbulb,
    border: "border-l-green-500 dark:border-l-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-300",
    label: "Tip",
  },
  IMPORTANT: {
    icon: AlertTriangle,
    border: "border-l-purple-500 dark:border-l-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-300",
    label: "Important",
  },
  WARNING: {
    icon: AlertTriangle,
    border: "border-l-yellow-500 dark:border-l-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    text: "text-yellow-700 dark:text-yellow-300",
    label: "Warning",
  },
  CAUTION: {
    icon: OctagonAlert,
    border: "border-l-red-500 dark:border-l-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    label: "Caution",
  },
};

/**
 * 检测 blockquote 是否为 GFM Alert 块，返回类型和去掉标记后的内容。
 * 如果不是 alert 则返回 null。
 */
function detectAlert(children: ReactNode): {
  type: AlertType;
  strippedChildren: ReactNode;
} | null {
  const childArr = React.Children.toArray(children);
  if (childArr.length === 0) return null;

  const firstChild = childArr[0];

  // 第一个子元素必须是 <p>
  if (!React.isValidElement(firstChild) || firstChild.type !== "p") return null;

  const pChildren = React.Children.toArray(
    (firstChild.props as { children?: ReactNode }).children,
  );

  // 提取第一个文本节点检查 [!TYPE]
  const firstText = pChildren.find(
    (c): c is string => typeof c === "string",
  );
  if (!firstText) return null;

  const match = firstText.match(ALERT_PATTERN);
  if (!match) return null;

  const alertType = match[1].toUpperCase() as AlertType;

  // 去掉标记后重建第一个 <p>
  const cleanedText = firstText.slice(match[0].length).replace(/^\n+/, "");
  const newPChildren = cleanedText
    ? [cleanedText, ...pChildren.filter((c) => c !== firstText)]
    : pChildren.filter((c) => c !== firstText);

  // 重建第一个 <p>，去掉 [!TYPE] 标记
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanedFirst = React.cloneElement(firstChild as any, {
    children: newPChildren.length > 0 ? newPChildren : undefined,
  });

  const strippedChildren = [cleanedFirst, ...childArr.slice(1)];

  return { type: alertType, strippedChildren };
}

// ── URL 解析 ────────────────────────────────────────────

/**
 * 将 markdown 中的相对路径重写为 raw.githubusercontent.com 的绝对 URL。
 * 仅对 http:// / https:// 之外的路径进行重写。
 */
function resolveUrl(
  href: string | undefined,
  base: string,
): string | undefined {
  if (!href) return undefined;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("#")) return href;
  if (href.startsWith("mailto:")) return href;
  const normalized = href.startsWith("/") ? href.slice(1) : href;
  return `${base}/${normalized}`;
}

// ── 主组件 ──────────────────────────────────────────────

export async function ReadmeViewer({
  content,
  owner,
  repo,
  defaultBranch,
}: ReadmeViewerProps) {
  const t = await getTranslations("Repo");

  if (!content) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("noReadme")}</p>
      </div>
    );
  }

  const rawBase =
    owner && repo && defaultBranch
      ? `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}`
      : undefined;

  // react-markdown 内部 props，不能传给原生 DOM 元素
  const REACT_MD_INTERNALS = new Set(["node", "isHeader", "checked"]);
  function cleanProps<T extends Record<string, unknown>>(
    props: T,
  ): Partial<T> {
    const cleaned: Record<string, unknown> = {};
    for (const key of Object.keys(props)) {
      if (!REACT_MD_INTERNALS.has(key)) {
        cleaned[key] = props[key];
      }
    }
    return cleaned as Partial<T>;
  }

  function A(p: ComponentPropsWithoutRef<"a">) {
    const props = cleanProps(p);
    const href = rawBase ? resolveUrl(props.href, rawBase) : props.href;
    return (
      <a
        {...props}
        href={href}
        target={props.href?.startsWith("http") ? "_blank" : undefined}
        rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
      />
    );
  }

  function Img(p: ComponentPropsWithoutRef<"img">) {
    const props = cleanProps(p);
    const rawSrc = typeof props.src === "string" ? props.src : undefined;
    const src = rawBase ? resolveUrl(rawSrc, rawBase) : rawSrc;
    return <img {...props} src={src} loading="lazy" alt={props.alt ?? ""} />;
  }

  /** GFM Alert 块 → 彩色提示框，普通引用保持原样 */
  function Blockquote(props: ComponentPropsWithoutRef<"blockquote">) {
    const alert = detectAlert(props.children);

    if (alert) {
      const style = ALERT_STYLES[alert.type];
      const Icon = style.icon;
      return (
        <div
          className={`my-4 rounded-md border-l-4 p-4 ${style.border} ${style.bg}`}
        >
          <div className={`flex items-center gap-2 mb-1 font-semibold text-sm ${style.text}`}>
            <Icon className="h-4 w-4" />
            {style.label}
          </div>
          <div className="text-sm text-foreground [&>p]:my-1">
            {alert.strippedChildren}
          </div>
        </div>
      );
    }

    // 普通引用
    return <blockquote {...props} />;
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b border-border px-6 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("readme")}
        </h2>
      </div>
      <div className="p-6">
        <article className="markdown-body bg-transparent! p-8"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkGemoji]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{ a: A, img: Img, blockquote: Blockquote }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
