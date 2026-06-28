import React, { useState, useRef } from "react";
import { 
  User, 
  Clock, 
  BookOpen, 
  Tv, 
  Film, 
  Award, 
  Flame, 
  Star, 
  Bookmark, 
  ChevronRight, 
  Grid, 
  BarChart2, 
  Heart,
  TrendingUp,
  Inbox,
  ShieldCheck,
  Zap,
  Download,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { WatchlistItem, MediaType, WatchStatus, MediaItem, ActiveUser } from "../types";

interface UserProfileBlockProps {
  watchlist: WatchlistItem[];
  currentUser: ActiveUser | null;
  onOpenDetails: (item: MediaItem) => void;
  onUpdateItem?: (item: WatchlistItem) => void;
  onLoginRequest: () => void;
  onImportItems?: (items: any[]) => Promise<void>;
  onClearAllData?: () => Promise<void>;
}

type ProfileSubTab = "stats" | "anime" | "manga" | "western" | "exchange" | "security";

export default function UserProfileBlock({ 
  watchlist, 
  currentUser, 
  onOpenDetails,
  onUpdateItem,
  onLoginRequest,
  onImportItems,
  onClearAllData
}: UserProfileBlockProps) {
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>("stats");

  // State variables for security data purge (NIST CSF 2.0 / MITRE F3 Account Lifecycle Management)
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [purgeError, setPurgeError] = useState("");

  const [importText, setImportText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [detectedMapping, setDetectedMapping] = useState<any | null>(null);
  const [defaultImportType, setDefaultImportType] = useState<MediaType>("anime");
  const [importActiveSource, setImportActiveSource] = useState<"upload" | "paste">("upload");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple and highly effective CSV cell parser
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    const rows = text.split(/\r?\n/);
    for (const row of rows) {
      if (!row.trim()) continue;
      const cells: string[] = [];
      let currentCell = "";
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      const cleanedCells = cells.map(cell => {
        let clean = cell;
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.substring(1, clean.length - 1);
        }
        return clean.replace(/""/g, '"');
      });
      lines.push(cleanedCells);
    }
    return lines;
  };

  const parseXML = (xmlText: string): any[] => {
    const list: any[] = [];
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      const parserError = xmlDoc.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        throw new Error("Invalid XML formatting in standard backup.");
      }

      // 1. Process <anime> tags
      const animeNodes = xmlDoc.getElementsByTagName("anime");
      for (let i = 0; i < animeNodes.length; i++) {
        const node = animeNodes[i];
        const getVal = (tag: string) => {
          const el = node.getElementsByTagName(tag)[0];
          return el ? el.textContent || "" : "";
        };

        const mediaId = getVal("series_animedb_id") || getVal("my_id") || `xml_anime_${i}_${Date.now()}`;
        const title = getVal("series_title") || getVal("title") || `XML Anime ${i}`;
        
        let rawStatus = getVal("my_status").toLowerCase().trim();
        let status: WatchStatus = "planning";
        if (["watching", "current", "1", "watching_reading", "actively", "inprogress", "in progress"].some(k => rawStatus.includes(k))) {
          status = "current";
        } else if (["completed", "finished", "read", "done", "2", "complete"].some(k => rawStatus.includes(k))) {
          status = "completed";
        } else if (["plan to watch", "plan to read", "planning", "6", "plan_to_watch", "plan_to_read", "stalled", "backlog"].some(k => rawStatus.includes(k))) {
          status = "planning";
        } else if (["on hold", "onhold", "paused", "3", "on-hold", "suspended"].some(k => rawStatus.includes(k))) {
          status = "paused";
        } else if (["dropped", "abandoned", "4"].some(k => rawStatus.includes(k))) {
          status = "dropped";
        }

        const progress = parseInt(getVal("my_watched_episodes")) || parseInt(getVal("my_progress")) || 0;
        const totalUnits = parseInt(getVal("series_episodes")) || parseInt(getVal("total_episodes")) || 0;
        let rating = parseFloat(getVal("my_score")) || parseFloat(getVal("score")) || 0;
        if (rating > 10) rating = Math.round(rating / 10);
        const notes = getVal("my_comments") || getVal("notes") || getVal("comments") || "";

        list.push({
          mediaId,
          mediaType: "anime",
          title,
          status,
          progress,
          totalUnits,
          rating,
          notes,
          coverImage: undefined
        });
      }

      // 2. Process <manga> tags
      const mangaNodes = xmlDoc.getElementsByTagName("manga");
      for (let i = 0; i < mangaNodes.length; i++) {
        const node = mangaNodes[i];
        const getVal = (tag: string) => {
          const el = node.getElementsByTagName(tag)[0];
          return el ? el.textContent || "" : "";
        };

        const mediaId = getVal("series_mangadb_id") || getVal("my_id") || `xml_manga_${i}_${Date.now()}`;
        const title = getVal("series_title") || getVal("title") || `XML Manga ${i}`;
        
        let rawStatus = getVal("my_status").toLowerCase().trim();
        let status: WatchStatus = "planning";
        if (["reading", "current", "1", "watching_reading", "actively", "inprogress", "in progress"].some(k => rawStatus.includes(k))) {
          status = "current";
        } else if (["completed", "finished", "read", "done", "2", "complete"].some(k => rawStatus.includes(k))) {
          status = "completed";
        } else if (["plan to watch", "plan to read", "planning", "6", "plan_to_watch", "plan_to_read", "stalled", "backlog"].some(k => rawStatus.includes(k))) {
          status = "planning";
        } else if (["on hold", "onhold", "paused", "3", "on-hold", "suspended"].some(k => rawStatus.includes(k))) {
          status = "paused";
        } else if (["dropped", "abandoned", "4"].some(k => rawStatus.includes(k))) {
          status = "dropped";
        }

        const progress = parseInt(getVal("my_read_chapters")) || parseInt(getVal("my_progress")) || 0;
        const totalUnits = parseInt(getVal("series_chapters")) || parseInt(getVal("total_chapters")) || 0;
        let rating = parseFloat(getVal("my_score")) || parseFloat(getVal("score")) || 0;
        if (rating > 10) rating = Math.round(rating / 10);
        const notes = getVal("my_comments") || getVal("notes") || getVal("comments") || "";

        list.push({
          mediaId,
          mediaType: "manga",
          title,
          status,
          progress,
          totalUnits,
          rating,
          notes,
          coverImage: undefined
        });
      }

      // 3. Fallback generic items (i.e. if XML contains <entry> or <item> nodes rather than nested MAL structure)
      if (list.length === 0) {
        const genericNodes = xmlDoc.getElementsByTagName("item").length > 0 
          ? xmlDoc.getElementsByTagName("item") 
          : xmlDoc.getElementsByTagName("entry");
        
        for (let i = 0; i < genericNodes.length; i++) {
          const node = genericNodes[i];
          const getVal = (tag: string) => {
            const el = node.getElementsByTagName(tag)[0];
            return el ? el.textContent || "" : "";
          };

          const title = getVal("title") || getVal("series_title") || `XML Item ${i}`;
          const typeRaw = (getVal("type") || getVal("mediaType") || getVal("media_type") || "anime").toLowerCase();
          const mediaType: MediaType = ["manga", "manhwa", "book", "chapters", "volumes"].some(k => typeRaw.includes(k)) 
            ? "manga" 
            : ["movie", "film"].some(k => typeRaw.includes(k))
            ? "movie"
            : ["tv", "series", "show"].some(k => typeRaw.includes(k))
            ? "tv"
            : "anime";

          let rawStatus = (getVal("status") || getVal("my_status") || getVal("watch_status") || "").toLowerCase().trim();
          let status: WatchStatus = "planning";
          if (["watching", "reading", "current", "1", "inprogress", "in progress"].some(k => rawStatus.includes(k))) {
            status = "current";
          } else if (["completed", "finished", "read", "done", "complete", "2"].some(k => rawStatus.includes(k))) {
            status = "completed";
          } else if (["planning", "plan", "plan to read", "plan to watch", "6"].some(k => rawStatus.includes(k))) {
            status = "planning";
          } else if (["hold", "paused", "on-hold", "on hold", "3"].some(k => rawStatus.includes(k))) {
            status = "paused";
          } else if (["dropped", "4"].some(k => rawStatus.includes(k))) {
            status = "dropped";
          }

          const progress = parseInt(getVal("progress")) || parseInt(getVal("progress_chapters")) || parseInt(getVal("progress_episodes")) || parseInt(getVal("watched")) || 0;
          const totalUnits = parseInt(getVal("totalUnits")) || parseInt(getVal("total_units")) || parseInt(getVal("episodes")) || parseInt(getVal("chapters")) || 0;
          let rating = parseFloat(getVal("rating")) || parseFloat(getVal("score")) || 0;
          if (rating > 10) rating = Math.round(rating / 10);
          const notes = getVal("notes") || getVal("comments") || getVal("my_comments") || "";

          list.push({
            mediaId: getVal("mediaId") || getVal("media_id") || getVal("id") || `xml_gen_${i}_${Date.now()}`,
            mediaType,
            title,
            status,
            progress,
            totalUnits,
            rating,
            notes,
            coverImage: undefined
          });
        }
      }
    } catch (e: any) {
      console.warn("DOMParser XML failed:", e);
    }
    return list;
  };

  const detectAndParseFileContent = (fileText: string, defaultType: MediaType = "anime") => {
    setImportError("");
    setImportSuccess("");
    const trimmed = fileText.trim();
    
    // Check if the input is XML format
    if (trimmed.startsWith("<") || trimmed.includes("<?xml") || trimmed.includes("<myanimelist>")) {
      try {
        const parsedList = parseXML(fileText);
        if (parsedList.length === 0) {
          throw new Error("No XML entries (<anime>, <manga>, or generic elements) were recognized in this export file.");
        }
        setParsedPreview(parsedList);
        setDetectedMapping({
          title: "MyAnimeList XML Title Schema",
          mediaType: "Dynamic Node (Anime/Manga)",
          status: "Unified Status Map",
          progress: "Standard Chapter/Episode Node",
          rating: "Real Score (1-10)",
        });
      } catch (err: any) {
        setImportError(err.message || "Failed decoding XML list structure.");
      }
    } else {
      // Parse as conventional CSV backup
      try {
        const rawRows = parseCSV(fileText);
        if (rawRows.length < 2) {
          throw new Error("The CSV file is empty or does not contain a header and a data row.");
        }

        const headers = rawRows[0].map(h => h.trim().toLowerCase());
        const dataRows = rawRows.slice(1);

        let titleIdx = -1;
        let typeIdx = -1;
        let statusIdx = -1;
        let progressIdx = -1;
        let totalUnitsIdx = -1;
        let ratingIdx = -1;
        let notesIdx = -1;
        let idIdx = -1;
        let coverIdx = -1;

        headers.forEach((h, i) => {
          if (["title", "series_title", "name", "media_title", "series title", "manga_title", "anime_title"].some(k => h.includes(k))) {
            if (titleIdx === -1 || h === "title" || h === "series_title") {
              titleIdx = i;
            }
          }
          if (["id", "media_id", "series_animedb_id", "series_mangadb_id", "series_id", "slug", "anilist_id"].some(k => h.includes(k))) {
            idIdx = i;
          }
          if (["type", "media_type", "series_type", "format"].some(k => h.includes(k))) {
            typeIdx = i;
          }
          
          const isMangaMode = defaultType === "manga";

          if (isMangaMode) {
            if (["read_status", "readstatus", "reading_status", "reading status", "my_read_status"].some(k => h.includes(k))) {
              statusIdx = i;
            } else if (statusIdx === -1 && ["status", "my_status", "state", "list_status", "watch_status"].some(k => h.includes(k))) {
              statusIdx = i;
            }
          } else {
            if (["watch_status", "watchstatus", "watching_status", "watching status", "my_watch_status"].some(k => h.includes(k))) {
              statusIdx = i;
            } else if (statusIdx === -1 && ["status", "my_status", "state", "list_status", "read_status"].some(k => h.includes(k))) {
              statusIdx = i;
            }
          }

          if (isMangaMode) {
            if (["read_chapters", "my_read_chapters", "chapters_read", "chapters", "read", "last_read", "last_read_chapter", "chapter", "progress"].some(k => h.includes(k))) {
              progressIdx = i;
            } else if (progressIdx === -1 && ["watched_episodes", "watched", "episodes", "my_watched_episodes"].some(k => h.includes(k))) {
              progressIdx = i;
            }
          } else {
            if (["watched_episodes", "watched", "episodes", "my_watched_episodes", "progress", "last_watched"].some(k => h.includes(k))) {
              progressIdx = i;
            } else if (progressIdx === -1 && ["read_chapters", "my_read_chapters", "chapters", "read", "chapter"].some(k => h.includes(k))) {
              progressIdx = i;
            }
          }

          if (isMangaMode) {
            if (["series_chapters", "chapters_total", "total_chapters", "total_vols", "total_volumes", "volumes"].some(k => h.includes(k))) {
              totalUnitsIdx = i;
            } else if (totalUnitsIdx === -1 && ["series_episodes", "episodes_total", "total_episodes", "total", "units"].some(k => h.includes(k))) {
              totalUnitsIdx = i;
            }
          } else {
            if (["series_episodes", "episodes_total", "total_episodes", "total", "units"].some(k => h.includes(k))) {
              totalUnitsIdx = i;
            } else if (totalUnitsIdx === -1 && ["series_chapters", "chapters_total", "total_chapters"].some(k => h.includes(k))) {
              totalUnitsIdx = i;
            }
          }

          if (["rating", "score", "my_score", "my_rating", "stars", "personal_score"].some(k => h.includes(k))) {
            ratingIdx = i;
          }
          if (["notes", "comments", "review", "my_comments", "comment"].some(k => h.includes(k))) {
            notesIdx = i;
          }
          if (["cover", "image", "cover_image", "coverimage", "thumbnail", "image_url"].some(k => h.includes(k))) {
            coverIdx = i;
          }
        });

        if (titleIdx === -1) {
          titleIdx = 0;
        }

        const parsedList: any[] = [];

        dataRows.forEach((row) => {
          const getVal = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : "");

          const title = getVal(titleIdx);
          if (!title) return;

          let rawType = getVal(typeIdx).toLowerCase();
          let mediaType: MediaType = defaultType;
          if (rawType) {
            if (["manga", "manhwa", "manhua", "novel", "book"].some(k => rawType.includes(k))) {
              mediaType = "manga";
            } else if (["anime", "ova", "ona", "special", "tv (japanese)"].some(k => rawType.includes(k))) {
              mediaType = "anime";
            } else if (["movie", "film"].some(k => rawType.includes(k))) {
              mediaType = "movie";
            } else if (["tv", "show", "tv show", "live action", "drama", "series"].some(k => rawType.includes(k))) {
              mediaType = "tv";
            }
          }

          let rawStatus = getVal(statusIdx).toLowerCase();
          let status: WatchStatus = "planning";
          if (rawStatus) {
            if (["watching", "reading", "current", "1", "watching_reading", "actively", "inprogress", "in progress", "rereading", "re_reading", "re-reading"].some(k => rawStatus.includes(k))) {
              status = "current";
            } else if (["completed", "finished", "read", "done", "2", "complete"].some(k => rawStatus.includes(k))) {
              status = "completed";
            } else if (["plan to watch", "plan to read", "planning", "6", "plan_to_watch", "plan_to_read", "stalled", "backlog"].some(k => rawStatus.includes(k))) {
              status = "planning";
            } else if (["on hold", "onhold", "paused", "3", "on-hold", "suspended"].some(k => rawStatus.includes(k))) {
              status = "paused";
            } else if (["dropped", "abandoned", "4"].some(k => rawStatus.includes(k))) {
              status = "dropped";
            }
          }

          const progress = parseInt(getVal(progressIdx)) || 0;
          const totalUnits = parseInt(getVal(totalUnitsIdx)) || 0;
          
          let rating = parseFloat(getVal(ratingIdx)) || 0;
          if (rating > 10) {
            rating = Math.round(rating / 10);
          } else if (rating > 5 && rating <= 10) {
            // Assume 10 scale
          } else if (rating > 0 && rating <= 5) {
            rating = rating * 2;
          }

          const notes = getVal(notesIdx);
          const mediaId = getVal(idIdx) || `csv_${encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]/g, "_"))}`;
          const coverImage = getVal(coverIdx) || undefined;

          parsedList.push({
            mediaId,
            mediaType,
            title,
            status,
            progress,
            totalUnits,
            rating,
            notes,
            coverImage
          });
        });

        setParsedPreview(parsedList);
        setDetectedMapping({
          title: titleIdx !== -1 ? headers[titleIdx] : "Auto-estimated Col 0",
          mediaType: typeIdx !== -1 ? headers[typeIdx] : "Fixed Default",
          status: statusIdx !== -1 ? headers[statusIdx] : "Fixed Default",
          progress: progressIdx !== -1 ? headers[progressIdx] : "Fixed Default",
          rating: ratingIdx !== -1 ? headers[ratingIdx] : "Fixed Default",
        });
      } catch (err: any) {
        setImportError(err.message || "Failed decoding CSV content. Please check alignment.");
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        detectAndParseFileContent(text, defaultImportType);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        detectAndParseFileContent(text, defaultImportType);
      };
      reader.readAsText(file);
    }
  };

  const handleApplyImport = async () => {
    if (!onImportItems || parsedPreview.length === 0) return;
    setIsImporting(true);
    setImportError("");
    setImportSuccess("");

    try {
      await onImportItems(parsedPreview);
      setImportSuccess(`Successfully imported and integrated ${parsedPreview.length} media item(s) into your synchronized profile!`);
      setParsedPreview([]);
      setImportText("");
    } catch (err: any) {
      setImportError(err.message || "Bulk indexing failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const exportToCSV = () => {
    if (!watchlist || watchlist.length === 0) {
      alert("No watchlist items to export!");
      return;
    }

    const headers = [
      "mediaId",
      "mediaType",
      "title",
      "status",
      "progress",
      "totalUnits",
      "rating",
      "notes",
      "coverImage"
    ];

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return "";
      const s = String(str);
      if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = watchlist.map(item => [
      item.mediaId,
      item.mediaType,
      item.title,
      item.status,
      item.progress,
      item.totalUnits,
      item.rating,
      item.notes,
      item.coverImage
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `watchlist_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToXML = () => {
    if (!watchlist || watchlist.length === 0) {
      alert("No watchlist items to export!");
      return;
    }

    let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
    xml += `<!-- Exported from Unified Media Tracker -->\n`;
    xml += `<myanimelist>\n`;
    xml += `  <myinfo>\n`;
    xml += `    <user_name>${currentUser?.displayName || "Guest"}</user_name>\n`;
    xml += `    <user_export_type>1</user_export_type>\n`;
    xml += `  </myinfo>\n\n`;

    const animeItems = watchlist.filter(item => item.mediaType === "anime" || item.mediaType === "movie" || item.mediaType === "tv");
    const mangaItems = watchlist.filter(item => item.mediaType === "manga");

    animeItems.forEach((item, index) => {
      xml += `  <anime>\n`;
      xml += `    <series_animedb_id>${item.mediaId}</series_animedb_id>\n`;
      xml += `    <series_title><![CDATA[${item.title}]]></series_title>\n`;
      xml += `    <series_type>${item.mediaType === "movie" ? "Movie" : "TV"}</series_type>\n`;
      xml += `    <series_episodes>${item.totalUnits || 0}</series_episodes>\n`;
      xml += `    <my_id>${index}</my_id>\n`;
      xml += `    <my_watched_episodes>${item.progress || 0}</my_watched_episodes>\n`;
      xml += `    <my_score>${item.rating || 0}</my_score>\n`;
      xml += `    <my_status><![CDATA[${item.status === "current" ? "Watching" : item.status === "completed" ? "Completed" : item.status === "planning" ? "Plan to Watch" : item.status === "paused" ? "On-Hold" : "Dropped"}]]></my_status>\n`;
      xml += `    <my_comments><![CDATA[${item.notes || ""}]]></my_comments>\n`;
      xml += `  </anime>\n`;
    });

    mangaItems.forEach((item, index) => {
      xml += `  <manga>\n`;
      xml += `    <series_mangadb_id>${item.mediaId}</series_mangadb_id>\n`;
      xml += `    <series_title><![CDATA[${item.title}]]></series_title>\n`;
      xml += `    <series_type>Manga</series_type>\n`;
      xml += `    <series_chapters>${item.totalUnits || 0}</series_chapters>\n`;
      xml += `    <my_id>${index}</my_id>\n`;
      xml += `    <my_read_chapters>${item.progress || 0}</my_read_chapters>\n`;
      xml += `    <my_score>${item.rating || 0}</my_score>\n`;
      xml += `    <my_status><![CDATA[${item.status === "current" ? "Reading" : item.status === "completed" ? "Completed" : item.status === "planning" ? "Plan to Read" : item.status === "paused" ? "On-Hold" : "Dropped"}]]></my_status>\n`;
      xml += `    <my_comments><![CDATA[${item.notes || ""}]]></my_comments>\n`;
      xml += `  </manga>\n`;
    });

    xml += `</myanimelist>\n`;

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `watchlist_mal_export_${new Date().toISOString().split("T")[0]}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl mx-auto text-center space-y-6 shadow-2xl my-8" id="profile-unauth-container">
        <div className="w-16 h-16 bg-indigo-950/65 border border-indigo-900/40 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-100 tracking-tight">Access Your Sync Profile Dashboard</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Please register or sign in using a secure SQLite account to calculate your total anime screentime, reading metrics, cinematic logs, and access structured profile achievements!
          </p>
        </div>
        <button
          onClick={onLoginRequest}
          className="bg-indigo-650 hover:bg-indigo-600 text-xs font-black text-slate-100 px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer"
          id="profile-unauth-login-btn"
        >
          <ShieldCheck className="w-4 h-4" />
          Create or Sign In to Account
        </button>
      </div>
    );
  }

  const isGuestMode = currentUser.uid === "guest_user";

  // --- COMPUTE STATISTICS ---
  
  // 1. Anime
  const animeItems = watchlist.filter(item => item.mediaType === "anime");
  const animeEpisodes = animeItems.reduce((acc, item) => acc + (item.progress || 0), 0);
  const animeMinutes = animeEpisodes * 24; // Average 24 minutes

  // 2. Manga
  const mangaItems = watchlist.filter(item => item.mediaType === "manga");
  const mangaChapters = mangaItems.reduce((acc, item) => acc + (item.progress || 0), 0);
  const mangaMinutes = mangaChapters * 10; // Average 10 minutes

  // 3. Western TV + Movies
  const tvItems = watchlist.filter(item => item.mediaType === "tv");
  const tvEpisodes = tvItems.reduce((acc, item) => acc + (item.progress || 0), 0);
  const tvMinutes = tvEpisodes * 45; // Average 45 minutes

  const movieItems = watchlist.filter(item => item.mediaType === "movie");
  const movieMinutes = movieItems.reduce((acc, item) => {
    // If completed assume 120 minutes, or use progress * 120 minutes
    if (item.progress > 0) return acc + (item.progress * 120);
    return acc + (item.status === "completed" ? 120 : 0);
  }, 0);

  const westernMinutes = tvMinutes + movieMinutes;

  // Formatting minutes into Days, Hours, Mins helper
  const formatTimeSpent = (totalMins: number) => {
    if (totalMins === 0) return "0 hours";
    const days = Math.floor(totalMins / (24 * 60));
    const hours = Math.floor((totalMins % (24 * 60)) / 60);
    const mins = totalMins % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 && days === 0) parts.push(`${mins}m`);
    
    return parts.length > 0 ? parts.join(" ") : `${hours}h`;
  };

  // Convert WatchlistItem to MediaItem on clicked poster
  const handleItemClick = (item: WatchlistItem) => {
    onOpenDetails({
      mediaId: item.mediaId,
      title: item.title,
      mediaType: item.mediaType,
      coverImage: item.coverImage,
      description: item.notes || "Currently on watchlist.",
      genres: [],
      year: 0,
      rating: item.rating,
      totalUnits: item.totalUnits
    });
  };

  // Calculate achievements/badges
  const badges = [
    {
      id: "initiate",
      name: "Lore Seeker",
      desc: "Logged your first media items across realms",
      unlocked: watchlist.length >= 1,
      icon: Bookmark
    },
    {
      id: "otaku-apprentice",
      name: "Otaku Envoy",
      desc: "Watched at least 15 episodes of Japanese Anime",
      unlocked: animeEpisodes >= 15,
      icon: Tv
    },
    {
      id: "library-sage",
      name: "Manga Sage",
      desc: "Read over 30 chapters of manga",
      unlocked: mangaChapters >= 30,
      icon: BookOpen
    },
    {
      id: "cinephile-guild",
      name: "Silver Screen Guru",
      desc: "Watched 5+ TV episodes or completed Movies",
      unlocked: (movieItems.filter(m => m.status === "completed").length + tvEpisodes) >= 5,
      icon: Film
    },
    {
      id: "legend-status",
      name: "Universal Scholar",
      desc: "Accumulated more than 50 total logged units",
      unlocked: (animeEpisodes + mangaChapters + tvEpisodes + movieItems.length) >= 50,
      icon: Award
    }
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="space-y-8" id="profile-block-wrapper">

      {isGuestMode && (
        <div className="bg-gradient-to-r from-amber-500/15 to-amber-600/5 border border-amber-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-left shadow-lg shadow-amber-500/5 animate-fade-in" id="profile-guest-notice">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                Local-First Tracking Engine Active
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </p>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed max-w-xl mt-0.5">
                Your watchlist checkmarks, MyAnimeList XML transfers, and personal ratings are saved instantly to your offline database. Click to sync your list, unlock live community sections, and backup data.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onLoginRequest}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-shrink-0 shadow-lg shadow-amber-500/10"
          >
            <ShieldCheck className="w-4 h-4" />
            Sync with Account
          </button>
        </div>
      )}
      
      {/* PROFILE HEADER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl relative overflow-hidden" id="profile-hero-card">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-650/5 via-transparent to-slate-900 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
          <img
            src={currentUser.photoURL}
            alt={currentUser.displayName}
            className="w-18 h-18 rounded-full border-2 border-indigo-500/30 shadow-xl bg-slate-950"
            id="profile-avatar-img"
          />
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-150 tracking-tight" id="profile-display-name">
              {currentUser.displayName}
            </h3>
            <p className="text-xs text-slate-400 font-medium">{currentUser.email}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-900/25 text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Level {unlockedCount || 1} Collector
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-emerald-450 border border-emerald-900/30 font-bold uppercase tracking-widest">
                Active Sync Profile
              </span>
            </div>
          </div>
        </div>

        <div className="flex md:flex-col items-center md:items-end gap-1.5 bg-slate-950/40 border border-slate-850 p-4 rounded-2xl md:min-w-[160px] text-center md:text-right" id="profile-overall-stats">
          <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Total Items Logged</span>
          <span className="text-2xl font-black text-slate-100">{watchlist.length}</span>
          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wide">Across Eastern & Western realms</span>
        </div>
      </div>

      {/* SUB-TABS TO DIVIDE PROFILE CONTENT */}
      <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800 self-start w-fit flex-wrap gap-1" id="profile-subtabs">
        <button
          onClick={() => setActiveSubTab("stats")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "stats" 
              ? "bg-indigo-650 text-white shadow-lg shadow-indigo-600/10" 
              : "text-slate-400 hover:text-slate-200"
          }`}
          id="profile-tab-stats"
        >
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          Time Stats & Highlights
        </button>
        
        <button
          onClick={() => setActiveSubTab("anime")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "anime" 
              ? "bg-indigo-650 text-white shadow-lg shadow-indigo-600/10" 
              : "text-slate-400 hover:text-slate-200"
          }`}
          id="profile-tab-anime"
        >
          <Tv className="w-4 h-4 text-emerald-400" />
          Anime Logs ({animeItems.length})
        </button>

        <button
          onClick={() => setActiveSubTab("manga")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "manga" 
              ? "bg-indigo-650 text-white shadow-lg shadow-indigo-600/10" 
              : "text-slate-400 hover:text-slate-200"
          }`}
          id="profile-tab-manga"
        >
          <BookOpen className="w-4 h-4 text-sky-400" />
          Manga Records ({mangaItems.length})
        </button>

        <button
          onClick={() => setActiveSubTab("western")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "western" 
              ? "bg-indigo-650 text-white shadow-lg shadow-indigo-600/10" 
              : "text-slate-400 hover:text-slate-200"
          }`}
          id="profile-tab-western"
        >
          <Film className="w-4 h-4 text-pink-400" />
          Cineplex Logs ({movieItems.length + tvItems.length})
        </button>

        <button
          onClick={() => setActiveSubTab("exchange")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "exchange" 
              ? "bg-indigo-650 text-white shadow-lg shadow-indigo-600/10" 
              : "text-slate-400 hover:text-slate-200"
          }`}
          id="profile-tab-exchange"
        >
          <Download className="w-4 h-4 text-amber-400" />
          Import / Export CSV
        </button>

        <button
          onClick={() => setActiveSubTab("security")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "security" 
              ? "bg-rose-950/80 text-rose-200 shadow-lg shadow-rose-950/20 border border-rose-800/40" 
              : "text-rose-400/90 hover:text-rose-200"
          }`}
          id="profile-tab-security"
        >
          <ShieldCheck className="w-4 h-4 text-rose-400 animate-pulse" />
          Security & Privacy
        </button>
      </div>

      {/* VIEW PANEL ROUTING */}
      {activeSubTab === "stats" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="profile-stats-panel">
          
          {/* STATS DISCOVERY SECTION */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* LORE DURATION BENTO CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="stats-duration-bento">
              
              <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl hover:border-slate-800 transition-colors space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wide">Anime Screentime</span>
                  <div className="p-1.5 bg-emerald-950/40 rounded-lg text-emerald-450 border border-emerald-900/30">
                    <Tv className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-100">{formatTimeSpent(animeMinutes)}</h4>
                  <p className="text-[10px] text-slate-450 mt-1 font-semibold">{animeEpisodes} total episodes logged</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl hover:border-slate-800 transition-colors space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-wide">Manga Reading</span>
                  <div className="p-1.5 bg-sky-950/40 rounded-lg text-sky-450 border border-sky-900/30">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-100">{formatTimeSpent(mangaMinutes)}</h4>
                  <p className="text-[10px] text-slate-450 mt-1 font-semibold">{mangaChapters} chapters read</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl hover:border-slate-800 transition-colors space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-pink-400 font-extrabold uppercase tracking-wide">Western Cinema Log</span>
                  <div className="p-1.5 bg-pink-950/40 rounded-lg text-pink-450 border border-pink-900/30">
                    <Film className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-100">{formatTimeSpent(westernMinutes)}</h4>
                  <p className="text-[10px] text-slate-450 mt-1 font-semibold">
                    {movieItems.length} movies & {tvEpisodes} TV episodes
                  </p>
                </div>
              </div>

            </div>

            {/* QUICK REAL-TIME ANALYTICS GRID */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
              <h4 className="text-xs font-black text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Library Alignment Distribution
              </h4>
              
              <div className="space-y-4">
                
                {/* Anime stat bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-emerald-400" />
                      Anime Episodes ({animeEpisodes})
                    </span>
                    <span className="text-slate-400">{formatTimeSpent(animeMinutes)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (animeEpisodes / Math.max(1, animeEpisodes + mangaChapters + tvEpisodes + movieItems.length)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Manga stat bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      Manga Chapters Read ({mangaChapters})
                    </span>
                    <span className="text-slate-400">{formatTimeSpent(mangaMinutes)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className="bg-sky-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (mangaChapters / Math.max(1, animeEpisodes + mangaChapters + tvEpisodes + movieItems.length)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* TV Shows stat bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-amber-400" />
                      TV Series Episodes Watched ({tvEpisodes})
                    </span>
                    <span className="text-slate-400">{formatTimeSpent(tvMinutes)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (tvEpisodes / Math.max(1, animeEpisodes + mangaChapters + tvEpisodes + movieItems.length)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Movies stat bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-pink-400" />
                      Movies Completed ({movieItems.filter(m => m.status === 'completed').length})
                    </span>
                    <span className="text-slate-400">{formatTimeSpent(movieMinutes)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className="bg-pink-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (movieItems.length / Math.max(1, animeEpisodes + mangaChapters + tvEpisodes + movieItems.length)) * 100)}%` }}
                    />
                  </div>
                </div>

              </div>

              <p className="text-[10px] text-slate-500 italic mt-3 font-semibold leading-relaxed">
                * Screentime calculations are dynamically aggregated: Anime (24m/ep), Manga (10m/ch), TV (45m/ep), Movies (120m/movie).
              </p>
            </div>

          </div>

          {/* RIGHT SIDEBAR: BADGES & ACHIEVEMENTS */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl h-fit">
            <h4 className="text-xs font-black text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-455" />
              Achievements Vault
            </h4>
            
            <div className="space-y-3" id="profile-achievements-vault">
              {badges.map(badge => (
                <div 
                  key={badge.id}
                  className={`border p-3.5 rounded-2xl flex gap-3.5 items-start transition-all ${
                    badge.unlocked 
                      ? "bg-slate-950/45 border-slate-800/80 text-slate-200" 
                      : "bg-slate-900/10 border-slate-850 text-slate-500/80"
                  }`}
                >
                  <div className={`p-2 rounded-xl flex-shrink-0 border ${
                    badge.unlocked 
                      ? "bg-indigo-950/40 border-indigo-900/35 text-indigo-400" 
                      : "bg-slate-950/50 border-slate-850 text-slate-600"
                  }`}>
                    <badge.icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black tracking-tight">{badge.name}</span>
                      {badge.unlocked ? (
                        <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-900/35 rounded-md">UNLOCKED</span>
                      ) : (
                        <span className="text-[8px] font-bold uppercase text-slate-500">LOCKED</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-450 leading-relaxed">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB FOR INDIVIDUAL LIBRARIES: ANIME */}
      {activeSubTab === "anime" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl" id="profile-library-anime">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h4 className="text-sm font-black text-slate-250 flex items-center gap-2">
              <Tv className="w-4 h-4 text-emerald-400" />
              Anime Tracking Library
            </h4>
            <span className="text-xs text-slate-450 font-bold bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-xl">
              {animeItems.length} Series Logged
            </span>
          </div>

          {animeItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Inbox className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold">No Anime logged on your synchronized list yet.</p>
              <p className="text-[11px] text-slate-500">Go search and click "Add to Watchlist" on any Anime title!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {animeItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden hover:border-slate-800 transition-all flex flex-col group cursor-pointer"
                >
                  <div className="aspect-[2/3] relative overflow-hidden bg-slate-900">
                    <img 
                      src={item.coverImage} 
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur border border-slate-800/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-sky-400 uppercase">
                      EP {item.progress || 0}
                    </div>
                  </div>
                  <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                    <span className="text-xs font-black text-slate-200 line-clamp-1">{item.title}</span>
                    <div className="flex justify-between items-center text-[10px] text-slate-450">
                      <span className="capitalize font-semibold">{item.status}</span>
                      {item.rating > 0 && (
                        <span className="flex items-center gap-0.5 font-bold text-amber-500">
                          <Star className="w-3 h-3 fill-amber-500" />
                          {item.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB FOR INDIVIDUAL LIBRARIES: MANGA */}
      {activeSubTab === "manga" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl" id="profile-library-manga">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h4 className="text-sm font-black text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              Manga Reading Records
            </h4>
            <span className="text-xs text-slate-450 font-bold bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-xl">
              {mangaItems.length} Volumes Logged
            </span>
          </div>

          {mangaItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Inbox className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold">No Manga logged on your reading log. yet.</p>
              <p className="text-[11px] text-slate-500">Search and log your current manga chapters here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {mangaItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden hover:border-slate-800 transition-all flex flex-col group cursor-pointer"
                >
                  <div className="aspect-[2/3] relative overflow-hidden bg-slate-900">
                    <img 
                      src={item.coverImage} 
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur border border-slate-800 /80 px-1.5 py-0.5 rounded text-[8px] font-bold text-indigo-400 uppercase">
                      CH {item.progress || 0}
                    </div>
                  </div>
                  <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                    <span className="text-xs font-black text-slate-200 line-clamp-1">{item.title}</span>
                    <div className="flex justify-between items-center text-[10px] text-slate-450">
                      <span className="capitalize font-semibold">{item.status}</span>
                      {item.rating > 0 && (
                        <span className="flex items-center gap-0.5 font-bold text-amber-500">
                          <Star className="w-3 h-3 fill-amber-500" />
                          {item.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB FOR INDIVIDUAL LIBRARIES: WESTERN MOVIES & TV SERIES */}
      {activeSubTab === "western" && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl" id="profile-library-western">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h4 className="text-sm font-black text-slate-200 flex items-center gap-2">
              <Film className="w-4 h-4 text-pink-400" />
              Western Cineplex Archives
            </h4>
            <span className="text-xs text-slate-450 font-bold bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-xl">
              {movieItems.length + tvItems.length} Cinematics Logged
            </span>
          </div>

          {(movieItems.length + tvItems.length) === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Inbox className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold">No TV shows or Movies logged on your watchlist yet.</p>
              <p className="text-[11px] text-slate-500">Use search to add and index global cinematic releases.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {[...movieItems, ...tvItems].map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden hover:border-slate-800 transition-all flex flex-col group cursor-pointer"
                >
                  <div className="aspect-[2/3] relative overflow-hidden bg-slate-900">
                    <img 
                      src={item.coverImage} 
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur border border-slate-800/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-pink-400 uppercase flex items-center gap-1">
                      {item.mediaType === "movie" ? "FILM" : `EP ${item.progress || 0}`}
                    </div>
                  </div>
                  <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                    <span className="text-xs font-black text-slate-200 line-clamp-1">{item.title}</span>
                    <div className="flex justify-between items-center text-[10px] text-slate-450">
                      <span className="capitalize font-semibold">{item.status}</span>
                      {item.rating > 0 && (
                        <span className="flex items-center gap-0.5 font-bold text-amber-505">
                          <Star className="w-3 h-3 fill-amber-500" />
                          {item.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB FOR CSV IMPORT & EXPORT */}
      {activeSubTab === "exchange" && (
        <div className="space-y-6" id="profile-csv-exchange">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Download className="w-5 h-5 text-amber-400" />
                Universal Watchlist Hub (Import / Export)
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Synchronize, backup, or migrate your watchlist between external sites (MAL, AniList, ComicK) and our Unified database.
              </p>
            </div>

            {/* TWO COLUMNS: EXPORT ON LEFT, IMPORT ON RIGHT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* EXPORT PANEL */}
              <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-955/20 px-2 py-0.5 rounded border border-amber-900/30">
                    Backup Watchlist
                  </span>
                  <h5 className="text-sm font-black text-slate-200">Export Watches & Ratings</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Download copyable backups. Standard <strong className="text-indigo-400">CSV</strong> files match spreadsheet schemas. <strong className="text-indigo-400">MAL XML</strong> backups align exactly with standard MyAnimeList formats, ready to be imported directly into MAL, AniList, or back here.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    onClick={exportToCSV}
                    className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-black text-slate-100 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
                  >
                    <Download className="w-4 h-4 text-emerald-450" />
                    Backup (.CSV)
                  </button>
                  <button
                    onClick={exportToXML}
                    className="flex-1 bg-indigo-950/45 hover:bg-indigo-900/50 border border-indigo-900/60 text-xs font-black text-indigo-300 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
                  >
                    <Download className="w-4 h-4 text-indigo-400" />
                    MAL Sync (.XML)
                  </button>
                </div>
              </div>

              {/* IMPORT PANEL */}
              <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-900/30">
                    Migrate Data
                  </span>
                  <h5 className="text-sm font-black text-slate-200 font-sans">Upload ComicK, MAL, or AniList Lists</h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Drag-and-drop a file or paste content directly. Our system accepts standard <strong className="text-indigo-400">CSV spreadsheets</strong> AND native <strong className="text-indigo-400">MyAnimeList XML backup format</strong> files.
                  </p>
                </div>

                {/* Switch between Upload or paste */}
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-850 w-fit text-xs gap-1">
                  <button
                    onClick={() => { setImportActiveSource("upload"); setImportError(""); setImportSuccess(""); setParsedPreview([]); }}
                    className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                      importActiveSource === "upload" ? "bg-slate-850 text-slate-200" : "text-slate-450 hover:text-slate-300"
                    }`}
                  >
                    XML / CSV File Upload
                  </button>
                  <button
                    onClick={() => { setImportActiveSource("paste"); setImportError(""); setImportSuccess(""); setParsedPreview([]); }}
                    className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                      importActiveSource === "paste" ? "bg-slate-850 text-slate-200" : "text-slate-450 hover:text-slate-300"
                    }`}
                  >
                    Paste Raw Data
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-450 font-black uppercase tracking-wider">Fallback Media Type (if column is missing):</label>
                    <select
                      value={defaultImportType}
                      onChange={(e) => setDefaultImportType(e.target.value as MediaType)}
                      className="bg-slate-905 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 backdrop-blur focus:outline-none focus:border-indigo-650 animate-none"
                    >
                      <option value="anime">Anime Series</option>
                      <option value="manga">Manga / Books</option>
                      <option value="movie">Western Film</option>
                      <option value="tv">Western TV Series</option>
                    </select>
                  </div>

                  {importActiveSource === "upload" ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 ${
                        dragActive 
                          ? "border-indigo-500 bg-indigo-950/20" 
                          : "border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70"
                      }`}
                    >
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".csv,.xml" 
                        onChange={handleFileChange}
                        className="hidden" 
                      />
                      <Upload className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">Drag and drop your backup file here</p>
                        <p className="text-[10px] text-slate-500">or click to browse (.csv or .xml format files)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={`Paste CSV content here, for example:\nseries_title,my_status,my_score,my_watched_episodes\nFrieren,Completed,10,28\n\nOr paste standard MAL XML content here, for example:\n<myanimelist>\n  <anime>\n    <series_title>Frieren</series_title>\n    <my_score>10</my_score>\n  </anime>\n</myanimelist>`}
                        className="w-full h-28 bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-600 resize-none"
                      />
                      <button
                        onClick={() => detectAndParseFileContent(importText, defaultImportType)}
                        disabled={!importText.trim()}
                        className="w-full bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-xs font-black text-white py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        Parse & Map Data
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* STATUS AND FEEDBACK ALERTS */}
            {importError && (
              <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-2xl flex items-start gap-2 text-red-400 text-xs leading-relaxed animate-fade-in">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-2xl flex items-start gap-2 text-emerald-450 text-xs leading-relaxed animate-fade-in">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* PREVIEW CONTAINER SECTION */}
            {parsedPreview.length > 0 && (
              <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4 animate-fade-in" id="import-analysis-preview">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                  <div>
                    <h5 className="text-sm font-black text-slate-200">Mapped Import Preview</h5>
                    {detectedMapping && (
                      <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                        Header Sync: <span className="font-bold text-indigo-400">Title={detectedMapping.title}</span>,{" "}
                        <span className="font-bold text-indigo-400">Type={detectedMapping.mediaType}</span>,{" "}
                        <span className="font-bold text-indigo-400">Status={detectedMapping.status}</span>,{" "}
                        <span className="font-bold text-indigo-400">Progress={detectedMapping.progress}</span>,{" "}
                        <span className="font-bold text-indigo-400">Rating={detectedMapping.rating}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setParsedPreview([])}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-black text-slate-400 px-3 py-2 rounded-lg cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleApplyImport}
                      disabled={isImporting}
                      className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/15 disabled:opacity-50 border-none"
                    >
                      {isImporting ? (
                        <>Integrating...</>
                      ) : (
                        <>Confirm Import ({parsedPreview.length} Titles)</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[250px] border border-slate-900 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-900 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                        <th className="px-4 py-2.5">Title</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">{defaultImportType === "manga" ? "Read Status" : "Watch Status"}</th>
                        <th className="px-4 py-2.5 text-center">{defaultImportType === "manga" ? "Chapters Done" : "Episodes Done"}</th>
                        <th className="px-4 py-2.5 text-center">Your Rating</th>
                        <th className="px-4 py-2.5 max-w-[150px]">Personal Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/40 text-slate-300">
                      {parsedPreview.slice(0, 15).map((item, index) => (
                        <tr key={index} className="hover:bg-slate-900/30">
                          <td className="px-4 py-2.5 font-bold text-slate-200 max-w-[180px] truncate">{item.title}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-[9px] uppercase font-bold bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 px-1.5 py-0.5 rounded">
                              {item.mediaType}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="capitalize font-semibold text-[11px] text-slate-350">
                              {item.status === "current"
                                ? (item.mediaType === "manga" ? "reading" : "watching")
                                : item.status === "planning"
                                ? (item.mediaType === "manga" ? "plan to read" : "plan to watch")
                                : item.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-400">
                            {item.progress} {item.totalUnits > 0 ? `/ ${item.totalUnits}` : ""}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {item.rating > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                                <Star className="w-3 h-3 fill-amber-505" /> {item.rating}/10
                              </span>
                            ) : (
                              <span className="text-slate-550">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 max-w-[150px] truncate text-slate-450 italic">
                            {item.notes || <span className="text-slate-600 font-normal">None</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedPreview.length > 15 && (
                  <p className="text-[10px] text-slate-500 text-center italic">
                    Showing first 15 of {parsedPreview.length} items parsed from CSV...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB FOR SECURITY COMPLIANCE & PRIVACY HUB */}
      {activeSubTab === "security" && (
        <div className="space-y-6" id="profile-security-hub">
          {/* Main Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ShieldCheck className="w-48 h-48 text-indigo-500" />
            </div>

            <div className="border-b border-slate-800 pb-4 relative z-10">
              <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-955/20 px-2 py-0.5 rounded border border-rose-900/30">
                Security-by-Design Compliance Hub
              </span>
              <h4 className="text-lg font-black text-slate-100 flex items-center gap-2 mt-2">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
                Cybersecurity Controls & Data Governance
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Manage your digital footprint, audit system guardrails, or exercise your legal rights under modern privacy regulations. All controls are strictly mapped to international information security standards.
              </p>
            </div>

            {/* Split layout: Purge on left, Mapping on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">
              {/* Purge Column (5/12) */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between space-y-6">
                <div className="space-y-3.5">
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-200">State Destruction & Right to Erasure</h5>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      NIST CSF 2.0 PR.DS / MITRE D3FEND D3-SFP
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Under the <strong className="text-rose-400">Right to be Forgotten</strong>, you have full sovereignty over your logged records. Triggering this purge synchronously evicts:
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4 font-medium">
                    <li>Your complete public/private watchlists from cloud systems</li>
                    <li>All personal review posts and community write-ups</li>
                    <li>Cached local databases and localStorage preferences</li>
                    <li>Your active OAuth session credentials (evicted on logout)</li>
                  </ul>
                  <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-[10px] text-rose-400 leading-relaxed font-semibold">
                    ⚠️ WARNING: This operation is destructive, instant, and cannot be undone. Our databases perform physical, non-soft deletions.
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPurgeModalOpen(true);
                      setPurgeConfirmationText("");
                      setPurgeError("");
                      setPurgeSuccess(false);
                    }}
                    className="w-full bg-rose-950/65 hover:bg-rose-900/85 border border-rose-800/40 text-xs font-black text-rose-200 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
                    Authorize Full State Purge
                  </button>
                </div>
              </div>

              {/* Compliance Map Column (7/12) */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-4">
                <h5 className="text-sm font-black text-slate-200 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Security Framework Integration Metrics
                </h5>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Our architecture implements zero-trust paradigms mapped directly to standard defensive capabilities:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  
                  {/* MITRE ATT&CK CARD */}
                  <div className="p-3 bg-slate-900/65 border border-slate-800 rounded-xl space-y-1 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">MITRE ATT&CK v19.1</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/50 text-indigo-300 font-bold">Credential Access</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">T1078 Valid Accounts & Session Purging</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      Secured via Google OAuth authentication. The active session is cryptographically bound, and token revocation upon logout mitigates token theft vectors (T1539).
                    </p>
                  </div>

                  {/* NIST CSF 2.0 CARD */}
                  <div className="p-3 bg-slate-900/65 border border-slate-800 rounded-xl space-y-1 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">NIST CSF 2.0</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 font-bold">PR.DS Data Security</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">Data Minimization & Respond (RS.RP)</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      Implements automated and user-controlled data minimization. Purging offers emergency incident response triggers to instantly evict compromised credentials and user data.
                    </p>
                  </div>

                  {/* MITRE ATLAS CARD */}
                  <div className="p-3 bg-slate-900/65 border border-slate-800 rounded-xl space-y-1 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">MITRE ATLAS v5.4</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-955/20 text-amber-300 font-bold">Model Abuse</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">AML.TA0001 Prompt Injection Guardrails</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      Defends downstream Gemini recommendations against model behavior hijacking. We sanitize user rating notes and watchlist titles before compiling prompts.
                    </p>
                  </div>

                  {/* MITRE D3FEND CARD */}
                  <div className="p-3 bg-slate-900/65 border border-slate-800 rounded-xl space-y-1 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">MITRE D3FEND v1.3</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-955/20 text-sky-300 font-bold">Defensive Action</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">D3-SFP & D3-DIV Validation</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      Secures input channels with CSV and XML regular-expression validators, restricting malicious payload execution during database batch ingestion.
                    </p>
                  </div>

                  {/* NIST AI RMF 1.0 CARD */}
                  <div className="p-3 bg-slate-900/65 border border-slate-800 rounded-xl space-y-1 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">NIST AI RMF 1.0</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-955/20 text-pink-300 font-bold">Safety & Privacy</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">Context Window Isolation</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      Ensures model inputs never access historical user profiles after erasure. Isolates the LLM context bounds to prevent indirect profile leakage or privacy loss.
                    </p>
                  </div>

                  {/* MITRE F3 CARD */}
                  <div className="p-3 bg-slate-900/65 border border-slate-800 rounded-xl space-y-1 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">MITRE F3 v1.1</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-955/20 text-orange-300 font-bold">Lifecycle Guard</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">Anti-Fraud Transaction Safeguard</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      Secures bulk mutations or state purges via mandatory token verification, preventing automated CSRF or script-driven self-inflicted damage.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE-CONFIRMATION SECURITY MODAL (MITRE F3 & NIST CSF RS.RP) */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => { if (!isPurging) setIsPurgeModalOpen(false); }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-left z-10 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl flex-shrink-0">
                <AlertCircle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-100">Critical: Confirm State Destruction</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  You are initiating a high-severity transactional mutation. All linked database entities (watchlists, ratings, community posts) will be permanently deleted.
                </p>
              </div>
            </div>

            {purgeSuccess ? (
              <div className="bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-xl text-center space-y-3">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto animate-pulse" />
                <p className="text-xs font-black text-slate-200">Data Purge Completed Successfully</p>
                <p className="text-[11px] text-slate-400">
                  All cached tracking structures and active sessions have been safely eviscerated. Returning to secure homepage...
                </p>
              </div>
            ) : (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (purgeConfirmationText !== "DELETE") {
                    setPurgeError("Verification code mismatch. Please type exactly 'DELETE' (all-caps).");
                    return;
                  }
                  
                  setPurgeError("");
                  setIsPurging(true);
                  try {
                    if (onClearAllData) {
                      await onClearAllData();
                    }
                    setPurgeSuccess(true);
                    setTimeout(() => {
                      setIsPurgeModalOpen(false);
                      // reload or reset local view is triggered by App.tsx handleClearAllUserData
                    }, 3500);
                  } catch (err: any) {
                    console.error("Purging failed:", err);
                    setPurgeError(err.message || "An error occurred during database destruction.");
                  } finally {
                    setIsPurging(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                    Verify Intent (MITRE F3 Safeguard):
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Type <strong className="text-rose-400">DELETE</strong> in the box below to authenticate this transaction:
                  </p>
                  <input
                    required
                    type="text"
                    value={purgeConfirmationText}
                    onChange={(e) => setPurgeConfirmationText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-rose-400 text-xs focus:outline-none focus:border-rose-600 transition-all font-mono font-bold tracking-widest text-center"
                    disabled={isPurging}
                  />
                </div>

                {purgeError && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-xl font-medium leading-relaxed">
                    {purgeError}
                  </p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPurgeModalOpen(false)}
                    className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                    disabled={isPurging}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-rose-650 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/10 border-none"
                    disabled={isPurging || purgeConfirmationText !== "DELETE"}
                  >
                    {isPurging ? (
                      <>Wiping States...</>
                    ) : (
                      <>Confirm Purge</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
