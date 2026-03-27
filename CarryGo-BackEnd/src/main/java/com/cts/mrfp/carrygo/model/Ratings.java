package com.cts.mrfp.carrygo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Ratings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="service_id")
    private Integer ratingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_id")
    private Deliveries delivery;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private Users sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commuter_id")
    private Users commuter;

    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;

    public Ratings() {}

    public Integer getRatingId() { return ratingId; }
    public void setRatingId(Integer ratingId) { this.ratingId = ratingId; }
    public Deliveries getDelivery() { return delivery; }
    public void setDelivery(Deliveries delivery) { this.delivery = delivery; }
    public Users getSender() { return sender; }
    public void setSender(Users sender) { this.sender = sender; }
    public Users getCommuter() { return commuter; }
    public void setCommuter(Users commuter) { this.commuter = commuter; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}