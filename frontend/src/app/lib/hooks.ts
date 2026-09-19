"use client";

import { useEffect } from "react";

/**
 * Gọi hàm nạp dữ liệu bất đồng bộ sau khi component mount (và khi loader đổi).
 * Bọc trong hàm async nội bộ theo hướng dẫn của React để không setState đồng bộ trong effect.
 */
export function useLoadEffect(load: () => Promise<void>) {
  useEffect(() => {
    async function run() {
      await load();
    }
    void run();
  }, [load]);
}
