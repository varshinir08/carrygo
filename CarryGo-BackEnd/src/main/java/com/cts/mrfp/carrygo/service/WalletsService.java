package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Wallets;
import com.cts.mrfp.carrygo.repository.WalletsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class WalletsService {
    @Autowired private WalletsRepository walletsRepo;

    public Wallets getWalletByUserId(Integer userId) {
        return walletsRepo.findByUserUserId(userId).orElse(null);
    }

    public Wallets updateBalance(Integer userId, Float amount) {
        Wallets wallet = walletsRepo.findByUserUserId(userId).orElseThrow();
        wallet.setBalance(wallet.getBalance() + amount);
        wallet.setLastUpdated(LocalDateTime.now());
        return walletsRepo.save(wallet);
    }
}
