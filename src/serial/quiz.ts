export type GenreChoice = "rire" | "frisson"
export type DecorChoice = "administration" | "grece" | "colonie" | "chalet"

export function recommendSlug(genre: GenreChoice, decor: DecorChoice): string {
  if (genre === "frisson") return "la-maison-qui-ecoutait"
  if (decor === "administration") return "abel-doit-nuire"
  if (decor === "grece") return "lodyssee-fiscale"
  if (decor === "colonie") return "lavare-2052"
  return "lavare-2052"
}
