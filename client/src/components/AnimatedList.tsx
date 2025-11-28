import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedListItem {
  id: string;
  content: React.ReactNode;
}

interface AnimatedListProps {
  items: AnimatedListItem[];
  onItemSelect?: (item: AnimatedListItem, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
}

export function AnimatedList({
  items,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = false,
  initialSelectedIndex = -1,
}: AnimatedListProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (enableArrowNavigation) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowDown" || e.key === "Tab") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % items.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        } else if (e.key === "Enter" && selectedIndex >= 0) {
          onItemSelect?.(items[selectedIndex], selectedIndex);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [enableArrowNavigation, items, selectedIndex, onItemSelect]);

  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  return (
    <div className={cn("relative w-full", className)}>
      {showGradients && (
        <>
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none rounded-t-lg" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none rounded-b-lg" />
        </>
      )}
      
      <div
        ref={listRef}
        className={cn(
          "overflow-y-auto max-h-[280px] py-2 scroll-smooth",
          displayScrollbar ? "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent" : "scrollbar-hide"
        )}
        style={{ scrollbarWidth: displayScrollbar ? "thin" : "none" }}
      >
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              ref={(el: HTMLButtonElement | null) => { itemRefs.current[index] = el; }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: { 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 24
                }
              }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedIndex(index);
                onItemSelect?.(item, index);
              }}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedIndex === index
                  ? "bg-primary/20 border border-primary/40"
                  : "hover:bg-white/5 border border-transparent",
                itemClassName
              )}
              data-testid={`animated-list-item-${item.id}`}
            >
              {item.content}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
