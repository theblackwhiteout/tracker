import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// --- LAZY INITIALIZATION OF GEMINI ---
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI components will return demo datasets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// --- AIRING SCHEDULE PROXIER (ANILIST API GQL) ---
app.post("/api/anilist/schedule", async (req, res) => {
  try {
    const { daysAhead } = req.body;
    const nowSecStr = Math.floor(Date.now() / 1000);
    const endSecStr = nowSecStr + (daysAhead || 7) * 24 * 60 * 60;

    const query = `
      query ($airingAt_greater: Int, $airingAt_lesser: Int) {
        Page (page: 1, perPage: 50) {
          airingSchedules (airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
            id
            airingAt
            episode
            mediaId
            media {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                extraLarge
                color
              }
              format
              genres
              description
              episodes
            }
          }
        }
      }
    `;

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          airingAt_greater: nowSecStr,
          airingAt_lesser: endSecStr,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AniList Error Details:", errText);
      throw new Error(`AniList returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    res.json(data?.data?.Page?.airingSchedules || []);
  } catch (err: any) {
    console.error("AniList Fetch Error:", err);
    // Return mock data for local testing/fallback if AniList breaks
    res.json([
      {
        id: 111,
        airingAt: Math.floor(Date.now() / 1000) + 7200,
        episode: 12,
        mediaId: 1535,
        media: {
          id: 1535,
          title: { english: "Demon Slayer: Castle Arc", romaji: "Kimetsu no Yaiba" },
          coverImage: { large: "https://placehold.co/150x200/1e293b/ef4444?text=Demon+Slayer" },
          format: "TV",
          genres: ["Action", "Fantasy"],
          description: "Tanjiro fights in the Infinity Castle.",
          episodes: 12
        }
      },
      {
        id: 222,
        airingAt: Math.floor(Date.now() / 1000) + 86400 * 1.5,
        episode: 3,
        mediaId: 21,
        media: {
          id: 21,
          title: { english: "One Piece", romaji: "One Piece" },
          coverImage: { large: "https://placehold.co/150x200/1e293b/3b82f6?text=One+Piece" },
          format: "TV",
          genres: ["Action", "Adventure"],
          description: "Luffy seeks the ultimate pirate treasure.",
          episodes: 1100
        }
      }
    ]);
  }
});

// --- SEASONAL ANIME DATABASE (ANILIST API GQL) ---
app.post("/api/anilist/seasonal", async (req, res) => {
  try {
    const { season, year } = req.body;
    const query = `
      query ($season: MediaSeason, $seasonYear: Int) {
        Page (page: 1, perPage: 40) {
          media (season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
              color
            }
            format
            genres
            description
            episodes
            seasonYear
            averageScore
          }
        }
      }
    `;

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          season, // "WINTER", "SPRING", "SUMMER", "FALL"
          seasonYear: parseInt(year)
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AniList Seasonal Error Details:", errText);
      throw new Error(`AniList Seasonal returned status ${response.status}`);
    }

    const data = await response.json();
    const mediaItems = data?.data?.Page?.media || [];
    res.json(mediaItems);
  } catch (err: any) {
    console.error("AniList Seasonal Fetch Error:", err);
    res.json([]);
  }
});

// --- MODERN HOMEPAGE MASTER PROXY (MULTI-LIST ANILIST QUERY) ---
app.get("/api/anilist/home", async (req, res) => {
  try {
    const query = `
      query {
        topAiring: Page(page: 1, perPage: 12) {
          media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
              color
            }
            bannerImage
            genres
            episodes
            seasonYear
            averageScore
            format
            description
          }
        }
        trending: Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: TRENDING_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
              color
            }
            bannerImage
            genres
            episodes
            seasonYear
            averageScore
            format
            description
          }
        }
        topUpcoming: Page(page: 1, perPage: 8) {
          media(status: NOT_YET_RELEASED, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
              color
            }
            bannerImage
            genres
            episodes
            seasonYear
            averageScore
            format
            description
          }
        }
        highestRated: Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: SCORE_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
              color
            }
            bannerImage
            genres
            episodes
            seasonYear
            averageScore
            format
            description
          }
        }
        topManga: Page(page: 1, perPage: 8) {
          media(type: MANGA, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
              color
            }
            bannerImage
            genres
            chapters
            volumes
            averageScore
            format
            description
          }
        }
      }
    `;

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`AniList Home Query failed with status ${response.status}`);
    }

    const resJson = await response.json();
    res.json(resJson?.data || {});
  } catch (err: any) {
    console.error("AniList Home Fetch Error:", err);
    res.status(500).json({ error: err.message, fallback: true });
  }
});

// --- WESTERN HOMEPAGE MASTER PROXY ---
app.get("/api/western/home", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "MOCK_KEY") {
      try {
        const ai = getGemini();
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                trendingMovies: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      coverImage: { type: Type.STRING },
                      genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                      format: { type: Type.STRING },
                      year: { type: Type.INTEGER },
                      averageScore: { type: Type.NUMBER },
                      description: { type: Type.STRING }
                    },
                    required: ["id", "title", "coverImage", "genres", "format", "year", "averageScore", "description"]
                  }
                },
                trendingTV: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      coverImage: { type: Type.STRING },
                      genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                      format: { type: Type.STRING },
                      year: { type: Type.INTEGER },
                      averageScore: { type: Type.NUMBER },
                      description: { type: Type.STRING }
                    },
                    required: ["id", "title", "coverImage", "genres", "format", "year", "averageScore", "description"]
                  }
                },
                topUpcoming: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      coverImage: { type: Type.STRING },
                      genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                      format: { type: Type.STRING },
                      year: { type: Type.INTEGER },
                      averageScore: { type: Type.NUMBER },
                      description: { type: Type.STRING }
                    },
                    required: ["id", "title", "coverImage", "genres", "format", "year", "averageScore", "description"]
                  }
                }
              },
              required: ["trendingMovies", "trendingTV", "topUpcoming"]
            }
          },
          contents: `Provide a structured list of highly popular, real Western media for a cinematic homepage. 
Include 8 'trendingMovies', 8 'trendingTV', and 6 'topUpcoming' Western releases. 
For coverImage, provide standard high-quality representative cinematic/creative photography Unsplash links (e.g. 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&h=450&fit=crop' or similar representing film/media). 
Set 'format' to 'Movie' or 'TV' appropriately. Set averageScore out of 100 (e.g., 85).`
        });
        const parsed = JSON.parse(response.text || "{}");
        return res.json(parsed);
      } catch (geminiErr) {
        console.warn("Western Home Gemini generation failed, falling back to static:", geminiErr);
      }
    }

    // Static fallback if Gemini is offline or unkey'd
    const fallbackData = {
      trendingMovies: [
        {
          id: "interstellar",
          title: "Interstellar",
          coverImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&h=450&fit=crop",
          genres: ["Sci-Fi", "Adventure", "Drama"],
          format: "Movie",
          year: 2014,
          averageScore: 89,
          description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival."
        },
        {
          id: "dune-part-two",
          title: "Dune: Part Two",
          coverImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=300&h=450&fit=crop",
          genres: ["Sci-Fi", "Adventure", "Action"],
          format: "Movie",
          year: 2024,
          averageScore: 91,
          description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family."
        },
        {
          id: "oppenheimer",
          title: "Oppenheimer",
          coverImage: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=300&h=450&fit=crop",
          genres: ["Biography", "Drama", "History"],
          format: "Movie",
          year: 2023,
          averageScore: 88,
          description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb."
        },
        {
          id: "inception",
          title: "Inception",
          coverImage: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=300&h=450&fit=crop",
          genres: ["Sci-Fi", "Action", "Thriller"],
          format: "Movie",
          year: 2010,
          averageScore: 90,
          description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea."
        },
        {
          id: "the-dark-knight",
          title: "The Dark Knight",
          coverImage: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=300&h=450&fit=crop",
          genres: ["Action", "Crime", "Drama"],
          format: "Movie",
          year: 2008,
          averageScore: 94,
          description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice."
        }
      ],
      trendingTV: [
        {
          id: "breaking-bad",
          title: "Breaking Bad",
          coverImage: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?q=80&w=300&h=450&fit=crop",
          genres: ["Crime", "Drama", "Thriller"],
          format: "TV",
          year: 2008,
          averageScore: 95,
          description: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student."
        },
        {
          id: "stranger-things",
          title: "Stranger Things",
          coverImage: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=300&h=450&fit=crop",
          genres: ["Drama", "Sci-Fi", "Fantasy"],
          format: "TV",
          year: 2016,
          averageScore: 87,
          description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl."
        },
        {
          id: "succession",
          title: "Succession",
          coverImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=300&h=450&fit=crop",
          genres: ["Drama"],
          format: "TV",
          year: 2018,
          averageScore: 91,
          description: "The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their father steps down."
        },
        {
          id: "arcane",
          title: "Arcane: League of Legends",
          coverImage: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=300&h=450&fit=crop",
          genres: ["Animation", "Action", "Adventure"],
          format: "TV",
          year: 2021,
          averageScore: 93,
          description: "Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions."
        }
      ],
      topUpcoming: [
        {
          id: "gladiator-ii",
          title: "Gladiator II",
          coverImage: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=300&h=450&fit=crop",
          genres: ["Action", "Adventure", "Drama"],
          format: "Movie",
          year: 2024,
          averageScore: 80,
          description: "Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius is forced to enter the Colosseum."
        },
        {
          id: "dune-prophecy",
          title: "Dune: Prophecy",
          coverImage: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=300&h=450&fit=crop",
          genres: ["Sci-Fi", "Drama", "Action"],
          format: "TV",
          year: 2024,
          averageScore: 82,
          description: "Set 10,000 years before the ascension of Paul Atreides, the series follows two Harkonnen sisters as they combat forces that threaten the future of humankind."
        }
      ]
    };
    res.json(fallbackData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PUBLIC ANILIST API INTEGRATION (NO API KEY REQUIRED!) ---
async function searchAniList(searchQuery: string, type?: "ANIME" | "MANGA"): Promise<any[]> {
  const query = `
    query ($search: String, $type: MediaType) {
      Page (page: 1, perPage: 8) {
        media (search: $search, type: $type) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
            color
          }
          description
          genres
          episodes
          chapters
          volumes
          seasonYear
          averageScore
          type
        }
      }
    }
  `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          search: searchQuery,
          type: type,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`AniList search failed with status ${response.status}`);
      return [];
    }

    const data = await response.json();
    const mediaList = data?.data?.Page?.media || [];
    
    return mediaList.map((item: any) => ({
      mediaId: String(item.id),
      title: item.title.english || item.title.romaji || item.title.native,
      mediaType: item.type === "ANIME" ? "anime" : "manga",
      coverImage: item.coverImage.large || item.coverImage.extraLarge,
      description: item.description ? item.description.replace(/<[^>]*>/g, "").substring(0, 300) + (item.description.length > 300 ? "..." : "") : "No description available.",
      genres: item.genres || [],
      totalUnits: item.type === "ANIME" ? (item.episodes || 0) : (item.chapters || item.volumes || 0),
      year: item.seasonYear || new Date().getFullYear(),
      rating: item.averageScore ? item.averageScore / 10 : 7.5
    }));
  } catch (err) {
    console.error("Error searching AniList:", err);
    return [];
  }
}

async function searchGeminiWestern(searchQuery: string, type?: "movie" | "tv"): Promise<any[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return getOfflineSearch(searchQuery, type);
  }

  try {
    const ai = getGemini();
    const typeLabel = type ? `${type}` : "movie or tv show";

    const promptMessage = `The user is searching for a Western movie or television show. Query: "${searchQuery}". Restriction: "${typeLabel}".
Identify up to 5 real, popular movies/TV shows matching this query. You must return actual items that exist.
Provide the estimated total units (e.g., total episodes for TV, or runtime string as an integer like 120 (mins) for movie).`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptMessage,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              mediaId: { type: Type.STRING, description: "Sluggified unique ID of the media (lowercase, letters and dashes)" },
              title: { type: Type.STRING, description: "Standard English/Common Title" },
              mediaType: { type: Type.STRING, description: "Must be 'movie', or 'tv'" },
              coverImage: { type: Type.STRING, description: "A high quality descriptive keyword-based search image from unsplash, like 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&h=450&fit=crop' or similar related to cinema, movies, tv, film or the keyword" },
              description: { type: Type.STRING, description: "Short, high-quality, professional synopsis of the media. (Max 150 words)" },
              genres: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of genres"
              },
              totalUnits: { type: Type.INTEGER, description: "Total episodes (for tv) or duration in minutes (for movie). 0 if active/unknown." },
              year: { type: Type.INTEGER, description: "Initial release year" },
              rating: { type: Type.NUMBER, description: "Average community standard score from 1.0 to 10.0" }
            },
            required: ["mediaId", "title", "mediaType", "coverImage", "description", "genres", "totalUnits", "year", "rating"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "[]");
    return parsed;
  } catch (err) {
    console.error("Gemini Search Western error:", err);
    return getOfflineSearch(searchQuery, type).filter(item => item.mediaType === "movie" || item.mediaType === "tv");
  }
}

async function getAniListDetails(mediaId: string, title: string, mediaType: string): Promise<any> {
  const isIdNumeric = /^\d+$/.test(mediaId);
  const typeFilter = mediaType === "manga" ? "MANGA" : "ANIME";

  const variables: any = {};
  let query = "";

  if (isIdNumeric) {
    variables.id = parseInt(mediaId);
    query = `
      query ($id: Int) {
        Media (id: $id) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          bannerImage
          description
          genres
          episodes
          chapters
          volumes
          seasonYear
          averageScore
          status
          studios {
            nodes {
              name
              isAnimationStudio
            }
          }
          staff {
            edges {
              role
              node {
                name {
                  full
                }
              }
            }
          }
          characters (sort: ROLE, perPage: 4) {
            edges {
              role
              node {
                name {
                  full
                }
              }
              voiceActors (language: JAPANESE) {
                name {
                  full
                }
              }
            }
          }
          recommendations (perPage: 3) {
            nodes {
              mediaRecommendation {
                id
                title {
                   english
                   romaji
                }
                description
                type
                coverImage {
                  large
                }
              }
            }
          }
          siteUrl
        }
      }
    `;
  } else {
    variables.search = title;
    variables.type = typeFilter;
    query = `
      query ($search: String, $type: MediaType) {
        Media (search: $search, type: $type) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          bannerImage
          description
          genres
          episodes
          chapters
          volumes
          seasonYear
          averageScore
          status
          studios {
            nodes {
              name
              isAnimationStudio
            }
          }
          staff {
            edges {
              role
              node {
                name {
                  full
                }
              }
            }
          }
          characters (sort: ROLE, perPage: 4) {
            edges {
              role
              node {
                name {
                  full
                }
              }
              voiceActors (language: JAPANESE) {
                name {
                  full
                }
              }
            }
          }
          recommendations (perPage: 3) {
            nodes {
              mediaRecommendation {
                id
                title {
                   english
                   romaji
                }
                description
                type
                coverImage {
                  large
                }
              }
            }
          }
          siteUrl
        }
      }
    `;
  }

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AniList details fetch failed with status ${response.status}`);
  }

  const resJson = await response.json();
  const mediaVal = resJson?.data?.Media;
  if (!mediaVal) {
    throw new Error("No media found on AniList");
  }

  const cleanDescription = mediaVal.description 
    ? mediaVal.description.replace(/<[^>]*>/g, "") 
    : "No synopsis available.";

  const studiosList = mediaVal.studios?.nodes?.map((st: any) => st.name) || [];
  
  const directorsList: string[] = [];
  if (mediaVal.staff?.edges) {
    for (const edge of mediaVal.staff.edges) {
      const roleStr = edge.role?.toLowerCase() || "";
      if (roleStr.includes("director") || roleStr.includes("author") || roleStr.includes("story") || roleStr.includes("art")) {
        directorsList.push(`${edge.node.name.full} (${edge.role})`);
      }
    }
  }
  if (directorsList.length === 0) {
    directorsList.push(mediaType === "manga" ? "Original Manga Creator" : "Lead Director");
  }

  const charObjects = mediaVal.characters?.edges?.map((edge: any) => {
    const characterName = edge.node.name.full;
    const characterRole = edge.role === "MAIN" ? "Main" : "Supporting";
    const voiceActorName = edge.voiceActors?.[0]?.name?.full || "N/A";
    return {
      name: characterName,
      role: characterRole,
      voiceActor: voiceActorName
    };
  }) || [];

  const similars = mediaVal.recommendations?.nodes?.map((node: any) => {
    const recMedia = node.mediaRecommendation;
    if (!recMedia) return null;
    return {
      title: recMedia.title.english || recMedia.title.romaji || recMedia.title.native || "Unknown Title",
      description: recMedia.description ? recMedia.description.replace(/<[^>]*>/g, "").substring(0, 100) + "..." : "No synopsis.",
      mediaType: recMedia.type === "MANGA" ? "manga" : "anime",
      mediaId: recMedia.id ? String(recMedia.id) : undefined,
      coverImage: recMedia.coverImage?.large || undefined
    };
  }).filter(Boolean) || [];

  if (similars.length === 0) {
    similars.push({
      title: mediaType === "manga" ? "Death Note (Manga)" : "Steins;Gate",
      description: "Highly rated title sharing core genres and thematic focus.",
      mediaType: mediaType === "manga" ? "manga" : "anime",
      mediaId: mediaType === "manga" ? "30021" : "9253"
    });
  }

  const statusLabels: Record<string, string> = {
    FINISHED: "Finished Airing / Completed Publishing",
    RELEASING: "Currently Releasing / On-going",
    NOT_YET_RELEASED: "Not Yet Released / Upcoming",
    CANCELLED: "Cancelled Publishing",
    HIATUS: "On Hiatus"
  };
  const statusLabel = statusLabels[mediaVal.status] || "Popular Work";

  return {
    mediaId: String(mediaVal.id),
    title: mediaVal.title.english || mediaVal.title.romaji || mediaVal.title.native,
    mediaType: mediaType,
    tagline: `Official AniList Status: ${statusLabel}. Rated ${mediaVal.averageScore ? mediaVal.averageScore + '%' : 'Highly'} by the otaku community.`,
    fullSynopsis: cleanDescription,
    ageRating: mediaType === "manga" ? "Teen / Seinen" : "PG-13 (Teens 13 or older)",
    studios: studiosList.slice(0, 3),
    directors: directorsList.slice(0, 3),
    mainCharacters: charObjects.slice(0, 4),
    malUrlOrImdbUrl: mediaVal.siteUrl || `https://myanimelist.net/search/all?q=${encodeURIComponent(title)}`,
    criticReviewSummary: `An absolute essential in the ${mediaType} landscape. Community members rate it a solid ${mediaVal.averageScore || '75'}/100, highly praising its structural pacing, visual choreography or artistry, and character growth.`,
    funFacts: [
      `Aired/Published originally in Japan starting around the year ${mediaVal.seasonYear || 'N/A'}.`,
      `Consistently ranked among the top trending works on global Otaku databases including AniList and MyAnimeList.`,
      `Features high-quality artwork, emotional story loops, and stellar character designs.`
    ],
    recommendedSimilars: similars.slice(0, 2)
  };
}

// --- AI-POWERED MEDIA SEARCH (UNIFIED CATALOG) ---
app.post("/api/search", async (req, res) => {
  const { query, mediaType } = req.body;
  if (!query || query.trim().length === 0) {
    return res.json([]);
  }

  try {
    if (mediaType === "anime") {
      const anilistResults = await searchAniList(query, "ANIME");
      return res.json(anilistResults);
    } else if (mediaType === "manga") {
      const anilistResults = await searchAniList(query, "MANGA");
      return res.json(anilistResults);
    } else if (mediaType === "movie" || mediaType === "tv") {
      const westernResults = await searchGeminiWestern(query, mediaType);
      return res.json(westernResults);
    } else {
      // Both in parallel!
      const [anilistResults, westernResults] = await Promise.all([
        searchAniList(query),
        searchGeminiWestern(query)
      ]);
      return res.json([...anilistResults, ...westernResults]);
    }
  } catch (err: any) {
    console.error("Unified search route error:", err);
    return res.json(getOfflineSearch(query, mediaType));
  }
});

// --- AI RECOMMENDATION ENGINE ---
app.post("/api/gemini/recommendations", async (req, res) => {
  const { watchlist } = req.body; // Array of current watchlist entries

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || !watchlist || watchlist.length === 0) {
    return res.json(getOfflineRecommendations());
  }

  try {
    const ai = getGemini();
    const watchlistStr = watchlist.map((item: any) => `${item.title} (${item.mediaType}, Status: ${item.status}, Rating: ${item.rating || 'N/A'})`).join(", ");

    const promptMessage = `Based on the user's current watchlist: [ ${watchlistStr} ], provide 4 curated, highly intelligent recommendations for what they should watch or read next. Include a mixture of media types (e.g. if they read manga, suggest a movie, or a related anime, or vice-versa to simulate unified cross-platform recommendations).
Give a specific "why" rationale for why this item fits their specific interests. Output precisely matching the JSON schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptMessage,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              mediaId: { type: Type.STRING },
              title: { type: Type.STRING },
              mediaType: { type: Type.STRING, description: "Must be 'anime', 'manga', 'movie', or 'tv'" },
              coverImage: { type: Type.STRING, description: "A high quality placeholder image URL (use: https://placehold.co/300x450/0f172a/3b82f6?text=TITLE)" },
              description: { type: Type.STRING, description: "Quick description" },
              genres: { type: Type.ARRAY, items: { type: Type.STRING } },
              rationale: { type: Type.STRING, description: "Thematic, intelligent explanation of why this matches their watchlist" },
              totalUnits: { type: Type.INTEGER },
              year: { type: Type.INTEGER }
            },
            required: ["mediaId", "title", "mediaType", "coverImage", "description", "genres", "rationale", "totalUnits", "year"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "[]");

    // Enrich anime/manga recommendations with actual high-quality AniList images!
    const enriched = await Promise.all(
      parsed.map(async (item: any) => {
        if (item.mediaType === "anime" || item.mediaType === "manga") {
          try {
            const results = await searchAniList(item.title, item.mediaType === "manga" ? "MANGA" : "ANIME");
            if (results && results.length > 0) {
              return {
                ...item,
                mediaId: results[0].mediaId,
                coverImage: results[0].coverImage, // Real high-quality image!
                totalUnits: results[0].totalUnits || item.totalUnits,
                year: results[0].year || item.year,
              };
            }
          } catch (e) {
            console.warn("Could not enrich recommendation cover image:", e);
          }
        }
        return item;
      })
    );

    res.json(enriched);

  } catch (err) {
    console.error("AI Recommendations error:", err);
    res.json(getOfflineRecommendations());
  }
});

// --- AI-POWERED DETAILED MEDIA RETRIEVER ---
app.post("/api/media/details", async (req, res) => {
  const { mediaId, title, mediaType } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  // Intercept Anime & Manga for 100% accurate, live official casting and facts!
  if (mediaType === "anime" || mediaType === "manga") {
    try {
      const details = await getAniListDetails(mediaId, title, mediaType);
      return res.json(details);
    } catch (anilistErr) {
      console.warn("AniList direct details fetch fell back to Gemini:", anilistErr);
      // Fallback to Gemini if AniList fails or ID is mismatch
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.json(getOfflineDetails(title, mediaType, mediaId));
  }

  try {
    const ai = getGemini();
    const promptMessage = `Provide extremely detailed information and high-quality breakdown for the following media item:
Title: "${title}"
Media Type: "${mediaType}" (movie or tv)

You must include real facts:
1. A catchy tagline that represents the work.
2. A very deep, multi-paragraph full synopsis describing themes, story beginnings, and appeal.
3. Official age rating (e.g. PG-13, R, G, PG).
4. Major production studios (e.g. Warner Bros, HBO, Universal).
5. Main directors or creators.
6. A list of 4 key characters with their roles and voice/cast actors.
7. A plausible direct URL to IMDb (e.g. "https://www.imdb.com/...").
8. A summary of what critics/communities usually highlight as praise or critique.
9. Three interesting minor fun facts, trivia or Easter eggs.
10. Two similar shows/movies recommended for fans of this.

Output precisely according to the required responseSchema JSON structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptMessage,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mediaId: { type: Type.STRING },
            title: { type: Type.STRING },
            mediaType: { type: Type.STRING },
            tagline: { type: Type.STRING },
            fullSynopsis: { type: Type.STRING },
            ageRating: { type: Type.STRING },
            studios: { type: Type.ARRAY, items: { type: Type.STRING } },
            directors: { type: Type.ARRAY, items: { type: Type.STRING } },
            mainCharacters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  voiceActor: { type: Type.STRING, description: "Cast actor" }
                },
                required: ["name", "role", "voiceActor"]
              }
            },
            malUrlOrImdbUrl: { type: Type.STRING },
            criticReviewSummary: { type: Type.STRING },
            funFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedSimilars: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  mediaType: { type: Type.STRING, description: "Must be 'movie', 'tv', 'anime', or 'manga'" },
                  mediaId: { type: Type.STRING, description: "A unique slug ID or alphanumeric string" }
                },
                required: ["title", "description", "mediaType", "mediaId"]
              }
            }
          },
          required: [
            "mediaId",
            "title",
            "mediaType",
            "tagline",
            "fullSynopsis",
            "ageRating",
            "studios",
            "directors",
            "mainCharacters",
            "malUrlOrImdbUrl",
            "criticReviewSummary",
            "funFacts",
            "recommendedSimilars"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({
      ...parsed,
      mediaId: parsed.mediaId || mediaId,
      title: parsed.title || title,
      mediaType: parsed.mediaType || mediaType
    });

  } catch (err) {
    console.error("Gemini Details Error:", err);
    res.json(getOfflineDetails(title, mediaType, mediaId));
  }
});

function getOfflineDetails(title: string, mediaType: string, mediaId: string) {
  const isOtaku = mediaType === "anime" || mediaType === "manga";
  const url = isOtaku 
    ? `https://myanimelist.net/search/all?q=${encodeURIComponent(title)}`
    : `https://www.imdb.com/find?q=${encodeURIComponent(title)}`;

  return {
    mediaId: mediaId || "unknown",
    title: title,
    mediaType: mediaType || "anime",
    tagline: `An incredible ${mediaType} experience that captivates audiences worldwide.`,
    fullSynopsis: `"${title}" is a highly acclaimed, masterfully written and directed production. It features deep character development, marvelous pacing, and a breathtaking creative view that leaves a lasting impression on viewers. Its status as an industry-shaping icon is well-deserved, with millions of fans discussing theories, tracking release schedules, and reviewing its emotional depth.`,
    ageRating: isOtaku ? "PG-13 (Teens 13 or older)" : "PG-13 / TV-14",
    studios: isOtaku ? ["Production I.G", "Madhouse"] : ["Universal Pictures", "HBO Entertainment"],
    directors: isOtaku ? ["Hayao Miyazaki"] : ["Christopher Nolan"],
    mainCharacters: [
      { name: "Main Protagonist", role: "Lead Character", voiceActor: "Hiroshi Kamiya / Matthew Mercer" },
      { name: "Supporting Mentor", role: "Key Ally", voiceActor: "Megumi Ogata / Troy Baker" },
      { name: "Rival Character", role: "Conflict/Foil", voiceActor: "Mamoru Miyano / Yuri Lowenthal" },
      { name: "Comic Relief Friend", role: "Secondary", voiceActor: "Natsuki Hanae / Todd Haberkorn" }
    ],
    malUrlOrImdbUrl: url,
    criticReviewSummary: `Critics laud "${title}" for its stellar production values, outstanding soundtrack, and complex narrative architecture. It scores high marks worldwide for narrative cohesion, though some note it demands close attention to follow all underlying thematic threads.`,
    funFacts: [
      `The creator of "${title}" drew heavy inspiration from classic mythology and literary masterpieces.`,
      `Initial drafts featured a completely different resolution for the main characters before editing feedback.`,
      `A team of over 200 artists worked for more than 18 months to bring the major high-stakes scenes of this sequence to life.`
    ],
    recommendedSimilars: [
      { 
        title: isOtaku ? "Death Note" : "Interstellar", 
        description: "A high-stakes thriller filled with logical mind games and incredibly high stakes tension.",
        mediaType: isOtaku ? "anime" : "movie",
        mediaId: isOtaku ? "1535" : "interstellar"
      },
      { 
        title: isOtaku ? "Frieren: Beyond Journey's End" : "Breaking Bad", 
        description: "A beautifully paced story dealing with consequences, friendship, and spectacular character growth.",
        mediaType: isOtaku ? "anime" : "tv",
        mediaId: isOtaku ? "154587" : "breaking-bad"
      }
    ]
  };
}

// --- OFFLINE/FALLBACK DATASETS ---
function getOfflineSearch(query: string, type?: string) {
  const norm = query.toLowerCase();
  const sampleData = [
    {
      mediaId: "one-piece",
      title: "One Piece",
      mediaType: "manga",
      coverImage: "https://placehold.co/300x450/1e293b/3b82f6?text=One+Piece",
      description: "Follow Monkey D. Luffy and his swashbuckling crew in search of the legendary ultimate treasure, One Piece.",
      genres: ["Action", "Adventure", "Fantasy"],
      totalUnits: 1120,
      year: 1997,
      rating: 9.2
    },
    {
      mediaId: "frieren",
      title: "Frieren: Beyond Journey's End",
      mediaType: "anime",
      coverImage: "https://placehold.co/300x450/1e293b/10b981?text=Frieren",
      description: "An elf mage and her former party members' journeys after defeating the demon king. A study on life, time, and grief.",
      genres: ["Adventure", "Drama", "Fantasy"],
      totalUnits: 28,
      year: 2023,
      rating: 9.39
    },
    {
      mediaId: "breaking-bad",
      title: "Breaking Bad",
      mediaType: "tv",
      coverImage: "https://placehold.co/300x450/111827/eab308?text=Breaking+Bad",
      description: "A high school chemistry teacher diagnosed with terminal lung cancer turns to manufacturing and selling methamphetamine.",
      genres: ["Crime", "Drama", "Thriller"],
      totalUnits: 62,
      year: 2008,
      rating: 9.5
    },
    {
      mediaId: "interstellar",
      title: "Interstellar",
      mediaType: "movie",
      coverImage: "https://placehold.co/300x450/090d16/ec4899?text=Interstellar",
      description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      genres: ["Sci-Fi", "Drama", "Adventure"],
      totalUnits: 169,
      year: 2014,
      rating: 8.7
    },
    {
      mediaId: "chainsaw-man",
      title: "Chainsaw Man",
      mediaType: "manga",
      coverImage: "https://placehold.co/300x450/1e293b/f43f5e?text=Chainsaw+Man",
      description: "Denji has a simple dream—living a happy and peaceful life, spending time with a girl he likes. But he's forced to kill devils.",
      genres: ["Action", "Dark Fantasy", "Gore"],
      totalUnits: 165,
      year: 2018,
      rating: 8.8
    },
    {
      mediaId: "stranger-things",
      title: "Stranger Things",
      mediaType: "tv",
      coverImage: "https://placehold.co/300x450/111827/ef4444?text=Stranger+Things",
      description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
      genres: ["Drama", "Fantasy", "Horror"],
      totalUnits: 42,
      year: 2016,
      rating: 8.7
    }
  ];

  return sampleData.filter(item => {
    const matchesQuery = item.title.toLowerCase().includes(norm) || item.genres.some(g => g.toLowerCase().includes(norm));
    const matchesType = !type || item.mediaType === type;
    return matchesQuery && matchesType;
  });
}

function getOfflineRecommendations() {
  return [
    {
      mediaId: "monster",
      title: "Monster",
      mediaType: "manga",
      coverImage: "https://placehold.co/300x450/1e1e24/ea580c?text=Monster",
      description: "Dr. Kenzo Tenma is a brilliant wave-making neurosurgeon when he saves the life of a young boy instead of the town's mayor, shifting his career, only to discover the boy became a serial killer.",
      genres: ["Mystery", "Psychological", "Thriller"],
      rationale: "Because you like suspenseful thrillers with highly complex characters and profound psychological conflicts similar to top-tier Western dramas.",
      totalUnits: 162,
      year: 1994
    },
    {
      mediaId: "the-dark-knight",
      title: "The Dark Knight",
      mediaType: "movie",
      coverImage: "https://placehold.co/300x450/090d16/1e293b?text=The+Dark+Knight",
      description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability.",
      genres: ["Action", "Crime", "Drama"],
      rationale: "Matches your liking for grand physical action paired with intense, dark philosophical anti-heroes. Recommended cross-platform companion to Chainsaw Man and Breaking Bad.",
      totalUnits: 152,
      year: 2008
    },
    {
      mediaId: "cyberpunk-edgerunners",
      title: "Cyberpunk: Edgerunners",
      mediaType: "anime",
      coverImage: "https://placehold.co/300x450/020617/fbbf24?text=Edgerunners",
      description: "A street kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an edgerunner.",
      genres: ["Sci-Fi", "Action", "Cyberpunk"],
      rationale: "Aligns with your interest in high-stakes neon sci-fi aesthetics and fast-paced narratives.",
      totalUnits: 10,
      year: 2022
    },
    {
      mediaId: "attack-on-titan",
      title: "Attack on Titan",
      mediaType: "anime",
      coverImage: "https://placehold.co/300x450/1c1917/78716c?text=AoT",
      description: "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.",
      genres: ["Action", "Drama", "Survival"],
      rationale: "Fits your tracked interest in dark, complex storylines featuring massive worldbuilding, political conflicts, and life-or-death battles.",
      totalUnits: 87,
      year: 2013
    }
  ];
}

// --- INITIALIZE EXPRESS SERVER & VITE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Unified Media Tracker Running on http://localhost:${PORT}`);
  });
}

startServer();
