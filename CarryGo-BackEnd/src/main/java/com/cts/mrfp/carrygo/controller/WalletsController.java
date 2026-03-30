package com.cts.mrfp.carrygo.controller;

import com.cts.mrfp.carrygo.model.Wallets;
import com.cts.mrfp.carrygo.service.WalletsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallets")
@CrossOrigin(origins = "*") // Adjust to your Angular port
public class WalletsController {

    @Autowired
    private WalletsService walletService;

    @GetMapping("/user/{userId}")
    public Wallets getWalletBalance(@PathVariable Integer userId) {
        return walletService.getWalletByUserId(userId);
    }
}
