package com.cts.mrfp.carrygo.service;

import com.cts.mrfp.carrygo.model.Wallets;
import com.cts.mrfp.carrygo.repository.WalletsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class WalletsService {

    @Autowired
    private WalletsRepository walletRepository;

    public Wallets getWalletByUserId(Integer userId) {
        return walletRepository.findByUserUserId(userId)
                .orElseThrow(() -> new RuntimeException("Wallet not found for user: " + userId));
    }
}
