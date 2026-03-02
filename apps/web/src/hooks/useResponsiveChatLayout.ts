import { useEffect, useState, type MutableRefObject } from "react";

export function useResponsiveChatLayout(
  activeChannelId: string | null,
  composerRef: MutableRefObject<HTMLTextAreaElement | null>
) {
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 900px)").matches;
  });
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);
      if (!event.matches) {
        setMobilePane("chat");
      }
    };
    setIsMobileLayout(media.matches);
    if (!media.matches) {
      setMobilePane("chat");
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      return;
    }
    if (!activeChannelId) {
      setMobilePane("list");
    }
  }, [isMobileLayout, activeChannelId]);

  useEffect(() => {
    if (!isMobileLayout) {
      return;
    }

    if (mobilePane === "chat") {
      window.requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
      return;
    }

    if (mobilePane === "list") {
      window.requestAnimationFrame(() => {
        const channelButtons = Array.from(
          document.querySelectorAll<HTMLButtonElement>(".channel-item[data-channel-id]")
        );
        const preferred = activeChannelId
          ? channelButtons.find((button) => button.dataset.channelId === activeChannelId)
          : null;
        (preferred ?? channelButtons[0])?.focus();
      });
    }
  }, [isMobileLayout, mobilePane, activeChannelId, composerRef]);

  return {
    isMobileLayout,
    mobilePane,
    setMobilePane
  };
}
