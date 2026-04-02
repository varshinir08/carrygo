package com.cts.mrfp.carrygo.dto;

import java.time.LocalDateTime;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

public class RatingsDTO {
    private Integer ratingId;
    private Integer deliveryId;
    private Integer senderId;
    private Integer commuterId;
    
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating cannot be more than 5")
    private Integer rating;
    
    private String comment;
    private LocalDateTime createdAt;

    // Constructors
    public RatingsDTO() {}

    public RatingsDTO(Integer ratingId, Integer deliveryId, Integer senderId, Integer commuterId,
                     Integer rating, String comment, LocalDateTime createdAt) {
        this.ratingId = ratingId;
        this.deliveryId = deliveryId;
        this.senderId = senderId;
        this.commuterId = commuterId;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Integer getRatingId() { return ratingId; }
    public void setRatingId(Integer ratingId) { this.ratingId = ratingId; }

    public Integer getDeliveryId() { return deliveryId; }
    public void setDeliveryId(Integer deliveryId) { this.deliveryId = deliveryId; }

    public Integer getSenderId() { return senderId; }
    public void setSenderId(Integer senderId) { this.senderId = senderId; }

    public Integer getCommuterId() { return commuterId; }
    public void setCommuterId(Integer commuterId) { this.commuterId = commuterId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
