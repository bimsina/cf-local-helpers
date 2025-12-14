import type { FC } from "hono/jsx";

const ChipsList: FC<{
  title?: string;
  chips: {
    label: string;
    link?: string;
    value: string;
  }[];
  selected?: string | null;
}> = ({ title, chips, selected }) => {
  if (chips.length <= 1) {
    return <></>;
  }
  return (
    <div class="mb-6">
      {title && <h2 class="text-lg font-semibold mb-3">{title}</h2>}
      <div class="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <a
            key={chip.value}
            href={chip.link || "#"}
            class={`badge badge-soft ${
              selected === chip.value
                ? "badge-primary"
                : "badge-ghost border-base-300 hover:border-base-content/20 text-base-content"
            }`}
          >
            {chip.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default ChipsList;
