import { getTranslations } from "next-intl/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReadmeViewerProps {
  content: string | null;
}

export async function ReadmeViewer({ content }: ReadmeViewerProps) {
  const t = await getTranslations("Repo");

  if (!content) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("noReadme")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b border-border px-6 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t("readme")}
        </h2>
      </div>
      <div className="p-6">
        <article className="prose prose-sm dark:prose-invert max-w-none
          prose-headings:scroll-mt-20
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-pre:bg-muted prose-pre:border prose-pre:border-border
          prose-img:rounded-lg prose-img:border prose-img:border-border
          prose-table:border prose-table:border-border
          prose-th:bg-muted prose-th:px-3 prose-th:py-1.5 prose-th:text-xs prose-th:font-medium
          prose-td:px-3 prose-td:py-1.5 prose-td:text-xs
          prose-hr:border-border
          prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
