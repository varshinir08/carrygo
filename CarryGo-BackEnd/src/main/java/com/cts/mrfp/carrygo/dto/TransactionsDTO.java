package com.cts.mrfp.carrygo.dto;

import java.time.LocalDateTime;

public class TransactionsDTO {
    private Integer transactionId;
    private Integer walletId;
    private Integer deliveryId;
    private String type;
    private Float amount;
    private String status;
    private LocalDateTime createdAt;

    // Constructors
    public TransactionsDTO() {}

    public TransactionsDTO(Integer transactionId, Integer walletId, Integer deliveryId, 
                          String type, Float amount, String status, LocalDateTime createdAt) {
        this.transactionId = transactionId;
        this.walletId = walletId;
        this.deliveryId = deliveryId;
        this.type = type;
        this.amount = amount;
        this.status = status;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Integer getTransactionId() { return transactionId; }
    public void setTransactionId(Integer transactionId) { this.transactionId = transactionId; }

    public Integer getWalletId() { return walletId; }
    public void setWalletId(Integer walletId) { this.walletId = walletId; }

    public Integer getDeliveryId() { return deliveryId; }
    public void setDeliveryId(Integer deliveryId) { this.deliveryId = deliveryId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Float getAmount() { return amount; }
    public void setAmount(Float amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
