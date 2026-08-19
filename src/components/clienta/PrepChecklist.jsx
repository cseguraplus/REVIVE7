import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

export default function PrepChecklist({ items, checked, onToggle }) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const done = checked.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className="flex items-center gap-3 w-full text-left p-3 rounded-xl hover:bg-revive-cream transition-colors"
          >
            {done ? (
              <CheckCircle2 className="w-5 h-5 text-revive-green flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={done ? "text-revive-dark font-semibold line-through" : "text-foreground"}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}