/**
 * TsStoreX 快取工具
 * 使用 UUID v7 提供時間排序的唯一標識符
 */

import { v7 as uuidv7 } from 'uuid';

/**
 * 簡單的字符串哈希函數
 */
const simpleHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 轉換為32位整數
  }
  
  return Math.abs(hash).toString(36);
};

/**
 * 為函數生成快取鍵
 * 基於函數內容生成穩定的哈希鍵，失敗時降級到 UUID v7 方案
 */
export const generateKey = (fn: Function, prefix: string = 'key'): string => {
  try {
    // 嘗試生成基於函數內容的穩定哈希
    const functionStr = fn.toString();
    const hash = simpleHash(functionStr);
    return `${prefix}_${hash}`;
  } catch (error) {
    // 降級到 UUID v7 方案（時間排序）
    const id = uuidv7();
    return `${prefix}_${id}`;
  }
};

/**
 * 為選擇器生成專用的快取鍵
 */
export const generateSelectorKey = (selector: Function): string => {
  return generateKey(selector, 'selector');
};

/**
 * 為 Signal 生成專用的快取鍵
 */
export const generateSignalKey = (selector: Function): string => {
  return generateKey(selector, 'signal');
};

/**
 * 為記憶化選擇器生成專用的快取鍵
 */
export const generateMemoKey = (selector: Function): string => {
  return generateKey(selector, 'memo');
};

/**
 * 生成唯一實例 ID
 * 用於 Store 實例、Entity 等需要全局唯一標識的場景
 */
export const generateInstanceId = (prefix: string = 'instance'): string => {
  const id = uuidv7();
  return `${prefix}_${id}`;
};

/**
 * 生成純 UUID v7
 * 直接返回 UUID v7，用於需要標準 UUID 格式的場景
 */
export const generateUUID = (): string => {
  return uuidv7();
};