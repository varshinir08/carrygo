package com.cts.mrfp.carrygo.dto;

import java.time.LocalDateTime;

public class WalletsDTO {
    private Integer walletId;
    private Integer userId;
    private Float balance;
    private LocalDateTime lastUpdated;

    // Constructors
    public WalletsDTO() {}

    public WalletsDTO(Integer walletId, Integer userId, Float balance, LocalDateTime lastUpdated) {
        this.walletId = walletId;
        this.userId = userId;
        this.balance = balance;
        this.lastUpdated = lastUpdated;
    }

    // Getters and Setters
    public Integer getWalletId() { return walletId; }
    public void setWalletId(Integer walletId) { this.walletId = walletId; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public Float getBalance() { return balance; }
    public void setBalance(Float balance) { this.balance = balance; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
}
