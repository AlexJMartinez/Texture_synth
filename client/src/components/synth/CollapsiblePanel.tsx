import { useState, useEffect } from "react";
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

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <Card className={`synth-panel ${className}`} data-testid={testId}>
      <CardHeader className="pb-0.5 pt-1 px-1.5">
        <CardTitle className="flex items-center justify-between text-[10px] font-medium">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-0.5 hover:text-primary transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />
            )}
            {icon}
            <span>{title}</span>
          </button>
          {headerExtra}
        </CardTitle>
      </CardHeader>
      {isOpen && (
        <CardContent className="px-1.5 pb-1.5 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
