import { cleanup, fireEvent, render } from "@testing-library/react";
import { memo } from "react";
import { bench, describe } from "vitest";
import type { Config, PreparedItem } from "./types";
import { useCommandMenu } from "./useCommandMenu";

// Run with `pnpm bench`. jsdom and React's development build, so compare runs with each
// other rather than reading the numbers as what a browser would do.

const WORDS = ["alpha", "beta", "gamma", "settings", "theme", "open", "file", "search", "copy"];

const makeConfig = (n: number): Config[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `item-${i}`,
    label: `${WORDS[i % WORDS.length]} ${WORDS[(i * 7) % WORDS.length]} ${i}`,
    onSelect: () => undefined,
  }));

const Row = memo(({ item, isSelected }: { item: PreparedItem; isSelected: boolean }) => (
  // biome-ignore lint/a11y/useAriaPropsSupportedByRole: `role="option"` comes from itemProps
  <li {...item.itemProps} aria-selected={isSelected}>
    {item.label}
  </li>
));

// A typical consumer: memoized rows, inline callbacks.
const Menu = ({ config, results }: { config: Config[]; results: Config[] }) => {
  const { list, listProps, menuProps, searchProps, selectedId } = useCommandMenu({
    config,
    asyncResultsGroup: { id: "r", label: "Results", items: results },
    onSearchChange: () => undefined,
  });
  return (
    <div {...menuProps}>
      <input {...searchProps} />
      <ul {...listProps}>
        {list.map((item) => (
          <Row key={item.id} item={item} isSelected={item.id === selectedId} />
        ))}
      </ul>
    </div>
  );
};

const results = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    label: `result ${i}`,
    onSelect: () => undefined,
  }));

describe.each([1000, 5000])("%i items", (n) => {
  const config = makeConfig(n);
  let ui: ReturnType<typeof render>;
  let input: HTMLInputElement;
  const mount = () => {
    cleanup();
    ui = render(<Menu config={config} results={[]} />);
    input = ui.container.querySelector("input") as HTMLInputElement;
  };
  const options = { setup: mount, teardown: cleanup };

  bench(
    "type a query letter by letter, then clear it",
    () => {
      for (const value of ["s", "se", "set", ""]) fireEvent.change(input, { target: { value } });
    },
    options,
  );

  bench(
    "ArrowDown x10, ArrowUp x10",
    () => {
      for (let i = 0; i < 10; i++) fireEvent.keyDown(input, { key: "ArrowDown" });
      for (let i = 0; i < 10; i++) fireEvent.keyDown(input, { key: "ArrowUp" });
    },
    options,
  );

  bench(
    "hover across 10 rows",
    () => {
      const rows = ui.container.querySelectorAll('[role="option"]');
      for (let i = 0; i < 10; i++) fireEvent.pointerMove(rows[i]);
    },
    options,
  );

  bench(
    "async results arrive one by one",
    () => {
      for (let i = 1; i <= 5; i++) ui.rerender(<Menu config={config} results={results(i)} />);
      ui.rerender(<Menu config={config} results={[]} />);
    },
    options,
  );
});
