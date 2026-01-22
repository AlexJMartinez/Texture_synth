import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsiblePanelProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
  "data-testid"?: string;
}

export function CollapsiblePanel({
  title,
  icon,
  defaultOpen = true,
  children,
  className = "",
  headerExtra,
  "data-testid": testId,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={`synth-panel ${className}`} data-testid={testId}>
      <CardHeader className="pb-1 pt-1.5 px-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
            {icon}
            <span>{title}</span>
          </button>
          {headerExtra}
        </CardTitle>
      </CardHeader>
      {isOpen && (
        <CardContent className="px-2 pb-2 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
