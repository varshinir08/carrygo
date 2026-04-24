package com.cts.mrfp.carrygo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
public class Deliveries {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="delivery_id")
    private Integer deliveryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private Users sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commuter_id")
    private Users commuter;

    private String pickupAddress;
    private Float pickupLat;
    private Float pickupLng;
    private String pickupContact;
    private String pickupPhone;
    private String dropAddress;
    private Float dropLat;
    private Float dropLng;
    private String receiverName;
    private String receiverPhone;
    private String packageType;
    private Float weightKg;
    private String packageSize;
    private String specialInstructions;
    private String deliveryType;
    private LocalDate preferredDate;
    private String preferredTime;
    private Boolean flexibleMatching;
    private Float distanceKm;
    private Float basePrice;
    private Float distanceCost;
    private Float serviceFee;
    private Float totalAmount;
    private String status;
    private LocalDateTime createdAt;

    // OTP & ride flow
    private String otp;
    private LocalDateTime arrivedAt;

    // Dynamic pricing metadata
    private Float surgeMultiplier;
    private String surgeLabel;
    private Float zoneSurcharge;
    private Float timeFare;
    private String vehicleType;

    // Broadcast tracking
    private Integer totalPool;
    private Integer totalNotified;
    private Integer totalRejected;

    public Deliveries() {}

    // Getters and Setters
    public Integer getDeliveryId() { return deliveryId; }
    public void setDeliveryId(Integer deliveryId) { this.deliveryId = deliveryId; }
    public Users getSender() { return sender; }
    public void setSender(Users sender) { this.sender = sender; }
    public Users getCommuter() { return commuter; }
    public void setCommuter(Users commuter) { this.commuter = commuter; }
    public String getPickupAddress() { return pickupAddress; }
    public void setPickupAddress(String pickupAddress) { this.pickupAddress = pickupAddress; }
    public Float getPickupLat() { return pickupLat; }
    public void setPickupLat(Float pickupLat) { this.pickupLat = pickupLat; }
    public Float getPickupLng() { return pickupLng; }
    public void setPickupLng(Float pickupLng) { this.pickupLng = pickupLng; }
    public String getPickupContact() { return pickupContact; }
    public void setPickupContact(String pickupContact) { this.pickupContact = pickupContact; }
    public String getPickupPhone() { return pickupPhone; }
    public void setPickupPhone(String pickupPhone) { this.pickupPhone = pickupPhone; }
    public String getDropAddress() { return dropAddress; }
    public void setDropAddress(String dropAddress) { this.dropAddress = dropAddress; }
    public Float getDropLat() { return dropLat; }
    public void setDropLat(Float dropLat) { this.dropLat = dropLat; }
    public Float getDropLng() { return dropLng; }
    public void setDropLng(Float dropLng) { this.dropLng = dropLng; }
    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }
    public String getReceiverPhone() { return receiverPhone; }
    public void setReceiverPhone(String receiverPhone) { this.receiverPhone = receiverPhone; }
    public String getPackageType() { return packageType; }
    public void setPackageType(String packageType) { this.packageType = packageType; }
    public Float getWeightKg() { return weightKg; }
    public void setWeightKg(Float weightKg) { this.weightKg = weightKg; }
    public String getPackageSize() { return packageSize; }
    public void setPackageSize(String packageSize) { this.packageSize = packageSize; }
    public String getSpecialInstructions() { return specialInstructions; }
    public void setSpecialInstructions(String specialInstructions) { this.specialInstructions = specialInstructions; }
    public String getDeliveryType() { return deliveryType; }
    public void setDeliveryType(String deliveryType) { this.deliveryType = deliveryType; }
    public LocalDate getPreferredDate() { return preferredDate; }
    public void setPreferredDate(LocalDate preferredDate) { this.preferredDate = preferredDate; }
    public String getPreferredTime() { return preferredTime; }
    public void setPreferredTime(String preferredTime) { this.preferredTime = preferredTime; }
    public Boolean getFlexibleMatching() { return flexibleMatching; }
    public void setFlexibleMatching(Boolean flexibleMatching) { this.flexibleMatching = flexibleMatching; }
    public Float getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Float distanceKm) { this.distanceKm = distanceKm; }
    public Float getBasePrice() { return basePrice; }
    public void setBasePrice(Float basePrice) { this.basePrice = basePrice; }
    public Float getDistanceCost() { return distanceCost; }
    public void setDistanceCost(Float distanceCost) { this.distanceCost = distanceCost; }
    public Float getServiceFee() { return serviceFee; }
    public void setServiceFee(Float serviceFee) { this.serviceFee = serviceFee; }
    public Float getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Float totalAmount) { this.totalAmount = totalAmount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getOtp()             { return otp; }
    public void setOtp(String v)       { this.otp = v; }

    public LocalDateTime getArrivedAt()        { return arrivedAt; }
    public void setArrivedAt(LocalDateTime v)  { this.arrivedAt = v; }

    public Float getSurgeMultiplier()          { return surgeMultiplier; }
    public void setSurgeMultiplier(Float v)    { this.surgeMultiplier = v; }

    public String getSurgeLabel()              { return surgeLabel; }
    public void setSurgeLabel(String v)        { this.surgeLabel = v; }

    public Float getZoneSurcharge()            { return zoneSurcharge; }
    public void setZoneSurcharge(Float v)      { this.zoneSurcharge = v; }

    public Float getTimeFare()                 { return timeFare; }
    public void setTimeFare(Float v)           { this.timeFare = v; }

    public String getVehicleType()             { return vehicleType; }
    public void setVehicleType(String v)       { this.vehicleType = v; }

    public Integer getTotalPool()              { return totalPool; }
    public void setTotalPool(Integer v)        { this.totalPool = v; }

    public Integer getTotalNotified()          { return totalNotified; }
    public void setTotalNotified(Integer v)    { this.totalNotified = v; }

    public Integer getTotalRejected()          { return totalRejected; }
    public void setTotalRejected(Integer v)    { this.totalRejected = v; }
}