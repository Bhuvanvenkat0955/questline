import clsx from "clsx";

/**
 * The big goal title on the cream hero of Today, Roadmap and Progress.
 * Long goals (a full sentence) get a smaller size so they don't fill the screen.
 */
export function GoalHeading({ title }: { title: string }) {
  return (
    <h1
      className={clsx(
        "mt-3 max-w-5xl font-display font-bold uppercase",
        title.length > 40 ? "text-2xl leading-tight sm:text-3xl" : "text-4xl leading-none sm:text-5xl",
      )}
    >
      {title}
    </h1>
  );
}
