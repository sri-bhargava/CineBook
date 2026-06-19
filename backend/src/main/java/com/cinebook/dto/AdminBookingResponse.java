package com.cinebook.dto;

import com.cinebook.entity.BookingStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Flat response row for the admin "All Bookings" ledger. Pre-joined on the server
 * (movie, show, theater, user) so the Angular table can render without secondary
 * lookups.
 */
public class AdminBookingResponse {

    private Long id;
    private Long userId;
    private String username;

    private Long movieId;
    private String movieTitle;
    private String moviePosterUrl;

    private Long showId;
    private LocalDateTime showTime;
    private String theaterName;
    private String theaterLocation;

    private Integer seatsBooked;
    private Integer activeSeatsCount;
    private Integer cancelledSeatsCount;
    private String seatNumbers;

    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal refundAmount;

    private BookingStatus status;
    private LocalDateTime bookingDate;
    private LocalDateTime cancelledAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Long getMovieId() { return movieId; }
    public void setMovieId(Long movieId) { this.movieId = movieId; }

    public String getMovieTitle() { return movieTitle; }
    public void setMovieTitle(String movieTitle) { this.movieTitle = movieTitle; }

    public String getMoviePosterUrl() { return moviePosterUrl; }
    public void setMoviePosterUrl(String moviePosterUrl) { this.moviePosterUrl = moviePosterUrl; }

    public Long getShowId() { return showId; }
    public void setShowId(Long showId) { this.showId = showId; }

    public LocalDateTime getShowTime() { return showTime; }
    public void setShowTime(LocalDateTime showTime) { this.showTime = showTime; }

    public String getTheaterName() { return theaterName; }
    public void setTheaterName(String theaterName) { this.theaterName = theaterName; }

    public String getTheaterLocation() { return theaterLocation; }
    public void setTheaterLocation(String theaterLocation) { this.theaterLocation = theaterLocation; }

    public Integer getSeatsBooked() { return seatsBooked; }
    public void setSeatsBooked(Integer seatsBooked) { this.seatsBooked = seatsBooked; }

    public Integer getActiveSeatsCount() { return activeSeatsCount; }
    public void setActiveSeatsCount(Integer activeSeatsCount) { this.activeSeatsCount = activeSeatsCount; }

    public Integer getCancelledSeatsCount() { return cancelledSeatsCount; }
    public void setCancelledSeatsCount(Integer cancelledSeatsCount) { this.cancelledSeatsCount = cancelledSeatsCount; }

    public String getSeatNumbers() { return seatNumbers; }
    public void setSeatNumbers(String seatNumbers) { this.seatNumbers = seatNumbers; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }

    public LocalDateTime getBookingDate() { return bookingDate; }
    public void setBookingDate(LocalDateTime bookingDate) { this.bookingDate = bookingDate; }

    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(LocalDateTime cancelledAt) { this.cancelledAt = cancelledAt; }
}
