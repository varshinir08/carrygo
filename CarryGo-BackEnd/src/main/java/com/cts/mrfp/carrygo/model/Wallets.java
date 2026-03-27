package com.cts.mrfp.carrygo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Wallets {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="wallet_id")
    private Integer walletId;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "user_id")
    private Users user;

    private Float balance;
    private LocalDateTime lastUpdated;

    public Wallets() {}

    public Integer getWalletId() { return walletId; }
    public void setWalletId(Integer walletId) { this.walletId = walletId; }
    public Users getUser() { return user; }
    public void setUser(Users user) { this.user = user; }
    public Float getBalance() { return balance; }
    public void setBalance(Float balance) { this.balance = balance; }
    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
}