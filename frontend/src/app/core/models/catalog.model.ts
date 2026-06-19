// Domain models matching the backend schema. Used from Day 2 onward.

export interface Movie {
  id: number;
  title: string;
  genre: string;
  durationMins: number;
  languages: string; // CSV
  price: number;
  posterUrl: string;
  trailerUrl: string;
  deleted?: boolean;
}

/** Create/update payload — the backend assigns `id` and owns the soft-delete flag. */
export type MoviePayload = Omit<Movie, "id" | "deleted">;

export interface Theater {
  id: number;
  name: string;
  location: string;
  ownerUserId?: number;
}

export interface Show {
  id: number;
  movieId: number;
  theaterId: number;
  showTime: string;
  language: string;
  ticketPrice: number;
  totalSeats: number;
  availableSeats: number;
}

/** Theater-enriched show served to user-facing pages — see PublicShowResponse on the backend. */
export interface PublicShow extends Show {
  theaterName: string | null;
  theaterLocation: string | null;
}

/**
 * Create/update payload for a show. The backend assigns `id`, derives `theaterId`
 * from the admin's JWT, and computes `availableSeats`, so none of those are sent.
 */
export type ShowPayload = Pick<
  Show,
  "movieId" | "showTime" | "language" | "ticketPrice" | "totalSeats"
>;

export type BookingStatus = "CONFIRMED" | "PARTIALLY_CANCELLED" | "CANCELLED";

export type SeatStatus = "BOOKED" | "CANCELLED";

export interface Booking {
  id: number;
  showId: number;
  userId: number;
  seats: string; // immutable snapshot of originally booked seats (CSV)
  seatsBooked: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  refundAmount: number;
  status: BookingStatus;
  bookingDate: string;
  cancelledAt: string | null;
}

/** One booked seat within a booking — authoritative per-seat state for partial cancellation. */
export interface BookingSeat {
  id: number;
  bookingId: number;
  seatLabel: string;
  price: number;
  status: SeatStatus;
  cancelledAt: string | null;
}

/**
 * Pre-joined booking row served by `/api/admin/bookings` for the admin ledger.
 * The server stitches movie + show + theater + user context on so the table can
 * render without secondary lookups.
 */
export interface AdminBooking {
  id: number;
  userId: number;
  username: string;
  movieId: number | null;
  movieTitle: string;
  moviePosterUrl: string | null;
  showId: number;
  showTime: string | null;
  theaterName: string | null;
  theaterLocation: string | null;
  seatsBooked: number;
  /** Seats still active after any partial cancellation — use for current footfall. */
  activeSeatsCount?: number;
  /** Seats cancelled from this booking, including partial cancellations. */
  cancelledSeatsCount?: number;
  seatNumbers: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  refundAmount: number;
  status: BookingStatus;
  bookingDate: string;
  cancelledAt: string | null;
}

/** One row of the "Most Booked" leaderboard — drives the admin bookings carousel. */
export interface MostBookedMovie {
  movieId: number;
  title: string;
  posterUrl: string;
  totalSeatsBooked: number;
  totalBookings: number;
}

/** Average rating + review count per movie — drives the analytics "Top Rated" chart. */
export interface MovieRating {
  movieId: number;
  title: string;
  posterUrl: string | null;
  averageRating: number;
  reviewCount: number;
}

/** Waitlist tally per movie — drives the analytics "Audience Interest" footer cards. */
export interface MovieInterestStat {
  movieId: number;
  title: string;
  posterUrl: string | null;
  waitlistCount: number;
}

/** Flat, pre-joined row served to /api/bookings/me and the My Bookings page. */
export interface UserBooking {
  id: number;
  movieId: number | null;
  movieTitle: string;
  moviePosterUrl: string | null;
  showId: number;
  showTime: string | null;
  theaterName: string | null;
  theaterLocation: string | null;
  seats: string;
  seatsBooked: number;
  /** Seat labels still active (cancellable) — drives the interactive cancel modal. */
  activeSeats: string[];
  /** Seat labels already cancelled — shown disabled/struck-through in the modal. */
  cancelledSeats: string[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  refundAmount: number;
  status: BookingStatus;
  bookingDate: string;
  cancelledAt: string | null;
  hasReview: boolean;
}

/**
 * Pre-cancel refund preview from `/api/bookings/me/{id}/refund-quote`. The modal
 * multiplies `refundPerSeat` by the number of seats selected for a live estimate.
 */
export interface RefundQuote {
  refundPercent: number;
  refundPerSeat: number;
  hoursUntilShow: number;
  message: string;
}

export interface BookingCreatePayload {
  showId: number;
  seatLabels: string[];
}

export interface SeatAvailability {
  showId: number;
  totalSeats: number;
  booked: string[];
}

export interface Review {
  id: number;
  movieId: number;
  userId: number;
  username: string;
  rating: number;
  createdAt: string;
}

export interface ReviewCreatePayload {
  bookingId: number;
  rating: number;
}

export interface MovieInterestStatus {
  movieId: number;
  interested: boolean;
  count: number;
}
