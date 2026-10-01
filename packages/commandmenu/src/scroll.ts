const px = (value: string) => Number.parseFloat(value) || 0;

/**
 * Scrolls the nearest scrollable ancestor of `option` just enough to show it, honouring
 * `scroll-margin` on the option and `scroll-padding` on the container. Unlike
 * `scrollIntoView`, it never scrolls the page itself.
 */
const scrollIntoList = (option: HTMLElement) => {
  const { body, documentElement, defaultView: view } = option.ownerDocument;
  if (!view) return;
  const isPage = (element: HTMLElement) => element === body || element === documentElement;
  const isScrollable = (element: HTMLElement) =>
    element.scrollHeight > element.clientHeight &&
    /auto|scroll|overlay/.test(view.getComputedStyle(element).overflowY);

  let box = option.parentElement;
  while (box && !isPage(box) && !isScrollable(box)) box = box.parentElement;
  if (!box || isPage(box)) return;

  const boxRect = box.getBoundingClientRect();
  const rect = option.getBoundingClientRect();
  const optionStyle = view.getComputedStyle(option);
  const boxStyle = view.getComputedStyle(box);
  const viewTop = boxRect.top + box.clientTop + px(boxStyle.scrollPaddingTop);
  const viewBottom =
    boxRect.top + box.clientTop + box.clientHeight - px(boxStyle.scrollPaddingBottom);
  const above = rect.top - px(optionStyle.scrollMarginTop) - viewTop;
  const below = rect.bottom + px(optionStyle.scrollMarginBottom) - viewBottom;

  if (above < 0) box.scrollTop += above;
  else if (below > 0) box.scrollTop += Math.min(below, above);
};

/**
 * Scrolls the option with `optionId` into view within `list`. Looks it up from the list's own
 * root, so it works inside shadow roots and iframes too.
 */
export const revealOption = (list: HTMLElement, optionId: string) => {
  const root = list.getRootNode() as Document | ShadowRoot;
  const option = root.getElementById(optionId);
  if (option) scrollIntoList(option);
};
