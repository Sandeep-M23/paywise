"use client";

import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export function useVirtualRows({
  count,
  rowHeight,
  prefetch,
  hasMore,
  loadingMore,
  onLoadMore,
  resetKey,
}: {
  count: number;
  rowHeight: number;
  prefetch: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  resetKey: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scroller.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });
  const items = virtualizer.getVirtualItems();
  const lastIndex = items.at(-1)?.index ?? 0;

  useEffect(() => {
    if (hasMore && !loadingMore && lastIndex >= count - prefetch) onLoadMore();
  }, [lastIndex, count, prefetch, hasMore, loadingMore, onLoadMore]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [resetKey]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setShowTop(el.scrollTop > 1200);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return {
    scroller,
    items,
    measureElement: virtualizer.measureElement,
    paddingTop: items[0]?.start ?? 0,
    paddingBottom: virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0),
    showTop,
    scrollToTop: () => scroller.current?.scrollTo({ top: 0, behavior: "smooth" }),
  };
}
