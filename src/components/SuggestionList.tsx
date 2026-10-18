export function SuggestionList({ suggestions }: { suggestions: string[] }) {
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-5 text-ink marker:font-semibold marker:text-primary">
      {suggestions.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}
