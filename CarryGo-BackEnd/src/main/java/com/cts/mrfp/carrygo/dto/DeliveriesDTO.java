package com.cts.mrfp.carrygo.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.validation.constraints.NotBlank;

public class DeliveriesDTO {
    private Integer deliveryId;
    
    private Integer senderId;
    private Integer commuterId;
    
    @NotBlank(message = "Pickup address is required")
    private String pickupAddress;
    
    private Float pickupLat;
    private Float pickupLng;
    
    @NotBlank(message = "Pickup contact is required")
    private String pickupContact;
    
    @NotBlank(message = "Pickup phone is required")
    private String pickupPhone;
    
    @NotBlank(message = "Drop address is required")
    private String dropAddress;
    
    private Float dropLat;
    private Float dropLng;
    
    @NotBlank(message = "Receiver name is required")
    private String receiverName;
    
    @NotBlank(message = "Receiver phone is required")
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

    // Commuter (porter) details — populated when delivery is ACCEPTED or later
    private String commuterName;
    private String commuterPhone;
    private String commuterVehicle;

    // OTP (shown to sender; hidden from porter until arrived)
    private String otp;

    // Dynamic pricing metadata
    private Float surgeMultiplier;
    private String surgeLabel;
    private Float zoneSurcharge;
    private Float timeFare;
    private String vehicleType;

    // Broadcast tracking (shown on user's searching screen)
    private Integer totalPool;
    private Integer totalNotified;
    private Integer totalRejected;

    // Constructors
    public DeliveriesDTO() {}

    public DeliveriesDTO(Integer deliveryId, Integer senderId, Integer commuterId, String pickupAddress,
                        Float pickupLat, Float pickupLng, String pickupContact, String pickupPhone,
                        String dropAddress, Float dropLat, Float dropLng, String receiverName,
                        String receiverPhone, String packageType, Float weightKg, String packageSize,
                        String specialInstructions, String deliveryType, LocalDate preferredDate,
                        String preferredTime, Boolean flexibleMatching, Float distanceKm,
                        Float basePrice, Float distanceCost, Float serviceFee, Float totalAmount,
                        String status, LocalDateTime createdAt) {
        this.deliveryId = deliveryId;
        this.senderId = senderId;
        this.commuterId = commuterId;
        this.pickupAddress = pickupAddress;
        this.pickupLat = pickupLat;
        this.pickupLng = pickupLng;
        this.pickupContact = pickupContact;
        this.pickupPhone = pickupPhone;
        this.dropAddress = dropAddress;
        this.dropLat = dropLat;
        this.dropLng = dropLng;
        this.receiverName = receiverName;
        this.receiverPhone = receiverPhone;
        this.packageType = packageType;
        this.weightKg = weightKg;
        this.packageSize = packageSize;
        this.specialInstructions = specialInstructions;
        this.deliveryType = deliveryType;
        this.preferredDate = preferredDate;
        this.preferredTime = preferredTime;
        this.flexibleMatching = flexibleMatching;
        this.distanceKm = distanceKm;
        this.basePrice = basePrice;
        this.distanceCost = distanceCost;
        this.serviceFee = serviceFee;
        this.totalAmount = totalAmount;
        this.status = status;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Integer getDeliveryId() { return deliveryId; }
    public void setDeliveryId(Integer deliveryId) { this.deliveryId = deliveryId; }

    public Integer getSenderId() { return senderId; }
    public void setSenderId(Integer senderId) { this.senderId = senderId; }

    public Integer getCommuterId() { return commuterId; }
    public void setCommuterId(Integer commuterId) { this.commuterId = commuterId; }

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

    public String getCommuterName() { return commuterName; }
    public void setCommuterName(String commuterName) { this.commuterName = commuterName; }

    public String getCommuterPhone() { return commuterPhone; }
    public void setCommuterPhone(String commuterPhone) { this.commuterPhone = commuterPhone; }

    public String getCommuterVehicle() { return commuterVehicle; }
    public void setCommuterVehicle(String commuterVehicle) { this.commuterVehicle = commuterVehicle; }

    public String getOtp()             { return otp; }
    public void setOtp(String v)       { this.otp = v; }

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
