import { CurrencyPipe, DatePipe, DecimalPipe } from "@angular/common";
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { ChartData, ChartOptions } from "chart.js";
import {
  LucideArmchair,
  LucideCalendarClock,
  LucideChartColumn,
  LucideCheck,
  LucideChevronDown,
  LucideFilm,
  LucideRefreshCw,
  LucideStar,
  LucideTicket,
  LucideTrendingDown,
  LucideWallet
} from "@lucide/angular";
import { BaseChartDirective } from "ng2-charts";
import { AdminBooking, Movie, Show } from "../../../core/models/catalog.model";
import { AnalyticsService } from "../../../core/services/analytics.service";

/** Rolling window for every time-scoped metric, in days. */
type TimeRange = 7 | 30 | 90;

/** Bucket size for the main bookings chart. */
type Grouping = "hour" | "day" | "week";

/** Single-select movie filter — `"ALL"` means "no filter". */
type MovieFilter = number | "ALL";

/** Auto-refresh cadence — re-fetch every datafeed every 30s. */
const REFRESH_INTERVAL_MS = 30_000;

/** Shared brand colours pulled from the Tailwind token palette. */
const TOMATO = "#ff4d4d";
const TOMATO_SOFT = "rgba(255, 77, 77, 0.12)";
const AMBER = "#f59e0b";

/** One enriched row of the top-performance / occupancy joins. */
interface ShowMetric {
  showId: number;
  title: string;
  language: string;
  showTime: string;
  totalSeats: number;
  seatsBooked: number;
  fillRate: number;
  revenue: number;
}

/**
 * Admin Analytics dashboard. Theater-scoped via the admin's JWT, so every figure
 * shown here belongs to the signed-in admin's theater.
 *
 * <p>Layout DNA mirrors Manage Bookings: dashboard header + KPI grid + filter
 * panel + tables, reusing the same `.card`, `.filter-trigger`/`.filter-menu`,
 * `.filter-btn` and `.status-badge` patterns. All data is fetched raw and
 * aggregated client-side in `computed()` signals, so the time-range, grouping
 * and movie pickers re-key every dependent metric and chart instantly. The feeds
 * also auto-refresh every 30s.
 */
@Component({
  selector: "app-analytics",
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    BaseChartDirective,
    LucideArmchair,
    LucideCalendarClock,
    LucideChartColumn,
    LucideCheck,
    LucideChevronDown,
    LucideFilm,
    LucideRefreshCw,
    LucideStar,
    LucideTicket,
    LucideTrendingDown,
    LucideWallet
  ],
  templateUrl: "./analytics.html",
  styleUrl: "./analytics.css"
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private readonly analytics = inject(AnalyticsService);

  // ── Source signals from the shared service ───────────────────────────────────
  readonly bookings = this.analytics.bookings;
  readonly shows = this.analytics.shows;
  readonly movies = this.analytics.movies;
  readonly ratings = this.analytics.ratings;
  readonly interest = this.analytics.interest;

  // ── Control state ────────────────────────────────────────────────────────────
  readonly timeRange = signal<TimeRange>(30);
  readonly grouping = signal<Grouping>("day");
  readonly movieFilter = signal<MovieFilter>("ALL");
  readonly dropdownOpen = signal(false);
  readonly refreshing = signal(false);

  readonly timeRanges: TimeRange[] = [7, 30, 90];
  readonly groupings: Grouping[] = ["hour", "day", "week"];

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.refresh();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  // ── Refresh handling ─────────────────────────────────────────────────────────

  /** Manual refresh — re-fetch all feeds and restart the auto-refresh clock. */
  refresh(): void {
    this.refreshing.set(true);
    this.analytics.load().subscribe({
      next: () => this.refreshing.set(false),
      error: (err) => {
        console.error("Failed to load analytics", err);
        this.refreshing.set(false);
      }
    });
    this.restartAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.timer = setInterval(() => {
      this.analytics.load().subscribe({
        error: (err) => console.error("Auto-refresh failed", err)
      });
    }, REFRESH_INTERVAL_MS);
  }

  private stopAutoRefresh(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private restartAutoRefresh(): void {
    this.stopAutoRefresh();
    this.startAutoRefresh();
  }

  // ── Control setters ──────────────────────────────────────────────────────────

  setTimeRange(range: TimeRange): void {
    this.timeRange.set(range);
  }

  setGrouping(grouping: Grouping): void {
    this.grouping.set(grouping);
  }

  pickMovie(id: MovieFilter, event?: Event): void {
    event?.stopPropagation();
    this.movieFilter.set(id);
    this.closeDropdown();
  }

  toggleDropdown(): void {
    this.dropdownOpen.update((open) => !open);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event): void {
    if (!this.dropdownOpen()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest("#an-filter-wrap")) {
      this.closeDropdown();
    }
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.dropdownOpen()) this.closeDropdown();
  }

  // ── Lookups ──────────────────────────────────────────────────────────────────

  /** Movie metadata by id — feeds titles/posters into every join. */
  private readonly movieById = computed(() => {
    const map = new Map<number, Movie>();
    for (const m of this.movies()) map.set(m.id, m);
    return map;
  });

  /** The theater's movies (those it actually screens) — populates the filter menu. */
  readonly movieOptions = computed(() => {
    type Opt = { id: number; title: string; posterUrl: string | null };
    const byId = new Map<number, Opt>();
    for (const show of this.shows()) {
      if (byId.has(show.movieId)) continue;
      const movie = this.movieById().get(show.movieId);
      byId.set(show.movieId, {
        id: show.movieId,
        title: movie?.title ?? `Movie #${show.movieId}`,
        posterUrl: movie?.posterUrl ?? null
      });
    }
    return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
  });

  /** The currently picked movie option, or null when "All movies" is active. */
  readonly selectedMovie = computed(() => {
    const id = this.movieFilter();
    if (id === "ALL") return null;
    return this.movieOptions().find((opt) => opt.id === id) ?? null;
  });

  /** The admin's theater name, lifted off any booking row (all share one theater). */
  readonly theaterName = computed(
    () => this.bookings().find((b) => b.theaterName)?.theaterName ?? "—"
  );

  // ── Page scope — bookings narrowed by the time range AND the movie picker ─────

  readonly scopedBookings = computed(() => {
    const cutoff = Date.now() - this.timeRange() * 24 * 60 * 60 * 1000;
    const movie = this.movieFilter();
    return this.bookings().filter((b) => {
      const inWindow = b.bookingDate ? new Date(b.bookingDate).getTime() >= cutoff : true;
      const matchesMovie = movie === "ALL" || b.movieId === movie;
      return inWindow && matchesMovie;
    });
  });

  /** Shows narrowed by the movie picker only (time range doesn't apply to upcoming). */
  private readonly scopedShows = computed(() => {
    const movie = this.movieFilter();
    return movie === "ALL"
      ? this.shows()
      : this.shows().filter((s) => s.movieId === movie);
  });

  // ── KPI metrics ────────────────────────────────────────────────────────────

  /** Net revenue: gross totals minus refunds, so partial cancellations net out. */
  readonly totalRevenue = computed(() =>
    this.scopedBookings().reduce(
      (sum, b) => sum + Number(b.totalAmount ?? 0) - Number(b.refundAmount ?? 0),
      0
    )
  );

  /** Seats sold — current confirmed footfall after full or partial cancellations. */
  readonly seatsSold = computed(() =>
    this.scopedBookings().reduce((sum, b) => sum + this.activeSeatCount(b), 0)
  );

  /** Shows still ahead of "now" in the current movie scope. */
  readonly upcomingShows = computed(() => {
    const now = Date.now();
    return this.scopedShows().filter(
      (s) => s.showTime && new Date(s.showTime).getTime() > now
    ).length;
  });

  /** Share of in-scope bookings that were cancelled (fully or partially), as a %. */
  readonly cancellationRate = computed(() => {
    const rows = this.scopedBookings();
    if (rows.length === 0) return 0;
    const cancelled = rows.filter(
      (b) => b.status === "CANCELLED" || b.status === "PARTIALLY_CANCELLED"
    ).length;
    return (cancelled / rows.length) * 100;
  });

  readonly cancelledCount = computed(
    () =>
      this.scopedBookings().filter(
        (b) => b.status === "CANCELLED" || b.status === "PARTIALLY_CANCELLED"
      ).length
  );

  // ── Main bookings chart — reacts to grouping + movie + range ─────────────────

  readonly bookingsChartData = computed<ChartData<"bar">>(() => {
    const grouping = this.grouping();
    const buckets = new Map<string, { label: string; ts: number; value: number }>();

    for (const b of this.scopedBookings()) {
      if (!b.bookingDate) continue;
      const date = new Date(b.bookingDate);
      const { key, label, ts } = this.bucketOf(date, grouping);
      const entry = buckets.get(key);
      const tickets = this.activeSeatCount(b);
      if (entry) {
        entry.value += tickets;
      } else {
        buckets.set(key, { label, ts, value: tickets });
      }
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => a.ts - b.ts);
    return {
      labels: sorted.map((s) => s.label),
      datasets: [
        {
          label: "Tickets booked",
          data: sorted.map((s) => s.value),
          backgroundColor: TOMATO,
          hoverBackgroundColor: "#e63946",
          borderRadius: 6,
          maxBarThickness: 48
        }
      ]
    };
  });

  /** Resolve a booking date to a chart bucket per the active grouping. */
  private bucketOf(
    date: Date,
    grouping: Grouping
  ): { key: string; label: string; ts: number } {
    if (grouping === "hour") {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
      return {
        key: d.toISOString(),
        label: d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit" }),
        ts: d.getTime()
      };
    }
    if (grouping === "week") {
      // Snap to the Monday of the booking's week.
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const day = (d.getDay() + 6) % 7; // 0 = Monday
      d.setDate(d.getDate() - day);
      return {
        key: d.toISOString(),
        label: `Wk of ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        ts: d.getTime()
      };
    }
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return {
      key: d.toISOString(),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      ts: d.getTime()
    };
  }

  readonly barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6b7280" } },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { color: "#6b7280", precision: 0 }
      }
    }
  };

  // ── Show occupancy table — active shows and how full they are ────────────────

  readonly occupancyRows = computed<ShowMetric[]>(() => {
    const now = Date.now();
    return this.scopedShows()
      .filter((s) => s.showTime && new Date(s.showTime).getTime() >= now)
      .map((s) => this.toShowMetric(s))
      .sort((a, b) => new Date(a.showTime).getTime() - new Date(b.showTime).getTime());
  });

  // ── Top performance table — ranked by net revenue ───────────────────────────

  readonly topPerformance = computed<ShowMetric[]>(() => {
    const movie = this.movieFilter();
    const shows =
      movie === "ALL" ? this.shows() : this.shows().filter((s) => s.movieId === movie);
    return shows
      .map((s) => this.toShowMetric(s))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  });

  /** Join a show to its movie + booking revenue into a single metric row. */
  private toShowMetric(show: Show): ShowMetric {
    const total = show.totalSeats ?? 0;
    const available = show.availableSeats ?? 0;
    const seatsBooked = Math.max(0, total - available);
    const revenue = this.bookings()
      .filter((b) => b.showId === show.id)
      .reduce((sum, b) => sum + Number(b.totalAmount ?? 0) - Number(b.refundAmount ?? 0), 0);
    return {
      showId: show.id,
      title: this.movieById().get(show.movieId)?.title ?? `Movie #${show.movieId}`,
      language: show.language ?? "—",
      showTime: show.showTime,
      totalSeats: total,
      seatsBooked,
      fillRate: total > 0 ? (seatsBooked / total) * 100 : 0,
      revenue
    };
  }

  // ── Top-rated movies chart ───────────────────────────────────────────────────

  private activeSeatCount(b: AdminBooking): number {
    if (typeof b.activeSeatsCount === "number") {
      return b.activeSeatsCount;
    }
    return b.status === "CANCELLED" ? 0 : b.seatsBooked ?? 0;
  }

  readonly topRatedChartData = computed<ChartData<"bar">>(() => {
    const top = [...this.ratings()]
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 6);
    return {
      labels: top.map((r) => r.title),
      datasets: [
        {
          label: "Avg rating",
          data: top.map((r) => Number(r.averageRating?.toFixed(2) ?? 0)),
          backgroundColor: AMBER,
          hoverBackgroundColor: "#d97706",
          borderRadius: 6,
          maxBarThickness: 36
        }
      ]
    };
  });

  readonly ratingBarOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        max: 5,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { color: "#6b7280", stepSize: 1 }
      },
      y: { grid: { display: false }, ticks: { color: "#374151" } }
    }
  };

  // ── Audience interest footer ─────────────────────────────────────────────────

  readonly audienceInterest = computed(() =>
    [...this.interest()].sort((a, b) => b.waitlistCount - a.waitlistCount).slice(0, 8)
  );

  // ── Template helpers ─────────────────────────────────────────────────────────

  /** Tailwind background for an occupancy bar — green ⇒ amber ⇒ tomato by fill. */
  fillBarClass(pct: number): string {
    if (pct >= 75) return "bg-emerald-500";
    if (pct >= 40) return "bg-amber-500";
    return "bg-tomato-500";
  }

  /** Matching text tone for a fill-rate label. */
  fillTextClass(pct: number): string {
    if (pct >= 75) return "text-emerald-600";
    if (pct >= 40) return "text-amber-600";
    return "text-tomato-600";
  }

  /** Clamp a fill rate to 0–100 for the inline progress bar width. */
  barWidth(pct: number): number {
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  groupingLabel(grouping: Grouping): string {
    switch (grouping) {
      case "hour":
        return "By hour";
      case "day":
        return "By day";
      case "week":
        return "By week";
    }
  }
}
