import { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed rounded-lg p-10 text-center bg-card/50">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted grid place-items-center text-muted-foreground mb-3">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div className="font-medium">{title}</div>
      {description && <div className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}