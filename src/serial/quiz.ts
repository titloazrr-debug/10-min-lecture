export type GenreChoice = "rire" | "frisson"
export type DecorChoice = "administration" | "grece" | "colonie" | "chalet"

type StoryTags = {
  slug: string
  genres: GenreChoice[]
  decors: DecorChoice[]
}

export const STORY_TAGS: StoryTags[] = [
  { slug: "lavare-2052", genres: ["rire"], decors: ["colonie"] },
  { slug: "abel-doit-nuire", genres: ["rire"], decors: ["administration"] },
  { slug: "lodyssee-fiscale", genres: ["rire"], decors: ["grece"] },
  { slug: "la-maison-qui-ecoutait", genres: ["frisson"], decors: ["chalet"] },
]

export const DECOR_LABELS: Record<DecorChoice, string> = {
  administration: "Administration absurde",
  grece: "Grèce antique",
  colonie: "Colonie sous IA",
  chalet: "Chalet sous la neige",
}

export function decorsForGenre(genre: GenreChoice): DecorChoice[] {
  const seen = new Set<DecorChoice>()
  const out: DecorChoice[] = []
  for (const story of STORY_TAGS) {
    if (!story.genres.includes(genre)) continue
    for (const decor of story.decors) {
      if (seen.has(decor)) continue
      seen.add(decor)
      out.push(decor)
    }
  }
  return out
}

export function recommendSlug(genre: GenreChoice, decor?: DecorChoice): string {
  if (decor) {
    const hit = STORY_TAGS.find((story) => story.genres.includes(genre) && story.decors.includes(decor))
    if (hit) return hit.slug
  }
  return STORY_TAGS.find((story) => story.genres.includes(genre))?.slug ?? "lavare-2052"
}
