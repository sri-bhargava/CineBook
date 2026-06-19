import { CurrencyPipe, DatePipe } from "@angular/common";
import { Component, HostListener, OnInit, computed, inject, signal } from "@angular/core";
import {
  LucideCheck,
  LucideChevronDown,
  LucideClock,
  LucideFilm,
  LucideReceipt,
  LucideRotateCcw,
  LucideTicket,
  LucideUsers,
  LucideWallet,
  LucideX
} from "@lucide/angular";
import { AdminBooking, BookingStatus } from "../../../core/models/catalog.model";
import { BookingService } from "../../../core/services/booking.service";
import { CarouselComponent } from "../../../shared/carousel/carousel";

/** Ledger tab — drives the bottom table only, never the KPI summaries. */
type StatusTab = "ALL" | "CONFIRMED" | "CANCELLED";

/** Single-select movie filter — `"ALL"` means "no filter". */
type MovieFilter = number | "ALL";

/**
 * Admin "All Bookings" page. Theater-scoped via the admin's JWT, so every row,
 * KPI and leaderboard entry shown here belongs to the signed-in admin's theater.
 *
 * <p>Layout DNA mirrors Manage Shows / Manage Movies: dashboard header + KPI grid
 * + auto carousel + filter panel + tabbed ledger table. KPIs recalculate with
 * the movie filter only — the status tabs slice the visible rows but leave the
 * KPI scope untouched.
 */
@Component({
  selector: "app-manage-bookings",
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    CarouselComponent,
    LucideCheck,
    LucideChevronDown,
    LucideClock,
    LucideFilm,
    LucideReceipt,
    LucideRotateCcw,
    LucideTicket,
    LucideUsers,
    LucideWallet,
    LucideX
  ],
  templateUrl: "./manage-bookings.html",
  styleUrl: "./manage-bookings.css"
})
export class ManageBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);

  // ── Source signals from the shared service ───────────────────────────────────
  readonly bookings = this.bookingService.bookings;
  readonly mostBooked = this.bookingService.mostBooked;

  // ── Filter state ─────────────────────────────────────────────────────────────
  /** Selected movie for the page-level filter — `"ALL"` means show everything. */
  readonly movieFilter = signal<MovieFilter>("ALL");

  /** Active status tab in the ledger. */
  readonly statusTab = signal<StatusTab>("ALL");

  /** Whether the rich movie dropdown menu is currently open. */
  readonly dropdownOpen = signal(false);

  ngOnInit(): void {
    // Signals are seeded with []/0 so the KPI grid renders immediately with zeros.
    // A failed load (e.g. backend down) is logged but must not break the page —
    // the empty-state KPIs stay visible and update when real data later arrives.
    this.bookingService.load().subscribe({
      error: (err) => console.error("Failed to load admin bookings", err)
    });
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  /**
   * Distinct movies seen in the bookings list — populates the dropdown options.
   * Each entry carries the poster + a running booking count so the menu rows can
   * render rich thumbnails and a "(N)" tally without extra lookups in the template.
   */
  readonly movieOptions = computed(() => {
    type Opt = { id: number; title: string; posterUrl: string | null; bookingCount: number };
    const byId = new Map<number, Opt>();
    for (const b of this.bookings()) {
      if (b.movieId == null) continue;
      const existing = byId.get(b.movieId);
      if (existing) {
        existing.bookingCount += 1;
      } else {
        byId.set(b.movieId, {
          id: b.movieId,
          title: b.movieTitle,
          posterUrl: b.moviePosterUrl,
          bookingCount: 1
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
  });

  /** The currently picked movie option, or null when "All movies" is active. */
  readonly selectedMovie = computed(() => {
    const id = this.movieFilter();
    if (id === "ALL") return null;
    return this.movieOptions().find((opt) => opt.id === id) ?? null;
  });

  // ── Page scope — every visible metric and row is filtered by the movie picker ─
  // When the filter is "ALL" the scope is the full booking list (aggregate view).

  /** Bookings narrowed by the active movie filter — the single source of truth for the page. */
  readonly scopedBookings = computed(() => {
    const filter = this.movieFilter();
    if (filter === "ALL") {
      return this.bookings();
    }
    return this.bookings().filter((b) => b.movieId === filter);
  });

  // ── KPI metrics — all derived from scopedBookings so they re-key with the filter ─

  /** Total count of reservation items in the current scope. */
  readonly totalBookings = computed(() => this.scopedBookings().length);

  /** Cumulative active seats — partial cancellations subtract only the seats that were released. */
  readonly totalFootSteps = computed(() =>
    this.scopedBookings().reduce((sum, b) => sum + this.activeSeatCount(b), 0)
  );

  /** Net revenue: gross totals minus refunds, so partial cancellations net out. */
  readonly revenue = computed(() =>
    this.scopedBookings().reduce(
      (sum, b) => sum + Number(b.totalAmount ?? 0) - Number(b.refundAmount ?? 0),
      0
    )
  );

  /** Total monetary value returned to consumers across all refunds. */
  readonly refundedAmount = computed(() =>
    this.scopedBookings().reduce((sum, b) => sum + Number(b.refundAmount ?? 0), 0)
  );

  /** How many bookings carry any refund — feeds the small tracking line under "Refunded". */
  readonly cancellationCount = computed(
    () => this.scopedBookings().filter((b) => Number(b.refundAmount ?? 0) > 0).length
  );

  /** Rows actually rendered in the table — status tab on top of scopedBookings. */
  readonly tabbedBookings = computed(() => {
    const tab = this.statusTab();
    const rows = this.scopedBookings();
    if (tab === "ALL") return rows;
    if (tab === "CONFIRMED") return rows.filter((b) => b.status === "CONFIRMED");
    return rows.filter((b) => b.status === "CANCELLED" || b.status === "PARTIALLY_CANCELLED");
  });

  // ── Tab badge counts — derived from the page-scoped list (same as the table) ──
  readonly allCount = computed(() => this.scopedBookings().length);

  readonly confirmedCount = computed(
    () => this.scopedBookings().filter((b) => b.status === "CONFIRMED").length
  );

  readonly cancelledCount = computed(
    () =>
      this.scopedBookings().filter(
        (b) => b.status === "CANCELLED" || b.status === "PARTIALLY_CANCELLED"
      ).length
  );

  // ── Filter setters ───────────────────────────────────────────────────────────

  /** Apply a movie scope (or clear it) and close the dropdown menu. */
  pickMovie(id: MovieFilter, event?: Event): void {
    event?.stopPropagation();
    this.movieFilter.set(id);
    this.closeDropdown();
  }

  setStatusTab(tab: StatusTab): void {
    this.statusTab.set(tab);
  }

  // ── Rich dropdown menu ──────────────────────────────────────────────────────

  toggleDropdown(): void {
    this.dropdownOpen.update((open) => !open);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  /** Close the menu when the user clicks anywhere outside the dropdown wrapper. */
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event): void {
    if (!this.dropdownOpen()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest("#ab-filter-wrap")) {
      this.closeDropdown();
    }
  }

  /** Escape always dismisses an open dropdown — keyboard parity with click-out. */
  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.dropdownOpen()) this.closeDropdown();
  }

  // ── Template helpers ─────────────────────────────────────────────────────────

  /** First two letters of the username, uppercased — fills the user avatar chip. */
  initialsOf(username: string | null | undefined): string {
    if (!username) return "?";
    const trimmed = username.trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  /** Status badge style class — keeps the template's class binding small. */
  statusClass(status: BookingStatus): string {
    switch (status) {
      case "CONFIRMED":
        return "status-badge status-confirmed";
      case "PARTIALLY_CANCELLED":
        return "status-badge status-partial";
      case "CANCELLED":
        return "status-badge status-cancelled";
    }
  }

  /** Human label for a status enum value. */
  statusLabel(status: BookingStatus): string {
    switch (status) {
      case "CONFIRMED":
        return "CONFIRMED";
      case "PARTIALLY_CANCELLED":
        return "PARTIAL";
      case "CANCELLED":
        return "CANCELLED";
    }
  }

  /** Should the TOTAL column project the refund line? */
  hasRefund(b: AdminBooking): boolean {
    return Number(b.refundAmount ?? 0) > 0;
  }

  private activeSeatCount(b: AdminBooking): number {
    if (typeof b.activeSeatsCount === "number") {
      return b.activeSeatsCount;
    }
    return b.status === "CANCELLED" ? 0 : b.seatsBooked ?? 0;
  }
}
