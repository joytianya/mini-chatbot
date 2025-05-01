/**
 * DOM相关工具函数
 */

/**
 * 检查元素是否在视口内
 * @param element 要检查的DOM元素
 * @param offset 偏移量（可选），默认为0
 * @returns 元素是否在视口内
 */
export function isElementInViewport(element: HTMLElement, offset: number = 0): boolean {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 - offset &&
    rect.left >= 0 - offset &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
  );
}

/**
 * 获取元素距离视口顶部的距离
 * @param element 要检查的DOM元素
 * @returns 元素距离视口顶部的距离（像素）
 */
export function getElementDistanceFromViewportTop(element: HTMLElement): number {
  if (!element) return 0;
  
  const rect = element.getBoundingClientRect();
  return rect.top;
}

/**
 * 平滑滚动到指定元素
 * @param element 目标元素
 * @param offset 偏移量（像素），默认为0
 * @param duration 动画持续时间（毫秒），默认为500
 */
export function scrollToElement(element: HTMLElement, offset: number = 0, duration: number = 500): void {
  if (!element) return;
  
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - offset;
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

/**
 * 平滑滚动容器到底部
 * @param container 容器元素
 * @param duration 动画持续时间（毫秒），默认为300
 */
export function scrollToBottom(container: HTMLElement, duration: number = 300): void {
  if (!container) return;
  
  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'smooth'
  });
}

/**
 * 检测页面是否滚动到底部
 * @param tolerance 容差值（像素），默认为20
 * @returns 是否到达底部
 */
export function isScrolledToBottom(tolerance: number = 20): boolean {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  );
  
  return scrollTop + windowHeight >= documentHeight - tolerance;
} 