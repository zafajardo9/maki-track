import type { BlogAuthor } from "./types";

const all: BlogAuthor[] = [
  {
    id: "andrej",
    name: "Andrej Acevski",
    role: "Founder, Maki",
    url: "https://github.com/andrejsshell",
  },
  {
    id: "maki-team",
    name: "The Maki team",
    role: "Maki",
    url: "https://github.com/usekaneo/kaneo",
  },
];

export const authorList = all;

export const authors: Record<string, BlogAuthor> = Object.fromEntries(
  all.map((author) => [author.id, author]),
);
